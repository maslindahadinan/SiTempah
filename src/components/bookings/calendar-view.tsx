"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  MapPin,
  AlertCircle,
  Building2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/common/status-badge"
import { cn, formatDate, formatTimeRange } from "@/lib/utils"

// ---------- Types ----------
interface Facility {
  id: string
  name: string
  category: string
  location: string
  capacity: number
  isActive: boolean
}

interface CalendarBooking {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  facility: { id: string; name: string }
  user?: { fullName: string } | null
}

// ---------- Helpers ----------
const DAY_LABELS = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"]
const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
]

const STATUS_DOT_COLORS: Record<string, string> = {
  approved: "bg-emerald-400",
  kiv: "bg-amber-400",
  rejected: "bg-red-400",
  pending: "bg-gray-400",
  draft: "bg-blue-400",
  cancelled: "bg-gray-500",
  expired: "bg-gray-500",
}

const STATUS_LEGEND: { status: string; label: string; color: string }[] = [
  { status: "approved", label: "Diluluskan", color: "bg-emerald-400" },
  { status: "kiv", label: "KIV", color: "bg-amber-400" },
  { status: "rejected", label: "Ditolak", color: "bg-red-400" },
  { status: "pending", label: "Menunggu", color: "bg-gray-400" },
]

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(year: number, month: number, day: number): boolean {
  return isSameDay(new Date(year, month, day), new Date())
}

function isPast(year: number, month: number, day: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cell = new Date(year, month, day)
  cell.setHours(0, 0, 0, 0)
  return cell.getTime() < today.getTime()
}

// Build calendar weeks (6 weeks of 7 days = 42 cells)
function buildCalendar(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  // Leading blanks
  for (let i = 0; i < startOffset; i++) cells.push(null)
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  // Trailing blanks to fill 42 cells (6 weeks)
  while (cells.length < 42) cells.push(null)

  // Chunk into 6 weeks
  const weeks: (Date | null)[][] = []
  for (let w = 0; w < 6; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7))
  }
  return weeks
}

// ---------- Component ----------
export function CalendarView() {
  const { data: session } = useSession()
  const { startBooking, setView } = useAppStore()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all")

  // Determine scope based on role
  const scope =
    session?.user?.role === "manager" || session?.user?.role === "admin"
      ? "all"
      : "me"

  const { data: facilities, isLoading: facilitiesLoading } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: async () => {
      const res = await fetch("/api/facilities")
      if (!res.ok) throw new Error("Gagal memuatkan fasiliti")
      return res.json()
    },
  })

  const { data: bookings, isLoading: bookingsLoading } = useQuery<CalendarBooking[]>({
    queryKey: ["calendar-bookings", scope, year, month],
    queryFn: async () => {
      const startDate = toDateString(year, month, 1)
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = toDateString(year, month, lastDay)
      const res = await fetch(
        `/api/bookings?scope=${scope}&startDate=${startDate}T00:00:00&endDate=${endDate}T23:59:59`
      )
      if (!res.ok) throw new Error("Gagal memuatkan tempahan")
      return res.json()
    },
  })

  const weeks = useMemo(() => buildCalendar(year, month), [year, month])

  // Filter bookings by facility if a specific one is selected
  const filteredBookings = useMemo(() => {
    if (!bookings) return []
    if (selectedFacilityId === "all") return bookings
    return bookings.filter((b) => b.facility?.id === selectedFacilityId)
  }, [bookings, selectedFacilityId])

  // Map: dateString -> bookings that day
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>()
    for (const b of filteredBookings) {
      const d = new Date(b.startTime)
      const key = toDateString(d.getFullYear(), d.getMonth(), d.getDate())
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return map
  }, [filteredBookings])

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const handleToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const handleDayClick = (date: Date) => {
    if (isPast(date.getFullYear(), date.getMonth(), date.getDate())) return
    const dateString = toDateString(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
    // If a specific facility is selected, pass it; otherwise pass "all" → undefined
    const facilityId =
      selectedFacilityId !== "all" ? selectedFacilityId : undefined
    startBooking(facilityId, dateString)
  }

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of filteredBookings) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }
    return counts
  }, [filteredBookings])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Kalendar Tempahan</h2>
            <p className="text-sm text-white/60">
              Lihat ketersediaan fasiliti & tempah tarikh baharu
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setView("my-bookings")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium glass-light text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tempah Baru
          </button>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 md:justify-between"
      >
        {/* Facility Selector */}
        <div className="flex flex-col gap-1.5 min-w-0 md:min-w-[260px]">
          <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
            Fasiliti
          </label>
          <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
            <SelectTrigger className="w-full bg-white/5 border-white/15 text-white">
              <SelectValue placeholder="Pilih fasiliti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Fasiliti</SelectItem>
              {facilities?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} · {f.capacity} org
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            aria-label="Bulan sebelum"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg glass-light text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 md:px-4 py-2 rounded-lg glass-light min-w-[180px] text-center">
            <span className="text-sm md:text-base font-semibold text-white">
              {MONTH_LABELS[month]} {year}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            aria-label="Bulan seterusnya"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg glass-light text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="ml-1 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-all whitespace-nowrap"
          >
            Hari Ini
          </button>
        </div>
      </motion.div>

      {/* Stats summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { status: "approved", label: "Diluluskan", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { status: "pending", label: "Menunggu", color: "text-gray-300", bg: "bg-gray-500/10" },
          { status: "kiv", label: "KIV", color: "text-amber-400", bg: "bg-amber-500/10" },
          { status: "rejected", label: "Ditolak", color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <div key={s.status} className="glass-card p-3 md:p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", s.bg)}>
              <span className={cn("text-lg font-bold", s.color)}>
                {stats[s.status] || 0}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/50 uppercase tracking-wide">{s.label}</p>
              <p className="text-sm text-white/80 font-medium">tempahan</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Loading state */}
      {facilitiesLoading || bookingsLoading ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin" />
          <p className="text-sm text-white/60 mt-3">Memuatkan kalendar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid (desktop full, mobile simplified) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-4 md:p-6 lg:col-span-2"
          >
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs md:text-sm font-semibold text-white/60 py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {weeks.flat().map((date, idx) => {
                if (!date) {
                  return (
                    <div
                      key={`blank-${idx}`}
                      className="aspect-square md:min-h-[90px] rounded-lg bg-white/[0.02] border border-white/5"
                    />
                  )
                }

                const dString = toDateString(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                )
                const dayBookings = bookingsByDay.get(dString) || []
                const today_ = isToday(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                )
                const past = isPast(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                )

                return (
                  <button
                    key={dString}
                    onClick={() => handleDayClick(date)}
                    disabled={past}
                    className={cn(
                      "aspect-square md:min-h-[90px] rounded-lg border p-1 md:p-2 flex flex-col text-left transition-all group",
                      past
                        ? "bg-white/[0.02] border-white/5 cursor-not-allowed opacity-50"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-[#14B8A6]/40 cursor-pointer",
                      today_ && "ring-1 ring-[#14B8A6]/60"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs md:text-sm font-medium",
                        today_ ? "text-[#14B8A6]" : past ? "text-white/30" : "text-white/80"
                      )}
                    >
                      {date.getDate()}
                    </span>

                    {/* Status dots */}
                    {dayBookings.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-0.5 md:gap-1">
                        {dayBookings.slice(0, 4).map((b) => (
                          <span
                            key={b.id}
                            className={cn(
                              "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                              STATUS_DOT_COLORS[b.status] || "bg-gray-400"
                            )}
                            title={`${b.title} (${b.status})`}
                          />
                        ))}
                        {dayBookings.length > 4 && (
                          <span className="text-[9px] md:text-[10px] text-white/50 leading-none">
                            +{dayBookings.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {dayBookings.length > 0 && !past && (
                      <span className="hidden md:inline-block mt-1 text-[10px] text-white/40 group-hover:text-[#14B8A6] transition-colors">
                        + Tempah
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                Legend:
              </span>
              {STATUS_LEGEND.map((s) => (
                <div key={s.status} className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", s.color)} />
                  <span className="text-xs text-white/70">{s.label}</span>
                </div>
              ))}
              <div className="hidden md:flex items-center gap-2 ml-auto">
                <span className="w-2.5 h-2.5 rounded-full ring-1 ring-[#14B8A6]/60 bg-transparent" />
                <span className="text-xs text-white/70">Hari Ini</span>
              </div>
            </div>
          </motion.div>

          {/* Side panel - Today's / Upcoming bookings list */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 md:p-5 lg:col-span-1 max-h-[640px] overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#14B8A6]" />
              Tempahan Bulan Ini
            </h3>

            {filteredBookings.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <Building2 className="w-7 h-7 text-white/30" />
                </div>
                <p className="text-sm text-white/60 font-medium">Tiada tempahan</p>
                <p className="text-xs text-white/40 mt-1">
                  Tiada tempahan untuk bulan & fasiliti dipilih.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {[...filteredBookings]
                  .sort(
                    (a, b) =>
                      new Date(a.startTime).getTime() -
                      new Date(b.startTime).getTime()
                  )
                  .map((b) => {
                    const d = new Date(b.startTime)
                    return (
                      <li
                        key={b.id}
                        className="glass-light rounded-lg p-3 flex items-start gap-3"
                      >
                        <div className="flex-shrink-0 w-12 text-center">
                          <p className="text-xs text-white/50 uppercase">
                            {MONTH_LABELS[d.getMonth()].slice(0, 3)}
                          </p>
                          <p className="text-lg font-bold text-white leading-none">
                            {d.getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {b.title}
                          </p>
                          <p className="text-xs text-white/50 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {b.facility?.name || "—"}
                          </p>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <span className="text-[11px] text-white/40">
                              {formatTimeRange(b.startTime, b.endTime)}
                            </span>
                            <StatusBadge status={b.status} />
                          </div>
                        </div>
                      </li>
                    )
                  })}
              </ul>
            )}
          </motion.div>
        </div>
      )}

      {/* Helper note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-white/40 text-center flex items-center justify-center gap-1.5"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Klik pada tarikh untuk mula menempah fasiliti. Tarikh yang telah berlalu tidak boleh ditempah.
      </motion.p>
    </div>
  )
}
