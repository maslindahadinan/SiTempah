"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import {
  Bell,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  ChevronRight,
  Clock,
} from "lucide-react"
import { cn, formatRelativeTime, formatDateTime } from "@/lib/utils"

interface Notification {
  id: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  bookingId: string | null
  booking?: {
    id: string
    title: string
    facility: { name: string } | null
  } | null
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch("/api/notifications")
  if (!res.ok) throw new Error("Gagal memuatkan notifikasi")
  return res.json()
}

async function markRead(id: string) {
  const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
  if (!res.ok) throw new Error("Gagal menandai notifikasi")
  return res.json()
}

// Type visual config
const typeConfig: Record<
  string,
  { border: string; dot: string; icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string }
> = {
  info: {
    border: "border-l-blue-500",
    dot: "bg-blue-500",
    icon: Info,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
  },
  success: {
    border: "border-l-green-500",
    dot: "bg-green-500",
    icon: CheckCircle2,
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
  },
  warning: {
    border: "border-l-amber-500",
    dot: "bg-amber-500",
    icon: AlertTriangle,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  danger: {
    border: "border-l-red-500",
    dot: "bg-red-500",
    icon: AlertOctagon,
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
  },
}

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig.info
}

export function NotificationsView() {
  const { viewBooking } = useAppStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => {
      toast({
        title: "Ralat",
        description: "Tidak dapat menandai notifikasi sebagai dibaca.",
        variant: "destructive",
      })
    },
  })

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.bookingId) {
      viewBooking(notif.bookingId)
    }
  }

  const handleMarkAllRead = async () => {
    const unread = data?.notifications.filter((n) => !n.isRead) || []
    if (unread.length === 0) return
    try {
      await Promise.all(unread.map((n) => markRead(n.id)))
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast({
        title: "Berjaya",
        description: `${unread.length} notifikasi ditandai sebagai dibaca.`,
      })
    } catch {
      toast({
        title: "Ralat",
        description: "Tidak dapat menandai semua notifikasi.",
        variant: "destructive",
      })
    }
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

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
            <Bell className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Notifikasi</h2>
            <p className="text-sm text-white/60">
              {unreadCount > 0 ? (
                <span className="text-[#14B8A6] font-medium">{unreadCount} belum dibaca</span>
              ) : (
                "Semua notifikasi telah dibaca"
              )}
              {" · "}
              {notifications.length} jumlah
            </p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || markReadMutation.isPending}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            unreadCount === 0
              ? "glass-light text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent"
          )}
        >
          {markReadMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck className="w-4 h-4" />
          )}
          Tanda Semua Dibaca
        </button>
      </motion.div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-20 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 bg-white/10 rounded" />
                <div className="h-2 w-1/4 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertOctagon className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan notifikasi</p>
          <p className="text-sm text-white/50 mt-1">{(error as Error)?.message}</p>
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 md:p-16 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#14B8A6]/15 to-[#0F4C81]/15 border border-white/10 flex items-center justify-center mb-5">
            <Inbox className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">Tiada Notifikasi</h3>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            Anda belum menerima sebarang notifikasi. Notifikasi akan muncul di sini apabila
            terdapat kemas kini mengenai permohonan tempahan anda.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto custom-scrollbar pr-1">
          {notifications.map((notif, i) => {
            const cfg = getTypeConfig(notif.type)
            const Icon = cfg.icon
            return (
              <motion.button
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "w-full text-left glass-card glass-card-hover p-4 border-l-4 flex items-start gap-3 group",
                  cfg.border,
                  !notif.isRead && "bg-white/[0.07]"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    cfg.iconBg
                  )}
                >
                  <Icon className={cn("w-5 h-5", cfg.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        notif.isRead ? "text-white/70" : "text-white font-medium"
                      )}
                    >
                      {notif.message}
                    </p>
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] flex-shrink-0 mt-1.5 animate-pulse" />
                    )}
                  </div>

                  {notif.booking && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                        {notif.booking.facility?.name || "Fasiliti"}
                      </span>
                      <span className="truncate">· {notif.booking.title}</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{formatDateTime(notif.createdAt)}</span>
                    {notif.isRead ? (
                      <span className="inline-flex items-center gap-1 text-white/40 ml-auto">
                        <MailOpen className="w-3 h-3" />
                        Dibaca
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#14B8A6] ml-auto">
                        <Mail className="w-3 h-3" />
                        Belum Dibaca
                      </span>
                    )}
                  </div>
                </div>

                {notif.bookingId && (
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
