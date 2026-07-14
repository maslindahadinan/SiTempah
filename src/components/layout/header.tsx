"use client"

import { useAppStore } from "@/stores/app-store"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Menu, Building2 } from "lucide-react"
import { getRoleLabel } from "@/lib/utils"

interface HeaderProps {
  user: {
    id: string
    name: string
    role: string
    department: string
  }
}

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Papan Pemuka", subtitle: "Ringkasan aktiviti dan statistik" },
  facilities: { title: "Fasiliti Gunasama", subtitle: "Senarai dan carian fasiliti kampus" },
  "facility-detail": { title: "Butiran Fasiliti", subtitle: "Maklumat dan ketersediaan fasiliti" },
  "facility-form": { title: "Pengurusan Fasiliti", subtitle: "Tambah/Edit fasiliti" },
  calendar: { title: "Kalendar Kekosongan", subtitle: "Paparan kalendar interaktif" },
  "booking-form": { title: "Borang Tempahan", subtitle: "Buat permohonan tempahan baharu" },
  "my-bookings": { title: "Permohonan Saya", subtitle: "Senarai tempahan anda" },
  "booking-detail": { title: "Butiran Tempahan", subtitle: "Maklumat penuh tempahan" },
  "approval-panel": { title: "Panel Kelulusan", subtitle: "Permohonan menunggu tindakan" },
  "all-bookings": { title: "Semua Permohonan", subtitle: "Jadual penuh semua tempahan sistem" },
  "user-management": { title: "Pengurusan Pengguna", subtitle: "Urus akaun dan peranan pengguna" },
  notifications: { title: "Notifikasi", subtitle: "Semua notifikasi terkini" },
  profile: { title: "Profil Saya", subtitle: "Kemas kini maklumat peribadi" },
  "audit-logs": { title: "Log Audit", subtitle: "Rekod tindakan sistem" },
}

export function Header({ user }: HeaderProps) {
  const { currentView, toggleSidebar } = useAppStore()
  const { title, subtitle } = viewTitles[currentView] || viewTitles.dashboard

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/10 px-4 md:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="lg:hidden w-10 h-10 rounded-xl glass-light flex items-center justify-center text-white/70 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white truncate">{title}</h1>
            <p className="text-xs md:text-sm text-white/50 truncate hidden sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
            <span className="text-xs text-white/70">{getRoleLabel(user.role)}</span>
          </div>
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
