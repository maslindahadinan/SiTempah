"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/common/status-badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ListChecks,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  CalendarDays,
  Clock,
  Users as UsersIcon,
  Inbox,
  AlertCircle,
  Filter,
  FileText,
} from "lucide-react"
import {
  cn,
  formatDate,
  formatDateTime,
  formatTimeRange,
  getStatusLabel,
} from "@/lib/utils"

// ---------- Types ----------
interface AllBooking {
  id: string
  title: string
  startTime: string
  endTime: string
  attendeesCount: number
  status: string
  facility: {
    id: string
    name: string
    category: string
    location: string
    capacity: number
  }
  user: {
    id: string
    fullName: string
    email: string
    department: string
  }
}

interface Facility {
  id: string
  name: string
  category: string
}

// ---------- Fetchers ----------
async function fetchAllBookings(
  scope: "managed" | "all",
  filters: {
    status: string
    facilityId: string
    startDate: string
    endDate: string
    search: string
  }
): Promise<AllBooking[]> {
  const params = new URLSearchParams()
  params.set("scope", scope)
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.facilityId) params.set("facilityId", filters.facilityId)
  if (filters.startDate) params.set("startDate", filters.startDate)
  if (filters.endDate) params.set("endDate", filters.endDate + "T23:59:59")
  if (filters.search) params.set("search", filters.search)
  const res = await fetch(`/api/bookings?${params.toString()}`)
  if (!res.ok) throw new Error("Gagal memuatkan senarai tempahan")
  return res.json()
}

async function fetchFacilities(): Promise<Facility[]> {
  const res = await fetch("/api/facilities")
  if (!res.ok) throw new Error("Gagal memuatkan fasiliti")
  return res.json()
}

// ---------- Status options ----------
const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: getStatusLabel("pending") },
  { value: "approved", label: getStatusLabel("approved") },
  { value: "kiv", label: getStatusLabel("kiv") },
  { value: "rejected", label: getStatusLabel("rejected") },
  { value: "cancelled", label: getStatusLabel("cancelled") },
  { value: "draft", label: getStatusLabel("draft") },
]

// ---------- CSV Export ----------
function exportToCsv(bookings: AllBooking[]) {
  const headers = [
    "Tajuk",
    "Fasiliti",
    "Pemohon",
    "Jabatan",
    "Masa Mula",
    "Masa Tamat",
    "Peserta",
    "Status",
  ]
  const rows = bookings.map((b) => [
    b.title,
    b.facility.name,
    b.user.fullName,
    b.user.department,
    formatDateTime(b.startTime),
    formatDateTime(b.endTime),
    String(b.attendeesCount),
    getStatusLabel(b.status),
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

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `tempahan-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------- Status Pill ----------
function StatusPill({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

// ---------- Mobile Card ----------
function MobileBookingCard({ booking, onClick }: { booking: AllBooking; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left glass-card glass-card-hover p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white line-clamp-1 flex-1">{booking.title}</h3>
        <StatusPill status={booking.status} />
      </div>
      <div className="space-y-1 text-xs text-white/60">
        <p className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3 flex-shrink-0 text-white/40" />
          <span className="truncate">{booking.facility.name}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <User className="w-3 h-3 flex-shrink-0 text-white/40" />
          <span className="truncate">{booking.user.fullName}</span>
          <span className="text-white/30">·</span>
          <span className="truncate">{booking.user.department}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 flex-shrink-0 text-white/40" />
          <span>{formatDate(booking.startTime, { day: "2-digit", month: "short", year: "numeric" })}</span>
          <span className="text-white/30">·</span>
          <Clock className="w-3 h-3 flex-shrink-0 text-white/40" />
          <span>{formatTimeRange(booking.startTime, booking.endTime)}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <UsersIcon className="w-3 h-3 flex-shrink-0 text-white/40" />
          <span>{booking.attendeesCount} peserta</span>
        </p>
      </div>
    </motion.button>
  )
}

// ---------- Main View ----------
export function AllBookingsView() {
  const { data: session } = useSession()
  const { viewBooking } = useAppStore()
  const { toast } = useToast()

  const role = session?.user?.role
  const scope: "managed" | "all" = role === "admin" ? "all" : "managed"

  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [facilityFilter, setFacilityFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 10

  const filters = {
    status: statusFilter,
    facilityId: facilityFilter !== "all" ? facilityFilter : "",
    startDate,
    endDate,
    search,
  }

  const bookingsQuery = useQuery({
    queryKey: ["all-bookings", scope, filters],
    queryFn: () => fetchAllBookings(scope, filters),
    refetchInterval: 60000,
  })

  const facilitiesQuery = useQuery({
    queryKey: ["facilities-list"],
    queryFn: fetchFacilities,
    staleTime: 5 * 60 * 1000,
  })

  const filtered = bookingsQuery.data || []

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  const handleResetPage = () => setPage(1)

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({
        title: "Tiada Data",
        description: "Tiada tempahan untuk dieksport.",
        variant: "destructive",
      })
      return
    }
    exportToCsv(filtered)
    toast({
      title: "Eksport Berjaya",
      description: `${filtered.length} tempahan dieksport ke CSV.`,
    })
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    handleResetPage()
  }

  const handleClearFilters = () => {
    setStatusFilter("all")
    setFacilityFilter("all")
    setStartDate("")
    setEndDate("")
    setSearch("")
    handleResetPage()
  }

  const hasActiveFilters =
    statusFilter !== "all" ||
    facilityFilter !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    search !== ""

  const isLoading = bookingsQuery.isLoading
  const isError = bookingsQuery.isError
  const error = bookingsQuery.error as Error | null

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
            <ListChecks className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Semua Tempahan</h2>
            <p className="text-sm text-white/60">
              {role === "admin" ? "Senarai lengkap semua tempahan" : "Senarai tempahan fasiliti yang anda urus"}
              {filtered.length > 0 && (
                <>
                  <span className="text-white/30 mx-1">·</span>
                  <span className="text-[#14B8A6] font-medium">{filtered.length} rekod</span>
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari tajuk, pemohon..."
              className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
            />
          </div>

          {/* Status */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleResetPage() }}>
            <SelectTrigger className="bg-white/5 border-white/15 text-white h-10 focus:ring-[#14B8A6]/30">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-white/10 focus:text-white">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Facility */}
          <Select value={facilityFilter} onValueChange={(v) => { setFacilityFilter(v); handleResetPage() }}>
            <SelectTrigger className="bg-white/5 border-white/15 text-white h-10 focus:ring-[#14B8A6]/30">
              <SelectValue placeholder="Fasiliti" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white max-h-72">
              <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">
                Semua Fasiliti
              </SelectItem>
              {(facilitiesQuery.data || []).map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-white focus:bg-white/10 focus:text-white">
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Start date */}
          <div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); handleResetPage() }}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10 [color-scheme:dark]"
            />
          </div>

          {/* End date */}
          <div>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); handleResetPage() }}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10 [color-scheme:dark]"
            />
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="glass-card p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan tempahan</p>
          <p className="text-sm text-white/50 mt-1">{error?.message}</p>
          <Button
            variant="outline"
            onClick={() => bookingsQuery.refetch()}
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
          <h3 className="text-lg font-semibold text-white/90">Tiada Tempahan Dijumpai</h3>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            {hasActiveFilters
              ? "Tiada tempahan sepadan dengan penapis semasa. Cuba ubah penapis atau kosongkan carian."
              : "Belum ada sebarang tempahan dalam sistem."}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Desktop Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-2 md:p-4 hidden lg:block"
          >
            <div className="overflow-x-auto custom-scrollbar rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Tajuk</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Fasiliti</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Pemohon</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Mula</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Tamat</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider text-center">Peserta</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((booking, i) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      onClick={() => viewBooking(booking.id)}
                      className="cursor-pointer border-white/5 hover:bg-white/[0.04] transition-colors group"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-white/30 group-hover:text-[#14B8A6] flex-shrink-0" />
                          <span className="text-sm text-white font-medium line-clamp-1 max-w-[200px]">
                            {booking.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="text-sm text-white/80 line-clamp-1 max-w-[180px]">{booking.facility.name}</div>
                        <div className="text-xs text-white/40 line-clamp-1">{booking.facility.category}</div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="text-sm text-white/80 line-clamp-1 max-w-[160px]">{booking.user.fullName}</div>
                        <div className="text-xs text-white/40 line-clamp-1">{booking.user.department}</div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-sm text-white/70 whitespace-nowrap">
                        {formatDate(booking.startTime, { day: "2-digit", month: "short", year: "numeric" })}
                        <div className="text-xs text-white/40">{formatTimeRange(booking.startTime, booking.startTime)}</div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-sm text-white/70 whitespace-nowrap">
                        {formatDate(booking.endTime, { day: "2-digit", month: "short", year: "numeric" })}
                        <div className="text-xs text-white/40">{formatTimeRange(booking.endTime, booking.endTime)}</div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-white/70">
                          <UsersIcon className="w-3 h-3 text-white/40" />
                          {booking.attendeesCount}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <StatusPill status={booking.status} />
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            viewBooking(booking.id)
                          }}
                          className="inline-flex items-center gap-1 text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 transition-colors px-2 py-1"
                        >
                          Lihat
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {paginated.map((booking, i) => (
              <MobileBookingCard
                key={booking.id}
                booking={booking}
                onClick={() => viewBooking(booking.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card p-4">
            <p className="text-xs text-white/60">
              Memaparkan{" "}
              <span className="text-white font-medium">
                {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              daripada <span className="text-white font-medium">{filtered.length}</span> tempahan
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed h-9"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelum
              </Button>
              <div className="flex items-center gap-1 px-3 h-9 glass-light rounded-md text-xs text-white/80">
                Halaman <span className="text-white font-semibold mx-1">{safePage}</span> / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed h-9"
              >
                Seterus
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
