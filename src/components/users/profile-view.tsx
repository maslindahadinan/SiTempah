"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { StatusBadge } from "@/components/common/status-badge"
import {
  User as UserIcon,
  Mail,
  Building2,
  Phone,
  Shield,
  CalendarClock,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronRight,
  Lock,
  PencilLine,
  Bell,
  Sparkles,
} from "lucide-react"
import {
  cn,
  formatDate,
  formatDateTime,
  formatTimeRange,
  getRoleLabel,
} from "@/lib/utils"

// ---------- Types ----------
interface UserDashboardStats {
  role: "user"
  stats: {
    totalBookings: number
    pending: number
    approved: number
    rejected: number
  }
  upcomingBookings: Array<{
    id: string
    title: string
    status: string
    startTime: string
    endTime: string
    facility: { name: string; category: string; location: string }
  }>
}

interface BookingItem {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  createdAt: string
  facility: { id: string; name: string; category: string; location: string; capacity: number }
}

async function fetchDashboardStats(): Promise<UserDashboardStats> {
  const res = await fetch("/api/dashboard/stats")
  if (!res.ok) throw new Error("Gagal memuatkan statistik")
  return res.json()
}

async function fetchMyBookings(): Promise<BookingItem[]> {
  const res = await fetch("/api/bookings?scope=me")
  if (!res.ok) throw new Error("Gagal memuatkan tempahan")
  return res.json()
}

// ---------- Avatar ----------
function UserAvatar({ name, size = "lg" }: { name: string; size?: "lg" | "md" }) {
  const initials = name
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "U"

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center text-white font-bold border-2 border-white/20 glow-accent",
        size === "lg" ? "w-24 h-24 text-3xl" : "w-12 h-12 text-base"
      )}
    >
      {initials}
    </div>
  )
}

// ---------- Role Badge ----------
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
    admin: {
      gradient: "from-red-500/20 to-rose-700/20 border-red-500/30 text-red-300",
      icon: Shield,
      label: getRoleLabel(role),
    },
    manager: {
      gradient: "from-amber-500/20 to-orange-600/20 border-amber-500/30 text-amber-300",
      icon: Shield,
      label: getRoleLabel(role),
    },
    user: {
      gradient: "from-teal-500/20 to-cyan-600/20 border-teal-500/30 text-teal-300",
      icon: UserIcon,
      label: getRoleLabel(role),
    },
  }
  const cfg = config[role] || config.user
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-gradient-to-r",
        cfg.gradient
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  )
}

// ---------- Info Row ----------
function InfoRow({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>
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
        <p className="text-sm text-white font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

// ---------- Stat Card ----------
function ProfileStatCard({
  icon: Icon,
  label,
  value,
  gradient,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  gradient: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="glass-card glass-card-hover p-4 relative overflow-hidden"
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
        style={{ background: gradient }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

// ---------- Loading Skeleton ----------
function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6 h-48 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 h-24 animate-pulse" />
        ))}
      </div>
      <div className="glass-card p-6 h-96 animate-pulse" />
    </div>
  )
}

// ---------- MAIN ----------
export function ProfileView() {
  const { data: session } = useSession()
  const { viewBooking, setView, startBooking } = useAppStore()

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    enabled: !!session,
  })

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings", "profile"],
    queryFn: fetchMyBookings,
    enabled: !!session,
  })

  if (!session) return null

  const user = session.user
  const stats = statsQuery.data?.stats
  const recentBookings = (bookingsQuery.data || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 relative overflow-hidden"
      >
        {/* Decorative gradient blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#14B8A6]/20 to-[#0F4C81]/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <UserAvatar name={user.name} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{user.name}</h2>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-sm text-white/60 mt-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {user.department}
            </p>
            <p className="text-sm text-white/50 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
              Ahli sejak{" "}
              {statsQuery.data ? formatDate(new Date()) : "—"}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light text-xs text-white/60">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              Akaun Aktif
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#14B8A6]" />
          Statistik Tempahan
        </h3>
        {statsQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProfileStatCard
              icon={FileText}
              label="Jumlah Tempahan"
              value={stats.totalBookings}
              gradient="linear-gradient(135deg, #14B8A6, #0d9488)"
              index={0}
            />
            <ProfileStatCard
              icon={Clock}
              label="Menunggu"
              value={stats.pending}
              gradient="linear-gradient(135deg, #64748b, #475569)"
              index={1}
            />
            <ProfileStatCard
              icon={CheckCircle2}
              label="Diluluskan"
              value={stats.approved}
              gradient="linear-gradient(135deg, #22C55E, #16a34a)"
              index={2}
            />
            <ProfileStatCard
              icon={XCircle}
              label="Ditolak"
              value={stats.rejected}
              gradient="linear-gradient(135deg, #EF4444, #dc2626)"
              index={3}
            />
          </div>
        ) : (
          <div className="glass-card p-6 text-center text-white/50 text-sm">
            Tidak dapat memuatkan statistik.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal info (read-only) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 md:p-6 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <UserIcon className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Maklumat Peribadi</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40 px-2 py-1 rounded-md bg-white/5 border border-white/10">
              <Lock className="w-3 h-3" />
              Baca Sahaja
            </span>
          </div>

          <div className="space-y-2.5">
            <InfoRow
              icon={UserIcon}
              label="Nama Penuh"
              value={user.name}
              iconBg="bg-teal-500/15"
              iconColor="text-teal-300"
            />
            <InfoRow
              icon={Mail}
              label="E-mel"
              value={user.email}
              iconBg="bg-blue-500/15"
              iconColor="text-blue-300"
            />
            <InfoRow
              icon={Building2}
              label="Jabatan"
              value={user.department}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-300"
            />
            <InfoRow
              icon={Phone}
              label="No. Telefon"
              value="—"
              iconBg="bg-purple-500/15"
              iconColor="text-purple-300"
            />
            <InfoRow
              icon={Shield}
              label="Peranan"
              value={getRoleLabel(user.role)}
              iconBg="bg-rose-500/15"
              iconColor="text-rose-300"
            />
          </div>

          <div className="mt-5 p-3 rounded-xl bg-[#14B8A6]/5 border border-[#14B8A6]/15 flex items-start gap-2.5">
            <PencilLine className="w-4 h-4 text-[#14B8A6] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/60 leading-relaxed">
              Untuk mengemas kini maklumat peribadi (nama, jabatan, no. telefon),
              sila hubungi <span className="text-white font-medium">Pentadbir Sistem</span>.
              Pengguna tidak dibenarkan mengubah maklumat akaun sendiri.
            </p>
          </div>

          <button
            onClick={() => setView("notifications")}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white/80"
          >
            <Bell className="w-4 h-4 text-[#14B8A6]" />
            Lihat Notifikasi
          </button>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 md:p-6 lg:col-span-2 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
                <CalendarClock className="w-4.5 h-4.5 text-[#14B8A6]" />
              </div>
              <h3 className="font-semibold text-white">Aktiviti Terkini</h3>
            </div>
            <button
              onClick={() => setView("my-bookings")}
              className="text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
            >
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-light p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <CalendarClock className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/60 text-sm">Tiada aktiviti tempahan lagi</p>
              <button
                onClick={() => startBooking()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Buat Tempahan Pertama Anda
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1 flex-1">
              {recentBookings.map((b, i) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
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
                    <p className="text-sm font-medium text-white truncate">{b.title}</p>
                    <p className="text-xs text-white/50 truncate">{b.facility.name}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      {formatDateTime(b.startTime)} · {formatTimeRange(b.startTime, b.endTime)}
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
        </motion.div>
      </div>
    </div>
  )
}
