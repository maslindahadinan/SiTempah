"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { StatusBadge } from "@/components/common/status-badge"
import {
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Plus,
  Search,
  Inbox,
  Loader2,
  ChevronRight,
  AlertCircle,
  CalendarOff,
  FileText,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  cn,
  formatDate,
  formatTimeRange,
  getStatusLabel,
} from "@/lib/utils"

// ---------- Types ----------
interface MyBooking {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  attendeesCount: number
  purposeNotes: string
  createdAt: string
  facility: { id: string; name: string; category: string; location: string }
  user: { id: string; fullName: string; email: string; department: string }
  reviewer?: { id: string; fullName: string } | null
}

type FilterTab = "all" | "pending" | "approved" | "kiv" | "rejected" | "cancelled"

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Diluluskan" },
  { value: "kiv", label: "KIV" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
]

// ---------- Component ----------
export function MyBookingsView() {
  const { viewBooking, startBooking, setView } = useAppStore()
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [search, setSearch] = useState("")

  const { data: bookings, isLoading, isError, error } = useQuery<MyBooking[]>({
    queryKey: ["bookings", "me"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?scope=me")
      if (!res.ok) throw new Error("Gagal memuatkan tempahan")
      return res.json()
    },
  })

  // Apply search + filter
  const filtered = useMemo(() => {
    let list = bookings || []
    if (activeTab !== "all") {
      list = list.filter((b) => b.status === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.facility?.name?.toLowerCase().includes(q) ||
          b.purposeNotes?.toLowerCase().includes(q)
      )
    }
    // Sort by startTime desc (most recent first)
    return [...list].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
  }, [bookings, activeTab, search])

  // Count per status (for tab badges)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookings || []) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }
    counts["all"] = bookings?.length || 0
    return counts
  }, [bookings])

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
            <CalendarDays className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Tempahan Saya</h2>
            <p className="text-sm text-white/60">
              {bookings?.length || 0} jumlah tempahan
            </p>
          </div>
        </div>

        <Button
          onClick={() => startBooking()}
          className="bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent"
        >
          <Plus className="w-4 h-4" />
          Tempah Baru
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-3 md:p-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mengikut tajuk, fasiliti, atau tujuan..."
            className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/40"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <TabsList className="bg-white/5 border border-white/10 p-1 flex flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#14B8A6]/80 data-[state=active]:to-[#0F4C81]/80 gap-1.5"
              >
                {t.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                  {tabCounts[t.value] || 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass-card p-5 h-32 animate-pulse flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 bg-white/10 rounded" />
                <div className="h-5 w-20 bg-white/10 rounded-full" />
              </div>
              <div className="h-3 w-2/3 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan tempahan</p>
          <p className="text-sm text-white/50 mt-1">{(error as Error)?.message}</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 md:p-16 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#14B8A6]/15 to-[#0F4C81]/15 border border-white/10 flex items-center justify-center mb-5">
            {search.trim() ? (
              <Search className="w-10 h-10 text-white/30" />
            ) : activeTab === "all" ? (
              <Inbox className="w-10 h-10 text-white/30" />
            ) : (
              <CalendarOff className="w-10 h-10 text-white/30" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-white/90">
            {search.trim()
              ? "Tiada Hasil Carian"
              : activeTab === "all"
                ? "Tiada Tempahan Lagi"
                : `Tiada Tempahan ${getStatusLabel(activeTab)}`}
          </h3>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            {search.trim()
              ? "Cuba kata kunci lain atau kosongkan medan carian."
              : activeTab === "all"
                ? "Anda belum membuat sebarang tempahan. Mula tempah fasiliti sekarang."
                : `Anda tiada tempahan berstatus "${getStatusLabel(activeTab)}".`}
          </p>
          {!search.trim() && activeTab === "all" && (
            <Button
              onClick={() => startBooking()}
              className="mt-5 bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent"
            >
              <Plus className="w-4 h-4" />
              Buat Tempahan Pertama
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((b, i) => (
            <BookingCard
              key={b.id}
              booking={b}
              index={i}
              onClick={() => viewBooking(b.id)}
            />
          ))}
        </div>
      )}

      {/* Helper */}
      {!isLoading && !isError && filtered.length > 0 && (
        <p className="text-xs text-white/40 text-center flex items-center justify-center gap-1.5">
          <Loader2 className="w-3 h-3 opacity-50" />
          Klik pada kad untuk melihat butiran penuh.
        </p>
      )}
    </div>
  )
}

// ---------- Booking Card ----------
function BookingCard({
  booking,
  index,
  onClick,
}: {
  booking: MyBooking
  index: number
  onClick: () => void
}) {
  const startDate = new Date(booking.startTime)
  const isPast = startDate.getTime() < Date.now()
  const isUpcoming = !isPast && booking.status === "approved"

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={onClick}
      className="text-left glass-card glass-card-hover p-5 group relative overflow-hidden"
    >
      {/* Status accent strip */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          booking.status === "approved" && "bg-emerald-400",
          booking.status === "pending" && "bg-gray-400",
          booking.status === "kiv" && "bg-amber-400",
          booking.status === "rejected" && "bg-red-400",
          booking.status === "cancelled" && "bg-gray-500",
          booking.status === "draft" && "bg-blue-400",
          booking.status === "expired" && "bg-gray-500"
        )}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isUpcoming && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Akan Datang
              </span>
            )}
            {isPast && booking.status === "approved" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
                Selesai
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white truncate group-hover:text-[#14B8A6] transition-colors">
            {booking.title}
          </h3>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Date chip */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 w-12 text-center bg-white/5 border border-white/10 rounded-lg py-1.5">
          <p className="text-[10px] uppercase text-white/50 leading-none">
            {startDate.toLocaleDateString("ms-MY", { month: "short" })}
          </p>
          <p className="text-lg font-bold text-white leading-tight">
            {startDate.getDate()}
          </p>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs text-white/70 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#14B8A6]" />
            {formatTimeRange(booking.startTime, booking.endTime)}
          </p>
          <p className="text-xs text-white/70 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-[#14B8A6]" />
            <span className="truncate">{booking.facility?.name || "—"}</span>
          </p>
          <p className="text-xs text-white/50 flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {booking.attendeesCount} peserta
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {booking.facility?.category || "—"}
        </span>
        <span>{formatDate(booking.createdAt, { day: "numeric", month: "short" })}</span>
      </div>
    </motion.button>
  )
}
