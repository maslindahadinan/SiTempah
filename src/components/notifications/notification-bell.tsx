"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck, X } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { formatRelativeTime } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

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

async function fetchNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const res = await fetch("/api/notifications")
  if (!res.ok) throw new Error("Failed to fetch notifications")
  return res.json()
}

const typeColors: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
}

const typeBorders: Record<string, string> = {
  info: "border-l-blue-500",
  success: "border-l-green-500",
  warning: "border-l-amber-500",
  danger: "border-l-red-500",
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { setView, viewBooking } = useAppStore()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to mark read")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.bookingId) {
      viewBooking(notif.bookingId)
      setOpen(false)
    }
  }

  const markAllRead = async () => {
    const unread = data?.notifications.filter((n) => !n.isRead) || []
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })))
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          setView("dashboard")
        }}
        className="relative w-10 h-10 rounded-xl glass-light flex items-center justify-center text-white/70 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {data && data.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 md:w-96 glass-strong rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Notifikasi</h3>
                <p className="text-xs text-white/50">{data?.unreadCount || 0} belum dibaca</p>
              </div>
              <div className="flex gap-2">
                {data && data.unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Tanda Semua Dibaca
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {data?.notifications.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tiada notifikasi</p>
                </div>
              ) : (
                data?.notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors border-l-2",
                      typeBorders[notif.type] || "border-l-blue-500",
                      !notif.isRead && "bg-white/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", typeColors[notif.type] || "bg-blue-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90">{notif.message}</p>
                        <p className="text-xs text-white/40 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 rounded-full bg-[#14B8A6] flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-2 border-t border-white/10">
              <button
                onClick={() => {
                  setView("notifications")
                  setOpen(false)
                }}
                className="w-full py-2 text-center text-sm text-[#14B8A6] hover:bg-white/5 rounded-lg transition-colors"
              >
                Lihat Semua Notifikasi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
