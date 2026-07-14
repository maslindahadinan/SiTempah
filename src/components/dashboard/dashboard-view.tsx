"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { StatusBadge } from "@/components/common/status-badge"
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  FileText,
  Pause,
  Ban,
  ArrowRight,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Loader2,
  Bell,
  Activity,
} from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import {
  formatDate,
  formatDateTime,
  formatTimeRange,
  getRoleLabel,
  getStatusLabel,
  cn,
} from "@/lib/utils"

// ---------- Types ----------
interface UserStats {
  totalBookings: number
  pending: number
  approved: number
  rejected: number
}
interface UpcomingBooking {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  facility: { name: string; category: string; location: string }
}
interface UserDashboard {
  role: "user"
  stats: UserStats
  upcomingBookings: UpcomingBooking[]
}

interface ManagerStats {
  pending: number
  approved: number
  kiv: number
  rejected: number
  managedFacilities: number
}
interface PendingBooking {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  createdAt: string
  facility: { name: string; category: string }
  user: { fullName: string; department: string }
}
interface PopularFacility {
  id: string
  name: string
  category: string
  _count: { bookings: number }
}
interface ManagerDashboard {
  role: "manager"
  stats: ManagerStats
  pendingBookings: PendingBooking[]
  popularFacilities: PopularFacility[]
}

interface AdminStats {
  totalUsers: number
  totalFacilities: number
  totalBookings: number
  pending: number
  approved: number
  kiv: number
  rejected: number
  cancelled: number
}
interface RecentBooking {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  facility: { name: string; category: string }
  user: { fullName: string; department: string }
}
interface AdminDashboard {
  role: "admin"
  stats: AdminStats
  recentBookings: RecentBooking[]
  facilitiesByCategory: { category: string; _count: number }[]
  bookingsByStatus: { status: string; _count: number }[]
  usersByRole: { role: string; _count: number }[]
}

type DashboardData = UserDashboard | ManagerDashboard | AdminDashboard

// ---------- Fetcher ----------
async function fetchDashboardStats(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard/stats")
  if (!res.ok) throw new Error("Gagal memuatkan statistik papan pemuka")
  return res.json()
}

// ---------- Chart palette ----------
const CHART_COLORS = ["#14B8A6", "#0F4C81", "#F59E0B", "#EF4444", "#22C55E"]

// ---------- Stat Card ----------
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  gradient: string
  index: number
  onClick?: () => void
}

function StatCard({ icon: Icon, label, value, gradient, index, onClick }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={cn(
        "glass-card glass-card-hover p-5 relative overflow-hidden",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl"
        style={{ background: gradient }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

// ---------- Section Card ----------
function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass-card p-5 md:p-6 flex flex-col", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-[#14B8A6]" />
          </div>
          <h3 className="font-semibold text-white text-base md:text-lg">{title}</h3>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </motion.div>
  )
}

// ---------- Loading skeleton ----------
function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 h-28 animate-pulse">
            <div className="h-3 w-20 bg-white/10 rounded mb-3" />
            <div className="h-7 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card p-6 h-80 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// ---------- Error state ----------
function DashboardError({ message }: { message: string }) {
  return (
    <div className="glass-card p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
        <XCircle className="w-7 h-7 text-red-400" />
      </div>
      <p className="text-white/80 font-medium">Ralat memuatkan papan pemuka</p>
      <p className="text-sm text-white/50 mt-1">{message}</p>
    </div>
  )
}

// ---------- USER DASHBOARD ----------
function UserDashboard({ data }: { data: UserDashboard }) {
  const { viewBooking, startBooking, setView } = useAppStore()
  const { stats, upcomingBookings } = data

  const cards = [
    { icon: FileText, label: "Jumlah Tempahan", value: stats.totalBookings, gradient: "linear-gradient(135deg, #14B8A6, #0d9488)", onClick: () => setView("my-bookings") },
    { icon: Clock, label: "Menunggu", value: stats.pending, gradient: "linear-gradient(135deg, #64748b, #475569)", onClick: () => setView("my-bookings") },
    { icon: CheckCircle2, label: "Diluluskan", value: stats.approved, gradient: "linear-gradient(135deg, #22C55E, #16a34a)", onClick: () => setView("my-bookings") },
    { icon: XCircle, label: "Ditolak", value: stats.rejected, gradient: "linear-gradient(135deg, #EF4444, #dc2626)", onClick: () => setView("my-bookings") },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="Tempahan Akan Datang"
          icon={CalendarCheck}
          className="lg:col-span-2"
          action={
            <button
              onClick={() => setView("my-bookings")}
              className="text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-10">
              <CalendarCheck className="w-10 h-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/60 text-sm">Tiada tempahan akan datang</p>
              <button
                onClick={() => startBooking()}
                className="mt-4 text-sm text-[#14B8A6] hover:underline"
              >
                Buat Tempahan Baharu
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {upcomingBookings.map((b, i) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => viewBooking(b.id)}
                  className="w-full text-left glass-light p-4 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-[#0F4C81]/20 border border-white/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white/60 leading-none">
                      {new Date(b.startTime).toLocaleDateString("ms-MY", { month: "short" })}
                    </span>
                    <span className="text-lg font-bold text-white leading-none mt-0.5">
                      {new Date(b.startTime).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{b.title}</p>
                    <p className="text-sm text-white/60 truncate">{b.facility.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {formatTimeRange(b.startTime, b.endTime)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </motion.button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Tindakan Pantas" icon={Activity}>
          <div className="space-y-3">
            <button
              onClick={() => startBooking()}
              className="w-full glass-light hover:bg-white/10 transition-colors p-4 rounded-xl text-left flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#14B8A6]/20 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-[#14B8A6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Tempah Fasiliti</p>
                <p className="text-xs text-white/50">Buat permohonan baharu</p>
              </div>
            </button>
            <button
              onClick={() => setView("facilities")}
              className="w-full glass-light hover:bg-white/10 transition-colors p-4 rounded-xl text-left flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0F4C81]/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#60a5fa]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Lihat Fasiliti</p>
                <p className="text-xs text-white/50">Senarai fasiliti kampus</p>
              </div>
            </button>
            <button
              onClick={() => setView("notifications")}
              className="w-full glass-light hover:bg-white/10 transition-colors p-4 rounded-xl text-left flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#fbbf24]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Notifikasi</p>
                <p className="text-xs text-white/50">Paparan notifikasi terkini</p>
              </div>
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ---------- MANAGER DASHBOARD ----------
function ManagerDashboard({ data }: { data: ManagerDashboard }) {
  const { viewBooking, setView } = useAppStore()
  const { stats, pendingBookings, popularFacilities } = data

  const cards = [
    { icon: Clock, label: "Menunggu", value: stats.pending, gradient: "linear-gradient(135deg, #64748b, #475569)", onClick: () => setView("approval-panel") },
    { icon: CheckCircle2, label: "Diluluskan", value: stats.approved, gradient: "linear-gradient(135deg, #22C55E, #16a34a)", onClick: () => setView("all-bookings") },
    { icon: Pause, label: "KIV", value: stats.kiv, gradient: "linear-gradient(135deg, #F59E0B, #d97706)", onClick: () => setView("all-bookings") },
    { icon: XCircle, label: "Ditolak", value: stats.rejected, gradient: "linear-gradient(135deg, #EF4444, #dc2626)", onClick: () => setView("all-bookings") },
    { icon: Building2, label: "Fasiliti Diurus", value: stats.managedFacilities, gradient: "linear-gradient(135deg, #14B8A6, #0d9488)", onClick: () => setView("facilities") },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="Permohonan Menunggu Kelulusan"
          icon={Clock}
          className="lg:col-span-2"
          action={
            <button
              onClick={() => setView("approval-panel")}
              className="text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
            >
              Panel Kelulusan <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          {pendingBookings.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/60 text-sm">Tiada permohonan menunggu</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1">
              {pendingBookings.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-light p-4 rounded-xl flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6]/30 to-[#0F4C81]/30 border border-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {b.user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{b.title}</p>
                    <p className="text-sm text-white/60 truncate">
                      {b.user.fullName} · {b.facility.name}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {formatDateTime(b.startTime)}
                    </p>
                  </div>
                  <button
                    onClick={() => viewBooking(b.id)}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1 flex-shrink-0"
                  >
                    Semak <ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Fasiliti Popular"
          icon={TrendingUp}
          action={
            <button
              onClick={() => setView("facilities")}
              className="text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          {popularFacilities.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="w-10 h-10 mx-auto text-white/20 mb-3" />
              <p className="text-white/60 text-sm">Tiada fasiliti diurus</p>
            </div>
          ) : (
            <div className="space-y-3">
              {popularFacilities.map((f, i) => {
                const maxCount = Math.max(...popularFacilities.map((p) => p._count.bookings), 1)
                const pct = Math.round((f._count.bookings / maxCount) * 100)
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-light p-3 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{f.name}</p>
                        <p className="text-xs text-white/40">{f.category}</p>
                      </div>
                      <span className="text-sm font-bold text-[#14B8A6] flex-shrink-0 ml-2">
                        {f._count.bookings}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0F4C81]"
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

// ---------- ADMIN DASHBOARD ----------
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-white/80 font-medium mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-white/70">
          <span
            className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
            style={{ background: p.color || p.payload?.fill }}
          />
          {p.name}: <span className="text-white font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function AdminDashboard({ data }: { data: AdminDashboard }) {
  const { viewBooking, setView } = useAppStore()
  const { stats, recentBookings, facilitiesByCategory, bookingsByStatus, usersByRole } = data

  const cards = [
    { icon: Users, label: "Jumlah Pengguna", value: stats.totalUsers, gradient: "linear-gradient(135deg, #14B8A6, #0d9488)", onClick: () => setView("user-management") },
    { icon: Building2, label: "Jumlah Fasiliti", value: stats.totalFacilities, gradient: "linear-gradient(135deg, #0F4C81, #1e3a8a)", onClick: () => setView("facilities") },
    { icon: FileText, label: "Jumlah Tempahan", value: stats.totalBookings, gradient: "linear-gradient(135deg, #F59E0B, #d97706)", onClick: () => setView("all-bookings") },
    { icon: Clock, label: "Menunggu", value: stats.pending, gradient: "linear-gradient(135deg, #64748b, #475569)", onClick: () => setView("approval-panel") },
    { icon: CheckCircle2, label: "Diluluskan", value: stats.approved, gradient: "linear-gradient(135deg, #22C55E, #16a34a)", onClick: () => setView("all-bookings") },
    { icon: Pause, label: "KIV", value: stats.kiv, gradient: "linear-gradient(135deg, #F59E0B, #b45309)", onClick: () => setView("all-bookings") },
    { icon: XCircle, label: "Ditolak", value: stats.rejected, gradient: "linear-gradient(135deg, #EF4444, #dc2626)", onClick: () => setView("all-bookings") },
    { icon: Ban, label: "Dibatalkan", value: stats.cancelled, gradient: "linear-gradient(135deg, #6b7280, #4b5563)", onClick: () => setView("all-bookings") },
  ]

  const statusPieData = bookingsByStatus.map((s) => ({
    name: getStatusLabel(s.status),
    value: s._count,
    status: s.status,
  }))

  const categoryBarData = facilitiesByCategory.map((c) => ({
    name: c.category,
    Bil: c._count,
  }))

  const rolePieData = usersByRole.map((r) => ({
    name: getRoleLabel(r.role),
    value: r._count,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} index={i} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Tempahan Mengikut Status" icon={PieChartIcon}>
          {statusPieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/40 text-sm">
              Tiada data
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.15)"
                  >
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(v) => <span className="text-white/70 text-xs">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Fasiliti Mengikut Kategori" icon={BarChart3}>
          {categoryBarData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/40 text-sm">
              Tiada data
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="Bil" radius={[6, 6, 0, 0]}>
                    {categoryBarData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Pengguna Mengikut Peranan" icon={Users}>
          {rolePieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/40 text-sm">
              Tiada data
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.15)"
                    label={(entry: any) => `${entry.value}`}
                    labelLine={false}
                  >
                    {rolePieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(v) => <span className="text-white/70 text-xs">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent bookings table */}
      <SectionCard
        title="Tempahan Terkini"
        icon={FileText}
        action={
          <button
            onClick={() => setView("all-bookings")}
            className="text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <div className="overflow-x-auto custom-scrollbar -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="px-2 py-2 font-medium">Tajuk</th>
                <th className="px-2 py-2 font-medium">Pemohon</th>
                <th className="px-2 py-2 font-medium hidden md:table-cell">Fasiliti</th>
                <th className="px-2 py-2 font-medium hidden lg:table-cell">Tarikh</th>
                <th className="px-2 py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-white/40">
                    Tiada tempahan
                  </td>
                </tr>
              ) : (
                recentBookings.map((b, i) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => viewBooking(b.id)}
                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-2 py-3">
                      <p className="font-medium text-white truncate max-w-[12rem]">{b.title}</p>
                    </td>
                    <td className="px-2 py-3">
                      <p className="text-white/80 truncate max-w-[10rem]">{b.user.fullName}</p>
                      <p className="text-xs text-white/40 truncate max-w-[10rem]">{b.user.department}</p>
                    </td>
                    <td className="px-2 py-3 text-white/70 hidden md:table-cell truncate max-w-[10rem]">
                      {b.facility.name}
                    </td>
                    <td className="px-2 py-3 text-white/60 hidden lg:table-cell whitespace-nowrap text-xs">
                      {formatDate(b.startTime)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <StatusBadge status={b.status} />
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ---------- MAIN ----------
export function DashboardView() {
  const { data: session } = useSession()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60000,
    enabled: !!session,
  })

  const role = session?.user?.role || "user"

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
      >
        <div>
          <h2 className="text-2xl md:text-3xl font-bold gradient-text">
            Selamat datang, {session?.user?.name?.split(" ")[0] || "Pengguna"}!
          </h2>
          <p className="text-sm text-white/60 mt-1">
            {role === "admin"
              ? "Pusat pentadbiran sistem SiTempah"
              : role === "manager"
              ? "Urus fasiliti dan permohonan anda"
              : "Tempah dan urus fasiliti kampus"}
          </p>
        </div>
        {isError && (
          <button
            onClick={() => refetch()}
            className="text-sm text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
          >
            <Loader2 className="w-3.5 h-3.5" /> Cuba semula
          </button>
        )}
      </motion.div>

      {isLoading ? (
        <DashboardLoading />
      ) : isError ? (
        <DashboardError message={(error as Error)?.message || "Sila cuba lagi."} />
      ) : !data ? (
        <DashboardError message="Tiada data diterima." />
      ) : data.role === "user" ? (
        <UserDashboard data={data} />
      ) : data.role === "manager" ? (
        <ManagerDashboard data={data} />
      ) : (
        <AdminDashboard data={data} />
      )}
    </div>
  )
}
