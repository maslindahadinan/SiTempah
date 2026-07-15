import { supabase, SUPABASE_URL, SUPABASE_KEY } from "./supabase-client"

// ============================================================================
// Prisma-Compatible Supabase Wrapper
// Translates Prisma client calls to Supabase REST API (PostgREST) calls
// ============================================================================

type WhereClause = Record<string, unknown>
type IncludeOptions = Record<string, boolean | object>
type OrderBy = Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[]

interface QueryArgs {
  where?: WhereClause
  include?: IncludeOptions
  select?: Record<string, boolean | object>
  orderBy?: OrderBy
  take?: number
  skip?: number
  _count?: boolean | Record<string, boolean>
}

interface GroupByArgs {
  by?: string | string[]
  where?: WhereClause
  _count?: boolean | Record<string, boolean>
  orderBy?: OrderBy
  take?: number
}

// Helper to convert Prisma where clause to PostgREST filter
function buildFilter(where: WhereClause): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(where)) {
    if (value === null || value === undefined) {
      parts.push(`${key}=is.null`)
      continue
    }

    if (key === "AND" && Array.isArray(value)) {
      const andParts = value.map((v: WhereClause) => `(${buildFilter(v)})`)
      parts.push(`and(${andParts.join(",")})`)
      continue
    }

    if (key === "OR" && Array.isArray(value)) {
      const orParts = value.map((v: WhereClause) => `(${buildFilter(v)})`)
      parts.push(`or(${orParts.join(",")})`)
      continue
    }

    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
        if (op === "contains") {
          parts.push(`${key}=ilike.%${String(opVal).replace(/%/g, "\\%")}.%`)
        } else if (op === "startsWith") {
          parts.push(`${key}=ilike.${String(opVal)}%`)
        } else if (op === "endsWith") {
          parts.push(`${key}=ilike.%${String(opVal)}`)
        } else if (op === "equals") {
          if (opVal === null) {
            parts.push(`${key}=is.null`)
          } else if (typeof opVal === "boolean") {
            parts.push(`${key}=eq.${opVal}`)
          } else {
            parts.push(`${key}=eq.${opVal}`)
          }
        } else if (op === "gt") {
          parts.push(`${key}=gt.${opVal}`)
        } else if (op === "gte") {
          parts.push(`${key}=gte.${opVal}`)
        } else if (op === "lt") {
          parts.push(`${key}=lt.${opVal}`)
        } else if (op === "lte") {
          parts.push(`${key}=lte.${opVal}`)
        } else if (op === "in" && Array.isArray(opVal)) {
          if (opVal.length === 0) {
            parts.push(`${key}=eq.__nonexistent__`)
          } else {
            parts.push(`${key}=in.(${opVal.join(",")})`)
          }
        } else if (op === "not") {
          if (opVal === null) {
            parts.push(`${key}=not.is.null`)
          } else {
            parts.push(`${key}=neq.${opVal}`)
          }
        } else if (op === "notIn" && Array.isArray(opVal)) {
          if (opVal.length > 0) {
            parts.push(`not.${key}=in.(${opVal.join(",")})`)
          }
        }
      }
      continue
    }

    // Simple equality
    if (typeof value === "string") {
      parts.push(`${key}=eq.${value}`)
    } else if (typeof value === "number") {
      parts.push(`${key}=eq.${value}`)
    } else if (typeof value === "boolean") {
      parts.push(`${key}=eq.${value}`)
    } else if (value instanceof Date) {
      parts.push(`${key}=eq.${value.toISOString()}`)
    }
  }

  return parts.join(",")
}

// Helper to convert orderBy to PostgREST order
function buildOrder(orderBy: OrderBy): string {
  if (Array.isArray(orderBy)) {
    return orderBy.map((o) => {
      const [key, dir] = Object.entries(o)[0]
      return `${key}.${dir}`
    }).join(",")
  }
  const [key, dir] = Object.entries(orderBy)[0]
  return `${key}.${dir}`
}

// Extract _count from include/select and return the relation names to count
function extractCountRelations(args: QueryArgs): { relations: string[]; cleaned: QueryArgs } {
  const relations: string[] = []
  const cleaned = { ...args }

  if (args.include?._count) {
    const countVal = args.include._count
    if (typeof countVal === "object" && countVal !== null) {
      const selectObj = (countVal as Record<string, unknown>).select
      if (selectObj && typeof selectObj === "object") {
        for (const [rel, val] of Object.entries(selectObj as Record<string, unknown>)) {
          if (val === true) relations.push(rel)
        }
      }
    }
    // Remove _count from include
    const { _count: _, ...restInclude } = args.include
    cleaned.include = restInclude
  }

  if (args.select?._count) {
    const countVal = args.select._count
    if (typeof countVal === "object" && countVal !== null) {
      const selectObj = (countVal as Record<string, unknown>).select
      if (selectObj && typeof selectObj === "object") {
        for (const [rel, val] of Object.entries(selectObj as Record<string, unknown>)) {
          if (val === true) relations.push(rel)
        }
      }
    }
    // Remove _count from select
    const { _count: _, ...restSelect } = args.select
    cleaned.select = restSelect
  }

  return { relations, cleaned }
}

// Helper to build select string from include/select
function buildSelect(include?: IncludeOptions, select?: Record<string, boolean | object>): string {
  if (select && Object.keys(select).length > 0) {
    const fields: string[] = []
    for (const [key, val] of Object.entries(select)) {
      if (val === true) {
        fields.push(key)
      } else if (typeof val === "object" && val !== null) {
        const nested = val as Record<string, unknown>
        if (nested.select && typeof nested.select === "object") {
          const nestedFields = Object.entries(nested.select as Record<string, unknown>)
            .filter(([_, v]) => v === true)
            .map(([k]) => k)
          fields.push(`${key}(${nestedFields.join(",")})`)
        } else {
          fields.push(`${key}(*)`)
        }
      }
    }
    return fields.length > 0 ? fields.join(",") : "*"
  }

  const fields: string[] = ["*"]
  if (include) {
    for (const [key, val] of Object.entries(include)) {
      if (key === "_count") continue
      if (val === true) {
        fields.push(`${key}(*)`)
      } else if (typeof val === "object" && val !== null) {
        const nested = val as Record<string, unknown>
        if (nested.select && typeof nested.select === "object") {
          const nestedFields = Object.entries(nested.select as Record<string, unknown>)
            .filter(([_, v]) => v === true)
            .map(([k]) => k)
          fields.push(`${key}(${nestedFields.join(",")})`)
        } else {
          fields.push(`${key}(*)`)
        }
      }
    }
  }
  return fields.join(",")
}

// Map relation names to their table and FK field
const relationMap: Record<string, { table: string; fkField: string; reverseFk?: string }> = {
  // Booking relations
  facility: { table: "Facility", fkField: "facilityId" },
  user: { table: "User", fkField: "userId" },
  reviewer: { table: "User", fkField: "reviewedBy" },
  // Facility relations
  manager: { table: "User", fkField: "managerId" },
  bookings: { table: "Booking", fkField: "facilityId", reverseFk: "facilityId" },
  // User relations - reverse relations
  managedFacilities: { table: "Facility", fkField: "managerId", reverseFk: "managerId" },
  reviewedBookings: { table: "Booking", fkField: "reviewedBy", reverseFk: "reviewedBy" },
  // BookingStatusHistory relations
  changedByUser: { table: "User", fkField: "changedBy" },
  // Notification relations
  booking: { table: "Booking", fkField: "bookingId" },
  // AuditLog relations
  auditLogs: { table: "AuditLog", fkField: "userId", reverseFk: "userId" },
  notifications: { table: "Notification", fkField: "userId", reverseFk: "userId" },
  statusHistory: { table: "BookingStatusHistory", fkField: "bookingId", reverseFk: "bookingId" },
}

// Generic table handler
class TableHandler {
  constructor(private tableName: string) {}

  private async fetchCountForRelations(records: Record<string, unknown>[], relations: string[]): Promise<void> {
    for (const record of records) {
      const countObj: Record<string, number> = {}
      for (const rel of relations) {
        const relInfo = relationMap[rel]
        if (!relInfo) {
          countObj[rel] = 0
          continue
        }

        // For reverse relations (one-to-many), count records where FK = this record's id
        if (relInfo.reverseFk) {
          const filter = `${relInfo.reverseFk}=eq.${record.id}`
          const url = new URL(`${SUPABASE_URL}/rest/v1/${relInfo.table}`)
          url.searchParams.set("select", "id")
          url.searchParams.set("limit", "0")
          url.searchParams.set("and", `(${filter})`)
          const res = await fetch(url.toString(), {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              Prefer: "count=exact",
            },
          })
          if (res.ok) {
            const contentRange = res.headers.get("content-range")
            const count = parseInt(contentRange?.split("/")[1] || "0")
            countObj[rel] = count
          } else {
            countObj[rel] = 0
          }
        } else {
          countObj[rel] = 0
        }
      }
      record._count = countObj
    }
  }

  async findUnique(args: QueryArgs = {}) {
    const { relations, cleaned } = extractCountRelations(args)
    const filter = cleaned.where ? buildFilter(cleaned.where) : ""
    const select = buildSelect(cleaned.include, cleaned.select as Record<string, boolean | object>)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)
    if (filter) url.searchParams.set("and", `(${filter})`)
    url.searchParams.set("limit", "1")

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const data = await res.json()
    const record = data[0] || null

    if (record && relations.length > 0) {
      await this.fetchCountForRelations([record], relations)
    }

    return record
  }

  async findFirst(args: QueryArgs = {}) {
    return this.findUnique(args)
  }

  async findMany(args: QueryArgs = {}) {
    const { relations, cleaned } = extractCountRelations(args)
    const filter = cleaned.where ? buildFilter(cleaned.where) : ""
    const select = buildSelect(cleaned.include, cleaned.select as Record<string, boolean | object>)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)
    if (filter) url.searchParams.set("and", `(${filter})`)

    if (args.orderBy) {
      url.searchParams.set("order", buildOrder(args.orderBy))
    }
    if (args.take) {
      url.searchParams.set("limit", String(args.take))
    }
    if (args.skip) {
      url.searchParams.set("offset", String(args.skip))
    }

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const records = await res.json()

    if (records && relations.length > 0) {
      await this.fetchCountForRelations(records, relations)
    }

    return records || []
  }

  async create(args: { data: Record<string, unknown>; include?: IncludeOptions }) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const select = buildSelect(args.include)
    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)

    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const data = await res.json()
    return data[0] || data
  }

  async createMany(args: { data: Record<string, unknown>[] }) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    return { count: args.data.length }
  }

  async update(args: { where: WhereClause; data: Record<string, unknown>; include?: IncludeOptions }) {
    const filter = buildFilter(args.where)
    const select = buildSelect(args.include)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)
    url.searchParams.set("and", `(${filter})`)

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const data = await res.json()
    return data[0] || data
  }

  async updateMany(args: { where: WhereClause; data: Record<string, unknown> }) {
    const filter = buildFilter(args.where)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("and", `(${filter})`)

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const data = await res.json()
    return { count: Array.isArray(data) ? data.length : 0 }
  }

  async delete(args: { where: WhereClause; include?: IncludeOptions }) {
    const filter = buildFilter(args.where)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("and", `(${filter})`)

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const data = await res.json()
    return data[0] || data
  }

  async deleteMany(args: { where: WhereClause }) {
    await this.delete(args)
    return { count: 1 }
  }

  async count(args: { where?: WhereClause } = {}) {
    const filter = args.where ? buildFilter(args.where) : ""
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", "id")
    url.searchParams.set("limit", "0")
    if (filter) url.searchParams.set("and", `(${filter})`)

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const contentRange = res.headers.get("content-range")
    const count = parseInt(contentRange?.split("/")[1] || "0")
    return count
  }

  async groupBy(args: GroupByArgs) {
    const byFields = Array.isArray(args.by) ? args.by : (args.by ? [args.by] : [])
    const filter = args.where ? buildFilter(args.where) : ""
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    const selectFields = byFields.length > 0 ? byFields.join(",") : "*"
    url.searchParams.set("select", selectFields)
    if (filter) url.searchParams.set("and", `(${filter})`)

    if (args.take) {
      url.searchParams.set("limit", String(args.take))
    }
    if (args.orderBy) {
      url.searchParams.set("order", buildOrder(args.orderBy))
    }

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error: ${err}`)
    }
    const records = await res.json()

    // Group by the specified fields and count
    const groups: Record<string, Record<string, unknown>> = {}
    for (const record of records) {
      const key = byFields.map((f) => String(record[f])).join("|||")
      if (!groups[key]) {
        const group: Record<string, unknown> = {}
        for (const f of byFields) {
          group[f] = record[f]
        }
        group._count = 0
        groups[key] = group
      }
      ;(groups[key]._count as number)++
    }

    return Object.values(groups)
  }

  async aggregate(args: { where?: WhereClause; _count?: boolean | Record<string, boolean> }) {
    const count = await this.count({ where: args.where })
    return { _count: count }
  }
}

// Create the db object that mimics Prisma client
export const db = {
  user: new TableHandler("User"),
  facility: new TableHandler("Facility"),
  booking: new TableHandler("Booking"),
  bookingStatusHistory: new TableHandler("BookingStatusHistory"),
  notification: new TableHandler("Notification"),
  auditLog: new TableHandler("AuditLog"),

  $disconnect: async () => {
    // No-op for REST API
  },

  $transaction: async <T>(fn: (tx: typeof db) => Promise<T>): Promise<T> => {
    return fn(db)
  },
}

export type DB = typeof db
