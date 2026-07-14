"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/common/status-badge"
import {
  Building2,
  Building,
  MessagesSquare,
  MonitorCog,
  Presentation,
  MapPin,
  Users,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  UserCog,
  Mail,
  CalendarDays,
  CalendarRange,
  Pencil,
  Trash2,
  Loader2,
  AlertOctagon,
  Building2Icon,
  Sparkles,
  Info,
  CalendarClock,
  ChevronRight,
} from "lucide-react"
import {
  cn,
  formatDate,
  formatTimeRange,
} from "@/lib/utils"

// ---------- Types ----------
interface Manager {
  id: string
  fullName: string
  email: string
  department?: string | null
}

interface BookingItem {
  id: string
  title: string
  startTime: string
  endTime: string
  status: string
  user: { id: string; fullName: string }
}

interface FacilityDetail {
  id: string
  name: string
  category: string
  capacity: number
  location: string
  description: string
  amenities: string
  imageUrl: string | null
  managerId: string | null
  isActive: boolean
  operatingHours: string
  createdAt: string
  manager: Manager | null
  _count: { bookings: number }
  bookings?: BookingItem[]
}

// ---------- Category config (mirror of list view) ----------
type IconComponent = React.ComponentType<{ className?: string }>
const categoryConfig: Record<
  string,
  { Icon: IconComponent; gradient: string; iconColor: string; label: string }
> = {
  "Bilik Mesyuarat": {
    Icon: Building2,
    gradient: "from-teal-500/30 to-cyan-600/30",
    iconColor: "text-teal-300",
    label: "Bilik Mesyuarat",
  },
  "Bilik Perbincangan": {
    Icon: MessagesSquare,
    gradient: "from-sky-500/30 to-blue-600/30",
    iconColor: "text-sky-300",
    label: "Bilik Perbincangan",
  },
  Makmal: {
    Icon: MonitorCog,
    gradient: "from-amber-500/30 to-orange-600/30",
    iconColor: "text-amber-300",
    label: "Makmal",
  },
  "Dewan Utama": {
    Icon: Building,
    gradient: "from-violet-500/30 to-purple-600/30",
    iconColor: "text-violet-300",
    label: "Dewan Utama",
  },
  "Bilik Seminar": {
    Icon: Presentation,
    gradient: "from-rose-500/30 to-pink-600/30",
    iconColor: "text-rose-300",
    label: "Bilik Seminar",
  },
}

function getCategoryConfig(category: string) {
  return categoryConfig[category] || categoryConfig["Bilik Mesyuarat"]
}

// ---------- Safe JSON parse ----------
function parseAmenities(raw: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string")
    return []
  } catch {
    return []
  }
}

interface OperatingHours {
  start?: string
  end?: string
  days?: number[]
}

function parseOperatingHours(raw: string): OperatingHours {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as OperatingHours
    return {}
  } catch {
    return {}
  }
}

const DAY_LABELS = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"]

// ---------- Fetch ----------
async function fetchFacilityDetail(id: string): Promise<FacilityDetail> {
  const res = await fetch(`/api/facilities/${id}`)
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || "Gagal memuatkan butiran fasiliti")
  }
  return res.json()
}

async function deleteFacility(id: string): Promise<void> {
  const res = await fetch(`/api/facilities/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || "Gagal menyahaktifkan fasiliti")
  }
}

// ---------- Info Row ----------
function DetailRow({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: IconComponent
  label: string
  value: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl glass-light">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className={cn("w-4.5 h-4.5", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-white font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

// ---------- Loading skeleton ----------
function DetailLoading() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 h-56 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 h-80 animate-pulse" />
        <div className="glass-card p-6 h-80 animate-pulse" />
        <div className="glass-card p-6 h-80 animate-pulse" />
      </div>
    </div>
  )
}

// ---------- MAIN ----------
export function FacilityDetailView() {
  const { data: session } = useSession()
  const {
    selectedFacilityId,
    setView,
    startBooking,
    editFacility,
    viewBooking,
  } = useAppStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  const { data: facility, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["facility", selectedFacilityId],
    queryFn: () => fetchFacilityDetail(selectedFacilityId as string),
    enabled: !!selectedFacilityId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteFacility(selectedFacilityId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] })
      queryClient.invalidateQueries({ queryKey: ["facility", selectedFacilityId] })
      toast({
        title: "Fasiliti dinyahaktifkan",
        description: "Fasiliti telah ditanda sebagai tidak aktif.",
      })
      setView("facilities")
    },
    onError: (err: Error) => {
      toast({
        title: "Ralat",
        description: err.message,
        variant: "destructive",
      })
      setConfirmDeactivate(false)
    },
  })

  // ---------- Guards ----------
  if (!selectedFacilityId) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-white/70">Tiada fasiliti dipilih.</p>
        <button
          onClick={() => setView("facilities")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Senarai Fasiliti
        </button>
      </div>
    )
  }

  if (isLoading) return <DetailLoading />

  if (isError || !facility) {
    return (
      <div className="space-y-6">
        <BackButton onClick={() => setView("facilities")} />
        <div className="glass-card p-10 md:p-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertOctagon className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Tidak dapat memuatkan fasiliti</p>
          <p className="text-sm text-white/50 mt-1 mb-4">
            {(error as Error)?.message || "Fasiliti mungkin tidak wujud atau telah dialih keluar."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white"
            >
              <Loader2 className="w-4 h-4" />
              Cuba Semula
            </button>
            <button
              onClick={() => setView("facilities")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  const cfg = getCategoryConfig(facility.category)
  const Icon = cfg.Icon
  const amenities = parseAmenities(facility.amenities)
  const oh = parseOperatingHours(facility.operatingHours)
  const upcomingBookings = (facility.bookings || []).filter(
    (b) => new Date(b.endTime).getTime() >= Date.now()
  )

  return (
    <div className="space-y-6">
      {/* Back button */}
      <BackButton onClick={() => setView("facilities")} />

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 relative overflow-hidden"
      >
        <div
          className={cn(
            "absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br blur-3xl pointer-events-none opacity-50",
            cfg.gradient
          )}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Icon */}
          <div
            className={cn(
              "w-20 h-20 rounded-2xl bg-gradient-to-br border border-white/15 flex items-center justify-center flex-shrink-0 glow-accent",
              cfg.gradient
            )}
          >
            <Icon className={cn("w-10 h-10", cfg.iconColor)} />
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {facility.name}
              </h1>
              {facility.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                  <XCircle className="w-3.5 h-3.5" />
                  Tidak Aktif
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
                {cfg.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/60">
                <MapPin className="w-4 h-4" />
                {facility.location}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/60">
                <Users className="w-4 h-4" />
                Kapasiti {facility.capacity} orang
              </span>
            </div>

            {facility.description && (
              <p className="text-sm text-white/70 leading-relaxed mt-4 max-w-2xl">
                {facility.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 lg:items-end flex-shrink-0">
            <button
              onClick={() => startBooking(facility.id)}
              disabled={!facility.isActive}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                facility.isActive
                  ? "bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent"
                  : "glass-light text-white/40 cursor-not-allowed"
              )}
              title={facility.isActive ? "Buat tempahan baharu" : "Fasiliti tidak aktif"}
            >
              <CalendarDays className="w-4 h-4" />
              Tempah Fasiliti Ini
            </button>
            <button
              onClick={() => setView("calendar")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white/80 whitespace-nowrap"
            >
              <CalendarRange className="w-4 h-4" />
              Lihat Kalendar
            </button>
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="relative mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
            <button
              onClick={() => editFacility(facility.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/15 hover:bg-white/10 transition-colors text-white"
            >
              <Pencil className="w-4 h-4 text-[#14B8A6]" />
              Edit Fasiliti
            </button>

            {!confirmDeactivate ? (
              <button
                onClick={() => setConfirmDeactivate(true)}
                disabled={!facility.isActive}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                  facility.isActive
                    ? "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                    : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                <Trash2 className="w-4 h-4" />
                Nyahaktifkan
              </button>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                <span className="text-xs text-red-200 ml-2">
                  Pasti nyahaktifkan?
                </span>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Ya, Nyahaktifkan
                </button>
                <button
                  onClick={() => setConfirmDeactivate(false)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: quick info + amenities */}
        <div className="space-y-6">
          {/* Quick info */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 md:p-6"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <Info className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Maklumat Pantas</h3>
            </div>

            <div className="space-y-2.5">
              <DetailRow
                icon={Building2}
                label="Kategori"
                value={cfg.label}
                iconBg="bg-teal-500/15"
                iconColor="text-teal-300"
              />
              <DetailRow
                icon={Users}
                label="Kapasiti"
                value={`${facility.capacity} orang`}
                iconBg="bg-sky-500/15"
                iconColor="text-sky-300"
              />
              <DetailRow
                icon={MapPin}
                label="Lokasi"
                value={facility.location}
                iconBg="bg-amber-500/15"
                iconColor="text-amber-300"
              />
              <DetailRow
                icon={CalendarClock}
                label="Jumlah Tempahan"
                value={`${facility._count.bookings} tempahan`}
                iconBg="bg-violet-500/15"
                iconColor="text-violet-300"
              />
            </div>
          </motion.div>

          {/* Amenities */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-5 md:p-6"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Kemudahan</h3>
            </div>

            {amenities.length === 0 ? (
              <p className="text-sm text-white/50 italic">
                Tiada kemudahan disenaraikan untuk fasiliti ini.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {amenities.map((a, i) => (
                  <motion.span
                    key={`${a}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light text-sm text-white/80"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {a}
                  </motion.span>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Middle column: operating hours + manager */}
        <div className="space-y-6">
          {/* Operating hours */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5 md:p-6"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Waktu Operasi</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl glass-light">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4.5 h-4.5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white/50 uppercase tracking-wider">
                    Waktu
                  </p>
                  <p className="text-sm text-white font-medium">
                    {oh.start && oh.end
                      ? `${oh.start} — ${oh.end}`
                      : "08:00 — 17:00 (lalai)"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">
                  Hari Beroperasi
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_LABELS.map((day, idx) => {
                    const active = oh.days?.includes(idx) ?? (idx >= 1 && idx <= 5)
                    return (
                      <div
                        key={day}
                        className={cn(
                          "aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium border",
                          active
                            ? "bg-[#14B8A6]/20 border-[#14B8A6]/40 text-[#14B8A6]"
                            : "bg-white/5 border-white/10 text-white/30"
                        )}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Manager */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-5 md:p-6"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <UserCog className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Pengurus Fasiliti</h3>
            </div>

            {facility.manager ? (
              <div className="flex items-center gap-3 p-3 rounded-xl glass-light">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center text-white font-bold border border-white/20 flex-shrink-0">
                  {facility.manager.fullName
                    .split(" ")
                    .map((p) => p.charAt(0))
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {facility.manager.fullName}
                  </p>
                  <p className="text-xs text-white/50 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {facility.manager.email}
                  </p>
                  {facility.manager.department && (
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {facility.manager.department}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl glass-light text-center">
                <UserCog className="w-8 h-8 mx-auto text-white/30 mb-2" />
                <p className="text-sm text-white/60">
                  Tiada pengurus ditugaskan
                </p>
                {isAdmin && (
                  <button
                    onClick={() => editFacility(facility.id)}
                    className="mt-2 text-xs text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    Tugaskan pengurus →
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right column: upcoming bookings */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 md:p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <CalendarClock className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Tempahan Akan Datang</h3>
            </div>
            <span className="text-xs text-white/50 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
              {upcomingBookings.length}
            </span>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <CalendarClock className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-sm text-white/60">Tiada tempahan akan datang</p>
              {facility.isActive && (
                <button
                  onClick={() => startBooking(facility.id)}
                  className="mt-3 text-xs text-[#14B8A6] hover:text-[#14B8A6]/80"
                >
                  Buat tempahan pertama →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1 flex-1">
              {upcomingBookings.map((b, i) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => viewBooking(b.id)}
                  className="w-full text-left glass-light hover:bg-white/10 transition-colors p-3 rounded-xl flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#14B8A6]/20 to-[#0F4C81]/20 border border-white/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-white/60 leading-none uppercase">
                      {new Date(b.startTime).toLocaleDateString("ms-MY", { month: "short" })}
                    </span>
                    <span className="text-base font-bold text-white leading-none mt-0.5">
                      {new Date(b.startTime).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {b.title}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {b.user.fullName}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeRange(b.startTime, b.endTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={b.status} />
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-white/40 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Menampilkan tempahan menunggu / diluluskan / KIV
          </div>
        </motion.div>
      </div>

      {/* Metadata footer */}
      <div className="text-xs text-white/40 text-center">
        <span className="inline-flex items-center gap-1.5">
          <Building2Icon className="w-3.5 h-3.5" />
          Dicipta pada {formatDate(facility.createdAt)}
        </span>
      </div>
    </div>
  )
}

// ---------- Back button helper ----------
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white/80 self-start"
    >
      <ArrowLeft className="w-4 h-4" />
      Kembali ke Fasiliti
    </button>
  )
}
