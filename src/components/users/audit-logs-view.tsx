"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ScrollText,
  Search,
  Download,
  Filter,
  AlertCircle,
  Inbox,
  User as UserIcon,
  Building2,
  FileText,
  Activity,
  UserPlus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Pause,
  Settings,
  LogIn,
  Clock,
} from "lucide-react"
import {
  cn,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/utils"

// ---------- Types ----------
interface AuditLog {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string
  ipAddress: string | null
  createdAt: string
  user: {
    id: string
    fullName: string
    email: string
    role: string
  } | null
}

// ---------- Fetcher ----------
async function fetchAuditLogs(limit: number): Promise<AuditLog[]> {
  const res = await fetch(`/api/audit?limit=${limit}`)
  if (!res.ok) throw new Error("Gagal memuatkan log audit")
  return res.json()
}

// ---------- Entity config ----------
const entityConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  user: { label: "Pengguna", icon: UserIcon },
  facility: { label: "Fasiliti", icon: Building2 },
  booking: { label: "Tempahan", icon: FileText },
  system: { label: "Sistem", icon: Settings },
}

function getEntityConfig(entity: string) {
  return entityConfig[entity] || { label: entity, icon: Activity }
}

// ---------- Action config (color coding) ----------
type ActionCategory = "create" | "update" | "delete" | "approve" | "kiv" | "reject" | "auth" | "other"

function categorizeAction(action: string): ActionCategory {
  const a = action.toUpperCase()
  if (a.includes("CREATE") || a.includes("REGISTER")) return "create"
  if (a.includes("DELETE") || a.includes("DEACTIVATE") || a.includes("CANCEL")) return "delete"
  if (a.includes("APPROVE") || a.includes("ACTIVATE")) return "approve"
  if (a.includes("KIV")) return "kiv"
  if (a.includes("REJECT")) return "reject"
  if (a.includes("UPDATE") || a.includes("EDIT")) return "update"
  if (a.includes("LOGIN") || a.includes("LOGOUT") || a.includes("AUTH")) return "auth"
  return "other"
}

const categoryConfig: Record<
  ActionCategory,
  {
    color: string
    border: string
    iconBg: string
    iconColor: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  create: {
    color: "text-emerald-400",
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    label: "Cipta",
    icon: UserPlus,
  },
  update: {
    color: "text-blue-400",
    border: "border-l-blue-500",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    label: "Kemas Kini",
    icon: Pencil,
  },
  delete: {
    color: "text-red-400",
    border: "border-l-red-500",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    label: "Padam/Nyahaktif",
    icon: Trash2,
  },
  approve: {
    color: "text-emerald-400",
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    label: "Lulus",
    icon: CheckCircle2,
  },
  kiv: {
    color: "text-amber-400",
    border: "border-l-amber-500",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    label: "KIV",
    icon: Pause,
  },
  reject: {
    color: "text-red-400",
    border: "border-l-red-500",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    label: "Tolak",
    icon: XCircle,
  },
  auth: {
    color: "text-purple-400",
    border: "border-l-purple-500",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    label: "Pengesahan",
    icon: LogIn,
  },
  other: {
    color: "text-white/60",
    border: "border-l-white/30",
    iconBg: "bg-white/10",
    iconColor: "text-white/60",
    label: "Lain-lain",
    icon: Activity,
  },
}

function getCategoryConfig(action: string) {
  return categoryConfig[categorizeAction(action)]
}

// ---------- Format action label ----------
function formatActionLabel(action: string): string {
  // Split on underscores and translate common terms
  const parts = action.split("_")
  const translations: Record<string, string> = {
    BOOKING: "Tempahan",
    FACILITY: "Fasiliti",
    USER: "Pengguna",
    SYSTEM: "Sistem",
    CREATE: "Dicipta",
    UPDATE: "Dikemas Kini",
    DELETE: "Dipadam",
    DEACTIVATE: "Dinyahaktif",
    ACTIVATE: "Diaktif",
    APPROVED: "Diluluskan",
    APPROVE: "Diluluskan",
    REJECTED: "Ditolak",
    REJECT: "Ditolak",
    KIV: "KIV",
    REGISTER: "Berdaftar",
    LOGIN: "Log Masuk",
    LOGOUT: "Log Keluar",
    CANCEL: "Dibatalkan",
  }
  return parts.map((p) => translations[p.toUpperCase()] || p).join(" ")
}

// ---------- CSV Export ----------
function exportAuditToCsv(logs: AuditLog[]) {
  const headers = ["Tarikh/Masa", "Pengguna", "Peranan", "Tindakan", "Entiti", "Butiran", "Alamat IP"]
  const rows = logs.map((l) => [
    formatDateTime(l.createdAt),
    l.user?.fullName || "Sistem",
    l.user?.role || "—",
    l.action,
    l.entity,
    l.details,
    l.ipAddress || "—",
  ])

  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n")

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------- Entity filter options ----------
const ENTITY_OPTIONS = [
  { value: "all", label: "Semua Entiti" },
  { value: "user", label: "Pengguna" },
  { value: "facility", label: "Fasiliti" },
  { value: "booking", label: "Tempahan" },
  { value: "system", label: "Sistem" },
]

// ---------- Audit entry card ----------
function AuditEntry({ log, index }: { log: AuditLog; index: number }) {
  const cat = getCategoryConfig(log.action)
  const ent = getEntityConfig(log.entity)
  const CatIcon = cat.icon
  const EntIcon = ent.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
      className={cn(
        "glass-card glass-card-hover p-4 border-l-4 relative group",
        cat.border
      )}
    >
      {/* Top row: icons + timestamp */}
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", cat.iconBg)}>
          <CatIcon className={cn("w-5 h-5", cat.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-sm font-semibold", cat.color)}>
              {formatActionLabel(log.action)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md glass-light text-[10px] text-white/60 uppercase tracking-wider">
              <EntIcon className="w-3 h-3" />
              {ent.label}
            </span>
          </div>

          {/* Details */}
          <p className="text-sm text-white/80 mt-1.5 leading-snug">{log.details}</p>

          {/* Footer */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-white/40">
            {log.user ? (
              <span className="inline-flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white",
                    log.user.role === "admin" && "bg-gradient-to-br from-red-500 to-red-700",
                    log.user.role === "manager" && "bg-gradient-to-br from-amber-500 to-amber-700",
                    log.user.role === "user" && "bg-gradient-to-br from-blue-500 to-blue-700"
                  )}
                >
                  {log.user.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <span className="text-white/70">{log.user.fullName}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-white/40">
                <UserIcon className="w-3 h-3" />
                Sistem
              </span>
            )}

            {log.ipAddress && (
              <span className="hidden sm:inline-flex items-center gap-1">
                <span className="text-white/30">IP:</span>
                <span className="text-white/50 font-mono">{log.ipAddress}</span>
              </span>
            )}

            <span
              className="inline-flex items-center gap-1 ml-auto"
              title={formatDateTime(log.createdAt)}
            >
              <Clock className="w-3 h-3" />
              {formatRelativeTime(log.createdAt)}
            </span>
          </div>

          {/* Hover tooltip with full timestamp */}
          <div className="absolute -top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-[10px] text-white/50 bg-black/60 px-2 py-1 rounded-md whitespace-nowrap">
              {formatDateTime(log.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Need to import Clock from lucide-react since it's used in AuditEntry
// (moved up to main import block)

// ---------- Skeleton ----------
function AuditSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card p-4 animate-pulse flex items-start gap-3 border-l-4 border-l-white/10">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-white/10 rounded" />
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-2 w-1/4 bg-white/5 rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Main View ----------
export function AuditLogsView() {
  const { toast } = useToast()

  const [entityFilter, setEntityFilter] = useState("all")
  const [actionSearch, setActionSearch] = useState("")

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", 100],
    queryFn: () => fetchAuditLogs(100),
    refetchInterval: 60000,
  })

  // Filter client-side (entity & action already supported server-side, but we add safety)
  const filtered = useMemo(() => {
    let list = data || []
    if (entityFilter !== "all") {
      list = list.filter((l) => l.entity === entityFilter)
    }
    if (actionSearch.trim()) {
      const q = actionSearch.trim().toLowerCase()
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          (l.user?.fullName || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [data, entityFilter, actionSearch])

  // Stats by category
  const stats = useMemo(() => {
    const byCat: Record<ActionCategory, number> = {
      create: 0,
      update: 0,
      delete: 0,
      approve: 0,
      kiv: 0,
      reject: 0,
      auth: 0,
      other: 0,
    }
    ;(data || []).forEach((l) => {
      byCat[categorizeAction(l.action)]++
    })
    return byCat
  }, [data])

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({
        title: "Tiada Data",
        description: "Tiada log audit untuk dieksport.",
        variant: "destructive",
      })
      return
    }
    exportAuditToCsv(filtered)
    toast({
      title: "Eksport Berjaya",
      description: `${filtered.length} log audit dieksport ke CSV.`,
    })
  }

  const hasActiveFilters = entityFilter !== "all" || actionSearch.trim() !== ""

  const handleClearFilters = () => {
    setEntityFilter("all")
    setActionSearch("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Log Audit</h2>
            <p className="text-sm text-white/60">
              Jejak semua aktiviti sistem dan pengguna
              {data && data.length > 0 && (
                <>
                  <span className="text-white/30 mx-1">·</span>
                  <span className="text-[#14B8A6] font-medium">{data.length} rekod</span>
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className={cn(
            "border text-white",
            filtered.length === 0
              ? "glass-light text-white/40 cursor-not-allowed border-white/10"
              : "bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] hover:opacity-90 border-[#14B8A6]/40 glow-accent"
          )}
        >
          <Download className="w-4 h-4 mr-1.5" />
          Eksport CSV
        </Button>
      </motion.div>

      {/* Stats by category */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {(Object.keys(categoryConfig) as ActionCategory[]).map((cat, i) => {
          const c = categoryConfig[cat]
          const Icon = c.icon
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-light rounded-lg p-3 flex flex-col items-center text-center gap-1"
            >
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", c.iconBg)}>
                <Icon className={cn("w-3.5 h-3.5", c.iconColor)} />
              </div>
              <p className="text-lg font-bold text-white leading-tight">{stats[cat]}</p>
              <p className="text-[9px] uppercase tracking-wider text-white/40 leading-tight">{c.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 md:p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-white/60" />
          <h3 className="text-sm font-semibold text-white/80">Penapis</h3>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="ml-auto text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 transition-colors"
            >
              Kosongkan
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Entity filter */}
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="bg-white/5 border-white/15 text-white h-10 focus:ring-[#14B8A6]/30">
              <SelectValue placeholder="Entiti" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-white/10 focus:text-white">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="Cari tindakan, butiran, pengguna..."
              className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
            />
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <AuditSkeleton />
      ) : isError ? (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan log audit</p>
          <p className="text-sm text-white/50 mt-1">{(error as Error)?.message}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-4 border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cuba Semula
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 md:p-16 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#14B8A6]/15 to-[#0F4C81]/15 border border-white/10 flex items-center justify-center mb-5">
            <Inbox className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">Tiada Log Dijumpai</h3>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            {hasActiveFilters
              ? "Tiada log audit sepadan dengan penapis semasa. Cuba ubah penapis atau kosongkan carian."
              : "Belum ada sebarang aktiviti direkodkan dalam sistem."}
          </p>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent hidden sm:block" />
          <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto custom-scrollbar pr-1">
            {filtered.map((log, i) => (
              <AuditEntry key={log.id} log={log} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
