"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/common/status-badge"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  FileText,
  Link2,
  User,
  Mail,
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  Pause,
  Ban,
  Loader2,
  AlertCircle,
  History,
  MessageSquare,
  ShieldCheck,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  cn,
  formatDate,
  formatDateTime,
  formatTimeRange,
  getRoleLabel,
  getStatusLabel,
} from "@/lib/utils"

// ---------- Types ----------
interface BookingDetail {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  attendeesCount: number
  purposeNotes: string
  attachmentUrl: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  facility: {
    id: string
    name: string
    category: string
    location: string
    capacity: number
    managerId?: string
  }
  user: {
    id: string
    fullName: string
    email: string
    department: string
    phoneNumber?: string | null
  }
  reviewer?: { id: string; fullName: string } | null
  statusHistory: {
    id: string
    oldStatus: string | null
    newStatus: string
    notes: string | null
    changedAt: string
    changedByUser: { id: string; fullName: string }
  }[]
}

// ---------- Component ----------
export function BookingDetailView() {
  const { data: session } = useSession()
  const { selectedBookingId, setView, viewBooking } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approved" | "kiv" | "rejected" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")

  const { data: booking, isLoading, isError, error } = useQuery<BookingDetail>({
    queryKey: ["booking", selectedBookingId],
    queryFn: async () => {
      if (!selectedBookingId) throw new Error("Tiada tempahan dipilih")
      const res = await fetch(`/api/bookings/${selectedBookingId}`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Gagal memuatkan butiran tempahan")
      }
      return res.json()
    },
    enabled: !!selectedBookingId,
  })

  // Reset dialog state when booking changes
  useEffect(() => {
    setCancelReason("")
    setReviewNotes("")
    setReviewAction(null)
    setCancelOpen(false)
    setReviewOpen(false)
  }, [selectedBookingId])

  // ---------- Mutations ----------
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const reason = encodeURIComponent(cancelReason.trim() || "Dibatalkan oleh pemohon")
      const res = await fetch(
        `/api/bookings/${selectedBookingId}?reason=${reason}`,
        { method: "DELETE" }
      )
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || "Gagal membatalkan tempahan")
      return d
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["booking", selectedBookingId] })
      queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast({
        title: "Tempahan Dibatalkan",
        description: "Tempahan anda telah berjaya dibatalkan.",
      })
      setCancelOpen(false)
      setCancelReason("")
    },
    onError: (err: Error) => {
      toast({
        title: "Ralat",
        description: err.message,
        variant: "destructive",
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (payload: {
      status: "approved" | "kiv" | "rejected"
      reviewNotes: string
    }) => {
      const res = await fetch(`/api/bookings/${selectedBookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || "Gagal mengemas kini status")
      return d
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["booking", selectedBookingId] })
      queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast({
        title:
          vars.status === "approved"
            ? "Tempahan Diluluskan"
            : vars.status === "kiv"
              ? "Tempahan Ditanda KIV"
              : "Tempahan Ditolak",
        description:
          vars.status === "approved"
            ? "Pemohon akan dimaklumkan melalui notifikasi."
            : vars.status === "kiv"
              ? "Pemohon akan dimaklumkan untuk tindakan susulan."
              : "Pemohon akan dimaklumkan mengenai penolakan.",
      })
      setReviewOpen(false)
      setReviewNotes("")
      setReviewAction(null)
    },
    onError: (err: Error) => {
      toast({
        title: "Ralat",
        description: err.message,
        variant: "destructive",
      })
    },
  })

  // ---------- Permissions ----------
  const currentUser = session?.user
  const isOwner = currentUser?.id === booking?.user?.id
  const isManager = currentUser?.role === "manager"
  const isAdmin = currentUser?.role === "admin"
  const canCancel =
    isOwner &&
    booking &&
    ["pending", "approved", "kiv"].includes(booking.status)
  // Manager can act if they own the facility OR admin
  const canReview =
    booking &&
    (isAdmin ||
      (isManager && booking.facility?.managerId === currentUser?.id)) &&
    ["pending", "kiv"].includes(booking.status)

  // ---------- Render ----------
  if (!selectedBookingId) {
    return (
      <div className="glass-card p-10 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-white/30 mb-3" />
        <p className="text-white/80 font-medium">Tiada tempahan dipilih</p>
        <Button
          onClick={() => setView("my-bookings")}
          variant="outline"
          className="mt-4 glass-light border-white/15 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Senarai
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="glass-card p-5 h-20 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-6 h-64 animate-pulse" />
            <div className="glass-card p-6 h-48 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="glass-card p-6 h-48 animate-pulse" />
            <div className="glass-card p-6 h-32 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="glass-card p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-white/80 font-medium">Ralat memuatkan butiran</p>
        <p className="text-sm text-white/50 mt-1">
          {(error as Error)?.message || "Tempahan tidak dijumpai"}
        </p>
        <Button
          onClick={() => setView("my-bookings")}
          variant="outline"
          className="mt-4 glass-light border-white/15 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
      </div>
    )
  }

  const startDate = new Date(booking.startTime)
  const endDate = new Date(booking.endTime)
  const isPast = endDate.getTime() < Date.now()

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 md:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setView("my-bookings")}
              aria-label="Kembali"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg glass-light text-white/80 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <StatusBadge status={booking.status} className="text-sm px-3 py-1.5" />
                {isPast && booking.status === "approved" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-white/40 border border-white/10">
                    Selesai
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-white/60 border border-white/10">
                  <Tag className="w-3 h-3" />
                  {booking.facility?.category || "—"}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {booking.title}
              </h2>
              <p className="text-xs text-white/50 mt-1">
                Dicipta pada {formatDateTime(booking.createdAt)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {canCancel && (
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="glass-light border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                  >
                    <Ban className="w-4 h-4" />
                    Batal Tempahan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-strong border-white/20 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">
                      Batal Tempahan?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      Tindakan ini tidak boleh diundur. Tempahan{" "}
                      <span className="text-white font-medium">"{booking.title}"</span>{" "}
                      akan ditandai sebagai dibatalkan. Sila nyatakan sebab pembatalan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="cancelReason" className="text-white/80">
                      Sebab Pembatalan
                    </Label>
                    <Textarea
                      id="cancelReason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Cth: Tidak diperlukan lagi, jadual berubah..."
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/40 min-h-[80px]"
                      maxLength={500}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="glass-light border-white/15 text-white hover:bg-white/10">
                      Tutup
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                      Sahkan Batal
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canReview && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    setReviewAction("approved")
                    setReviewOpen(true)
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Lulus
                </Button>
                <Button
                  onClick={() => {
                    setReviewAction("kiv")
                    setReviewOpen(true)
                  }}
                  variant="outline"
                  className="bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                >
                  <Pause className="w-4 h-4" />
                  KIV
                </Button>
                <Button
                  onClick={() => {
                    setReviewAction("rejected")
                    setReviewOpen(true)
                  }}
                  variant="outline"
                  className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                >
                  <XCircle className="w-4 h-4" />
                  Tolak
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Booking details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-5 md:p-6"
          >
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#14B8A6]" />
              Maklumat Tempahan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                icon={<Calendar className="w-4 h-4 text-[#14B8A6]" />}
                label="Tarikh"
                value={formatDate(startDate)}
              />
              <InfoRow
                icon={<Clock className="w-4 h-4 text-[#14B8A6]" />}
                label="Masa"
                value={formatTimeRange(startDate, endDate)}
              />
              <InfoRow
                icon={<Users className="w-4 h-4 text-[#14B8A6]" />}
                label="Bilangan Peserta"
                value={`${booking.attendeesCount} orang`}
                hint={
                  booking.attendeesCount > booking.facility?.capacity
                    ? `Melebihi kapasiti (${booking.facility?.capacity})`
                    : `Kapasiti: ${booking.facility?.capacity}`
                }
                hintType={
                  booking.attendeesCount > booking.facility?.capacity
                    ? "warning"
                    : "default"
                }
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4 text-[#14B8A6]" />}
                label="Fasiliti"
                value={booking.facility?.name || "—"}
                hint={`${booking.facility?.location || ""} · ${booking.facility?.category || ""}`}
              />
            </div>

            {/* Purpose notes */}
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                Tujuan / Catatan
              </p>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {booking.purposeNotes || "Tiada catatan"}
              </p>
            </div>

            {/* Attachment */}
            {booking.attachmentUrl && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                  Lampiran
                </p>
                <a
                  href={booking.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg glass-light text-[#14B8A6] hover:bg-white/10 transition-all text-sm break-all"
                >
                  <Link2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{booking.attachmentUrl}</span>
                </a>
              </div>
            )}
          </motion.div>

          {/* Status History Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5 md:p-6"
          >
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-[#14B8A6]" />
              Sejarah Status
            </h3>

            {booking.statusHistory?.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-4">
                Tiada sejarah status tersedia.
              </p>
            ) : (
              <ol className="relative space-y-4">
                {/* Vertical connecting line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10" />
                {booking.statusHistory?.map((h, i) => {
                  const isLast = i === booking.statusHistory.length - 1
                  return (
                    <li key={h.id} className="relative flex items-start gap-4 pl-0">
                      <div
                        className={cn(
                          "relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                          h.newStatus === "approved" &&
                            "bg-emerald-500/15 border-emerald-500/50",
                          h.newStatus === "pending" &&
                            "bg-gray-500/15 border-gray-500/50",
                          h.newStatus === "kiv" &&
                            "bg-amber-500/15 border-amber-500/50",
                          h.newStatus === "rejected" &&
                            "bg-red-500/15 border-red-500/50",
                          h.newStatus === "cancelled" &&
                            "bg-gray-500/15 border-gray-500/50",
                          h.newStatus === "draft" &&
                            "bg-blue-500/15 border-blue-500/50",
                          h.newStatus === "expired" &&
                            "bg-gray-500/15 border-gray-500/50"
                        )}
                      >
                        {h.newStatus === "approved" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {h.newStatus === "rejected" && (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        {h.newStatus === "kiv" && (
                          <Pause className="w-4 h-4 text-amber-400" />
                        )}
                        {h.newStatus === "cancelled" && (
                          <Ban className="w-4 h-4 text-gray-400" />
                        )}
                        {h.newStatus === "pending" && (
                          <Clock className="w-4 h-4 text-gray-300" />
                        )}
                        {h.newStatus === "draft" && (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                        {h.newStatus === "expired" && (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white">
                            {h.oldStatus
                              ? `${getStatusLabel(h.oldStatus)} → ${getStatusLabel(h.newStatus)}`
                              : `Dicipta sebagai ${getStatusLabel(h.newStatus)}`}
                          </span>
                          {isLast && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#14B8A6]/15 text-[#14B8A6] border border-[#14B8A6]/30">
                              Terkini
                            </span>
                          )}
                        </div>
                        {h.notes && (
                          <p className="text-xs text-white/70 leading-relaxed mb-1">
                            {h.notes}
                          </p>
                        )}
                        <p className="text-[11px] text-white/40">
                          {formatDateTime(h.changedAt)} · oleh{" "}
                          <span className="text-white/60">
                            {h.changedByUser?.fullName || "Tidak diketahui"}
                          </span>
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </motion.div>
        </div>

        {/* Right column - Applicant & Reviewer */}
        <div className="space-y-6">
          {/* Applicant */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-5"
          >
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#14B8A6]" />
              Pemohon
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center text-white font-semibold text-lg border border-white/15">
                {booking.user?.fullName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {booking.user?.fullName}
                </p>
                <p className="text-xs text-white/50 truncate">{booking.user?.email}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <InfoRow
                icon={<Mail className="w-4 h-4 text-white/50" />}
                label="E-mel"
                value={booking.user?.email || "—"}
                compact
              />
              <InfoRow
                icon={<Building2 className="w-4 h-4 text-white/50" />}
                label="Jabatan"
                value={booking.user?.department || "—"}
                compact
              />
              <InfoRow
                icon={<Phone className="w-4 h-4 text-white/50" />}
                label="Telefon"
                value={booking.user?.phoneNumber || "—"}
                compact
              />
            </div>
          </motion.div>

          {/* Reviewer */}
          {booking.reviewer && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5"
            >
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
                Pengulas
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-[#0F4C81]/30 flex items-center justify-center text-white font-medium border border-white/15">
                  {booking.reviewer.fullName?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {booking.reviewer.fullName}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatDateTime(booking.reviewedAt || "")}
                  </p>
                </div>
              </div>
              {booking.reviewNotes && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Catatan Pengulas
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {booking.reviewNotes}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Quick summary card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-light p-4 rounded-xl"
          >
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
              Ringkasan
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">ID Tempahan</span>
                <span className="text-white/80 font-mono">
                  {booking.id.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Dicipta</span>
                <span className="text-white/80">
                  {formatDate(booking.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Dikemas kini</span>
                <span className="text-white/80">
                  {formatDate(booking.updatedAt)}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="glass-strong border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {reviewAction === "approved" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
              {reviewAction === "kiv" && (
                <Pause className="w-5 h-5 text-amber-400" />
              )}
              {reviewAction === "rejected" && (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              {reviewAction === "approved"
                ? "Luluskan Tempahan"
                : reviewAction === "kiv"
                  ? "Tandakan KIV"
                  : "Tolak Tempahan"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {reviewAction === "approved"
                ? "Tempahan akan diluluskan dan pemohon akan dimaklumkan."
                : reviewAction === "kiv"
                  ? "Tempahan akan ditanda KIV untuk tindakan susulan."
                  : "Tempahan akan ditolak. Sebab penolakan wajib diisi."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="reviewNotes" className="text-white/80">
              Catatan{" "}
              {reviewAction === "rejected" && (
                <span className="text-red-400">*</span>
              )}
            </Label>
            <Textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                reviewAction === "rejected"
                  ? "Nyatakan sebab penolakan..."
                  : "Catatan untuk pemohon..."
              }
              className="bg-white/5 border-white/15 text-white placeholder:text-white/40 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-white/40 text-right">
              {reviewNotes.length}/500
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewOpen(false)
                setReviewNotes("")
                setReviewAction(null)
              }}
              className="glass-light border-white/15 text-white hover:bg-white/10"
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!reviewAction) return
                if (reviewAction === "rejected" && !reviewNotes.trim()) {
                  toast({
                    title: "Catatan Diperlukan",
                    description: "Sila nyatakan sebab penolakan.",
                    variant: "destructive",
                  })
                  return
                }
                statusMutation.mutate({
                  status: reviewAction,
                  reviewNotes: reviewNotes.trim() || "Tiada catatan tambahan",
                })
              }}
              disabled={statusMutation.isPending}
              className={cn(
                reviewAction === "approved" &&
                  "bg-emerald-500 hover:bg-emerald-600 text-white",
                reviewAction === "kiv" &&
                  "bg-amber-500 hover:bg-amber-600 text-white",
                reviewAction === "rejected" &&
                  "bg-red-500 hover:bg-red-600 text-white"
              )}
            >
              {statusMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : reviewAction === "approved" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : reviewAction === "kiv" ? (
                <Pause className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Sahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Helper Components ----------
function InfoRow({
  icon,
  label,
  value,
  hint,
  hintType = "default",
  compact = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  hintType?: "default" | "warning"
  compact?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-white/50 uppercase tracking-wide",
            compact ? "text-[10px]" : "text-[11px]"
          )}
        >
          {label}
        </p>
        <p className="text-sm text-white font-medium break-words">{value}</p>
        {hint && (
          <p
            className={cn(
              "text-[11px] mt-0.5",
              hintType === "warning" ? "text-amber-400" : "text-white/40"
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
