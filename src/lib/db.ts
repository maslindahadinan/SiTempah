import { SUPABASE_URL, SUPABASE_KEY } from "./supabase-client"

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

// Build PostgREST filters and return as array of {key, value} pairs
// PostgREST format: column=operator.value
// For complex AND/OR, use and=(...) or or=(...)
function buildFilters(where: WhereClause): { key: string; value: string }[] {
  const filters: { key: string; value: string }[] = []

  for (const [key, value] of Object.entries(where)) {
    if (value === null || value === undefined) {
      filters.push({ key, value: "is.null" })
      continue
    }

    if (key === "AND" && Array.isArray(value)) {
      const andParts = value.map((v: WhereClause) => `(${buildFilters(v).map(f => `${f.key}=${f.value}`).join(",")})`)
      filters.push({ key: "and", value: `(${andParts.join(",")})` })
      continue
    }

    if (key === "OR" && Array.isArray(value)) {
      const orParts = value.map((v: WhereClause) => `(${buildFilters(v).map(f => `${f.key}=${f.value}`).join(",")})`)
      filters.push({ key: "or", value: `(${orParts.join(",")})` })
      continue
    }

    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      // Handle operators like { contains, gte, lte, gt, lt, in, startsWith, endsWith }
      const operators: string[] = []
      for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
        if (op === "contains") {
          operators.push(`${key}=ilike.%${String(opVal).replace(/%/g, "\\%").replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)")}.%`)
        } else if (op === "startsWith") {
          operators.push(`${key}=ilike.${String(opVal)}%`)
        } else if (op === "endsWith") {
          operators.push(`${key}=ilike.%${String(opVal)}`)
        } else if (op === "equals") {
          if (opVal === null) {
            operators.push(`${key}=is.null`)
          } else if (typeof opVal === "boolean") {
            operators.push(`${key}=eq.${opVal}`)
          } else {
            operators.push(`${key}=eq.${opVal}`)
          }
        } else if (op === "gt") {
          operators.push(`${key}=gt.${opVal}`)
        } else if (op === "gte") {
          operators.push(`${key}=gte.${opVal}`)
        } else if (op === "lt") {
          operators.push(`${key}=lt.${opVal}`)
        } else if (op === "lte") {
          operators.push(`${key}=lte.${opVal}`)
        } else if (op === "in" && Array.isArray(opVal)) {
          if (opVal.length === 0) {
            operators.push(`${key}=eq.__nonexistent__`)
          } else {
            const vals = opVal.map((v) => String(v).replace(/,/g, "\\,")).join(",")
            operators.push(`${key}=in.(${vals})`)
          }
        } else if (op === "not") {
          if (opVal === null) {
            operators.push(`${key}=not.is.null`)
          } else {
            operators.push(`${key}=neq.${opVal}`)
          }
        } else if (op === "notIn" && Array.isArray(opVal)) {
          if (opVal.length > 0) {
            const vals = opVal.map((v) => String(v).replace(/,/g, "\\,")).join(",")
            operators.push(`not.${key}=in.(${vals})`)
          }
        }
      }

      // If only one operator, use it as a direct filter
      if (operators.length === 1) {
        const [k, v] = operators[0].split("=")
        filters.push({ key: k, value: v })
      } else if (operators.length > 1) {
        // Multiple operators on same field - use AND
        filters.push({ key: "and", value: `(${operators.join(",")})` })
      }
      continue
    }

    // Simple equality
    if (typeof value === "string") {
      // Escape special characters for PostgREST
      const escaped = value.replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
      filters.push({ key, value: `eq.${escaped}` })
    } else if (typeof value === "number") {
      filters.push({ key, value: `eq.${value}` })
    } else if (typeof value === "boolean") {
      filters.push({ key, value: `eq.${value}` })
    } else if (value instanceof Date) {
      filters.push({ key, value: `eq.${value.toISOString()}` })
    }
  }

  return filters
}

// Apply filters to URL search params
function applyFilters(url: URL, where?: WhereClause) {
  if (!where) return
  const filters = buildFilters(where)
  for (const filter of filters) {
    url.searchParams.append(filter.key, filter.value)
  }
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
  const cleaned: QueryArgs = { ...args }

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
    const { _count: _, ...restSelect } = args.select
    cleaned.select = restSelect
  }

  return { relations, cleaned }
}

// Context-aware relation mapping: table -> relation -> PostgREST embedding
// Format: "Table!FKConstraintName" to disambiguate multiple FKs to same table
const tableRelationMap: Record<string, Record<string, string>> = {
  Facility: {
    manager: "User!Facility_managerId_fkey",
    bookings: "Booking!Booking_facilityId_fkey",
  },
  Booking: {
    facility: "Facility!Booking_facilityId_fkey",
    user: "User!Booking_userId_fkey",
    reviewer: "User!Booking_reviewedBy_fkey",
    statusHistory: "BookingStatusHistory!BookingStatusHistory_bookingId_fkey",
    notifications: "Notification!Notification_bookingId_fkey",
  },
  BookingStatusHistory: {
    booking: "Booking!BookingStatusHistory_bookingId_fkey",
    changedByUser: "User!BookingStatusHistory_changedBy_fkey",
  },
  Notification: {
    user: "User!Notification_userId_fkey",
    booking: "Booking!Notification_bookingId_fkey",
  },
  AuditLog: {
    user: "User!AuditLog_userId_fkey",
  },
  User: {
    bookings: "Booking!Booking_userId_fkey",
    reviewedBookings: "Booking!Booking_reviewedBy_fkey",
    managedFacilities: "Facility!Facility_managerId_fkey",
    statusChanges: "BookingStatusHistory!BookingStatusHistory_changedBy_fkey",
    notifications: "Notification!Notification_userId_fkey",
    auditLogs: "AuditLog!AuditLog_userId_fkey",
  },
}

// Helper to build select string from include/select, context-aware by table
function buildSelect(tableName: string, include?: IncludeOptions, select?: Record<string, boolean | object>): string {
  const relMap = tableRelationMap[tableName] || {}

  if (select && Object.keys(select).length > 0) {
    const fields: string[] = []
    for (const [key, val] of Object.entries(select)) {
      if (val === true) {
        const tableEmbed = relMap[key]
        if (tableEmbed) {
          fields.push(`${key}:${tableEmbed}(*)`)
        } else {
          fields.push(key)
        }
      } else if (typeof val === "object" && val !== null) {
        const nested = val as Record<string, unknown>
        const tableEmbed = relMap[key]
        if (tableEmbed) {
          if (nested.select && typeof nested.select === "object") {
            const nestedFields = Object.entries(nested.select as Record<string, unknown>)
              .filter(([_, v]) => v === true)
              .map(([k]) => k)
            fields.push(`${key}:${tableEmbed}(${nestedFields.join(",")})`)
          } else {
            fields.push(`${key}:${tableEmbed}(*)`)
          }
        } else {
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
    return fields.length > 0 ? fields.join(",") : "*"
  }

  const fields: string[] = ["*"]
  if (include) {
    for (const [key, val] of Object.entries(include)) {
      if (key === "_count") continue
      const tableEmbed = relMap[key]
      if (!tableEmbed) {
        continue
      }
      if (val === true) {
        fields.push(`${key}:${tableEmbed}(*)`)
      } else if (typeof val === "object" && val !== null) {
        const nested = val as Record<string, unknown>
        if (nested.select && typeof nested.select === "object") {
          const nestedFields = Object.entries(nested.select as Record<string, unknown>)
            .filter(([_, v]) => v === true)
            .map(([k]) => k)
          fields.push(`${key}:${tableEmbed}(${nestedFields.join(",")})`)
        } else {
          fields.push(`${key}:${tableEmbed}(*)`)
        }
      }
    }
  }
  return fields.join(",")
}

// Map relation names to their table and FK field for _count
const relationMap: Record<string, { table: string; reverseFk?: string }> = {
  bookings: { table: "Booking", reverseFk: "facilityId" },
  managedFacilities: { table: "Facility", reverseFk: "managerId" },
  reviewedBookings: { table: "Booking", reverseFk: "reviewedBy" },
  auditLogs: { table: "AuditLog", reverseFk: "userId" },
  notifications: { table: "Notification", reverseFk: "userId" },
  statusHistory: { table: "BookingStatusHistory", reverseFk: "bookingId" },
}

// Generic table handler
class TableHandler {
  constructor(private tableName: string) {}

  private async fetchCountForRelations(records: Record<string, unknown>[], relations: string[]): Promise<void> {
    for (const record of records) {
      const countObj: Record<string, number> = {}
      for (const rel of relations) {
        const relInfo = relationMap[rel]
        if (!relInfo || !relInfo.reverseFk || !record.id) {
          countObj[rel] = 0
          continue
        }

        const url = new URL(`${SUPABASE_URL}/rest/v1/${relInfo.table}`)
        url.searchParams.set("select", "id")
        url.searchParams.set("limit", "0")
        url.searchParams.set(relInfo.reverseFk, `eq.${record.id}`)

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
      }
      record._count = countObj
    }
  }

  async findUnique(args: QueryArgs = {}) {
    const { relations, cleaned } = extractCountRelations(args)
    const select = buildSelect(this.tableName, cleaned.include, cleaned.select as Record<string, boolean | object>)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)
    applyFilters(url, cleaned.where)
    url.searchParams.set("limit", "1")

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
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
    const select = buildSelect(this.tableName, cleaned.include, cleaned.select as Record<string, boolean | object>)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)
    applyFilters(url, cleaned.where)

    if (args.orderBy) {
      url.searchParams.set("order", buildOrder(args.orderBy))
    }
    // PostgREST default limit is 1000, but we want all records. Set a high limit.
    const limit = args.take || 10000
    url.searchParams.set("limit", String(limit))
    if (args.skip) {
      url.searchParams.set("offset", String(args.skip))
    }

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
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

    const select = buildSelect(this.tableName, args.include)
    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)

    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
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
      throw new Error(`Database error (${res.status}): ${err}`)
    }
    return { count: args.data.length }
  }

  async update(args: { where: WhereClause; data: Record<string, unknown>; include?: IncludeOptions }) {
    const select = buildSelect(this.tableName, args.include)
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", select)
    applyFilters(url, args.where)

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
    }
    const data = await res.json()
    return data[0] || data
  }

  async updateMany(args: { where: WhereClause; data: Record<string, unknown> }) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    applyFilters(url, args.where)

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers,
      body: JSON.stringify(args.data),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
    }
    const data = await res.json()
    return { count: Array.isArray(data) ? data.length : 0 }
  }

  async delete(args: { where: WhereClause; include?: IncludeOptions }) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    applyFilters(url, args.where)

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
    }
    const data = await res.json()
    return data[0] || data
  }

  async deleteMany(args: { where: WhereClause }) {
    await this.delete(args)
    return { count: 1 }
  }

  async count(args: { where?: WhereClause } = {}) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    url.searchParams.set("select", "id")
    url.searchParams.set("limit", "0")
    applyFilters(url, args.where)

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
    }
    const contentRange = res.headers.get("content-range")
    const count = parseInt(contentRange?.split("/")[1] || "0")
    return count
  }

  async groupBy(args: GroupByArgs) {
    const byFields = Array.isArray(args.by) ? args.by : (args.by ? [args.by] : [])
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/${this.tableName}`)
    const selectFields = byFields.length > 0 ? byFields.join(",") : "*"
    url.searchParams.set("select", selectFields)
    applyFilters(url, args.where)

    if (args.take) {
      url.searchParams.set("limit", String(args.take))
    }
    if (args.orderBy) {
      url.searchParams.set("order", buildOrder(args.orderBy))
    }

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Database error (${res.status}): ${err}`)
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
