"use client"

import { useAppStore, type ViewName } from "@/stores/app-store"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  FileText,
  CheckSquare,
  ListChecks,
  Users,
  Bell,
  User,
  ScrollText,
  LogOut,
  X,
  PlusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface SidebarProps {
  user: {
    id: string
    email: string
    name: string
    role: string
    department: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const { currentView, setView, sidebarOpen, setSidebar, startBooking } = useAppStore()
  const { toast } = useToast()
  const router = useRouter()

  const navItems: Array<{
    view: ViewName
    label: string
    icon: typeof LayoutDashboard
    roles: string[]
  }> = [
    { view: "dashboard", label: "Papan Pemuka", icon: LayoutDashboard, roles: ["user", "manager", "admin"] },
    { view: "facilities", label: "Fasiliti", icon: Building2, roles: ["user", "manager", "admin"] },
    { view: "calendar", label: "Kalendar", icon: Calendar, roles: ["user", "manager", "admin"] },
    { view: "booking-form", label: "Tempah Baru", icon: PlusCircle, roles: ["user", "manager", "admin"] },
    { view: "my-bookings", label: "Permohonan Saya", icon: FileText, roles: ["user", "manager", "admin"] },
    { view: "approval-panel", label: "Panel Kelulusan", icon: CheckSquare, roles: ["manager", "admin"] },
    { view: "all-bookings", label: "Semua Permohonan", icon: ListChecks, roles: ["manager", "admin"] },
    { view: "user-management", label: "Pengurusan Pengguna", icon: Users, roles: ["admin"] },
    { view: "audit-logs", label: "Log Audit", icon: ScrollText, roles: ["admin"] },
    { view: "notifications", label: "Notifikasi", icon: Bell, roles: ["user", "manager", "admin"] },
    { view: "profile", label: "Profil Saya", icon: User, roles: ["user", "manager", "admin"] },
  ]

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role))

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    toast({ title: "Log Keluar", description: "Anda telah log keluar." })
    router.refresh()
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 z-50 transition-transform duration-300 lg:translate-x-0",
          "flex flex-col glass-strong border-r border-white/10",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "rgba(8, 18, 35, 0.85)" }}
      >
        {/* Logo header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center glow-accent">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text">SiTempah</h1>
              <p className="text-xs text-white/50">ADTEC JTM BP</p>
            </div>
          </div>
          <button
            onClick={() => setSidebar(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {visibleItems.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => {
                  if (item.view === "booking-form") {
                    startBooking()
                  } else {
                    setView(item.view)
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-[#14B8A6]/20 to-[#0F4C81]/20 text-white border border-[#14B8A6]/30 glow-accent"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-[#14B8A6]")} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center text-white font-bold text-sm">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
