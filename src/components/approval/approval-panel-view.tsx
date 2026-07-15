"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/common/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Check,
  X,
  Clock,
  Users,
  Building2,
  FileText,
  ClipboardList,
  Pause,
  Loader2,
  Inbox,
  AlertCircle,
  CalendarDays,
  User,
  ChevronRight,
} from "lucide-react"
import {
  cn,
  formatDate,
  formatTimeRange,
} from "@/lib/utils"

// ---------- Types ----------
interface ApprovalBooking {
  id: string
  title: string
  startTime: string
  endTime: string
  attendeesCount: number
  status: string
  purposeNotes: string
  createdAt: string
  facility: {
    id: string
    name: string
    category: string
    location: string
    capacity: number
  }
  user: {
    id: string
    fullName: string
    email: string
    department: string
  }
}

type ReviewAction = "approved" | "kiv" | "rejected"

// ---------- Fetcher ----------
async function fetchBookings(scope: "managed" | "all", status: "pending" | "kiv"): Promise<ApprovalBooking[]> {
  const res = await fetch(`/api/bookings?scope=${scope}&status=${status}`)
  if (!res.ok) throw new Error("Gagal memuatkan senarai tempahan")
  return res.json()
}

// ---------- Action mutation ----------
async function patchBookingStatus(id: string, payload: { status: ReviewAction; reviewNotes: string }) {
  const res = await fetch(`/api/bookings/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || "Gagal mengemaskini status tempahan")
  }
  return data
}

// ---------- Action config ----------
const actionConfig: Record<
  ReviewAction,
  { label: string; title: string; description: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  approved: {
    label: "Lulus",
    title: "Luluskan Tempahan",
    description: "Tempahan akan diluluskan dan pengguna akan dimaklumkan. Catatan ini akan dipaparkan kepada pemohon.",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25",
    icon: Check,
  },
  kiv: {
    label: "KIV",
    title: "Tandakan KIV",
    description: "Tempahan akan ditandakan KIV (Kekal Dalam Tindakan). Sila nyatakan sebab dan maklumat lanjut untuk pemohon.",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25",
    icon: Pause,
  },
  rejected: {
    label: "Tolak",
    title: "Tolak Tempahan",
    description: "Tempahan akan ditolak. Sebab penolakan WAJIB diisi dan akan dipaparkan kepada pemohon.",
    color: "bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25",
    icon: X,
  },
}

// ---------- Stat Pill ----------
function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="glass-light rounded-xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accent)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-white/50 font-medium">{label}</p>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ---------- Booking Card ----------
function BookingCard({
  booking,
  index,
  onAction,
}: {
  booking: ApprovalBooking
  index: number
  onAction: (booking: ApprovalBooking, action: ReviewAction) => void
}) {
  const { viewBooking } = useAppStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      className="glass-card glass-card-hover p-4 md:p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => viewBooking(booking.id)}
          className="text-left group min-w-0 flex-1"
        >
          <h3 className="text-base md:text-lg font-semibold text-white group-hover:text-[#14B8A6] transition-colors line-clamp-1">
            {booking.title}
          </h3>
          <p className="text-sm text-white/60 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{booking.facility.name}</span>
            <span className="text-white/30">·</span>
            <span className="truncate text-white/40">{booking.facility.location}</span>
          </p>
        </button>
        <StatusBadge status={booking.status} />
      </div>

      {/* Meta info */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="glass-light rounded-lg px-3 py-2">
          <p className="text-white/40 uppercase tracking-wider text-[10px] mb-0.5">Pemohon</p>
          <p className="text-white font-medium truncate flex items-center gap-1">
            <User className="w-3 h-3 text-white/40 flex-shrink-0" />
            <span className="truncate">{booking.user.fullName}</span>
          </p>
          <p className="text-white/40 truncate mt-0.5">{booking.user.department}</p>
        </div>
        <div className="glass-light rounded-lg px-3 py-2">
          <p className="text-white/40 uppercase tracking-wider text-[10px] mb-0.5">Tarikh & Masa</p>
          <p className="text-white font-medium flex items-center gap-1">
            <CalendarDays className="w-3 h-3 text-white/40 flex-shrink-0" />
            <span className="truncate">{formatDate(booking.startTime, { day: "2-digit", month: "short" })}</span>
          </p>
          <p className="text-white/40 mt-0.5">{formatTimeRange(booking.startTime, booking.endTime)}</p>
        </div>
        <div className="glass-light rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
          <p className="text-white/40 uppercase tracking-wider text-[10px] mb-0.5">Peserta</p>
          <p className="text-white font-medium flex items-center gap-1">
            <Users className="w-3 h-3 text-white/40 flex-shrink-0" />
            <span>{booking.attendeesCount}</span>
            <span className="text-white/40">/ {booking.facility.capacity}</span>
          </p>
          <p className="text-white/40 mt-0.5">orang</p>
        </div>
      </div>

      {/* Purpose */}
      <div className="mt-3 glass-light rounded-lg px-3 py-2.5">
        <p className="text-white/40 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          Tujuan
        </p>
        <p className="text-sm text-white/80 line-clamp-2 leading-snug">{booking.purposeNotes}</p>
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => onAction(booking, "approved")}
          className={cn(
            "border bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25 hover:text-emerald-300",
            "h-9 px-3 text-xs font-medium gap-1.5"
          )}
          variant="outline"
        >
          <Check className="w-3.5 h-3.5" />
          Lulus
        </Button>
        <Button
          onClick={() => onAction(booking, "kiv")}
          className={cn(
            "border bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25 hover:text-amber-300",
            "h-9 px-3 text-xs font-medium gap-1.5"
          )}
          variant="outline"
        >
          <Pause className="w-3.5 h-3.5" />
          KIV
        </Button>
        <Button
          onClick={() => onAction(booking, "rejected")}
          className={cn(
            "border bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25 hover:text-red-300",
            "h-9 px-3 text-xs font-medium gap-1.5"
          )}
          variant="outline"
        >
          <X className="w-3.5 h-3.5" />
          Tolak
        </Button>
        <button
          onClick={() => viewBooking(booking.id)}
          className="ml-auto inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors px-2 h-9"
        >
          Butiran
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ---------- Loading skeleton ----------
function BookingCardSkeleton() {
  return (
    <div className="glass-card p-4 md:p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-2/3 bg-white/10 rounded" />
          <div className="h-3 w-1/2 bg-white/5 rounded" />
        </div>
        <div className="h-6 w-24 bg-white/10 rounded-full" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-light rounded-lg px-3 py-2 h-16" />
        ))}
      </div>
      <div className="mt-3 glass-light rounded-lg px-3 py-2.5 h-12" />
      <div className="mt-4 flex gap-2">
        <div className="h-9 w-20 bg-white/10 rounded" />
        <div className="h-9 w-20 bg-white/10 rounded" />
        <div className="h-9 w-20 bg-white/10 rounded" />
      </div>
    </div>
  )
}

// ---------- Empty state ----------
function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-12 md:p-16 text-center"
    >
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#14B8A6]/15 to-[#0F4C81]/15 border border-white/10 flex items-center justify-center mb-5">
        <Inbox className="w-10 h-10 text-white/30" />
      </div>
      <h3 className="text-lg font-semibold text-white/90">Senarai Kosong</h3>
      <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">{message}</p>
    </motion.div>
  )
}

// ---------- Main View ----------
export function ApprovalPanelView() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"pending" | "kiv">("pending")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogBooking, setDialogBooking] = useState<ApprovalBooking | null>(null)
  const [dialogAction, setDialogAction] = useState<ReviewAction | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")

  const role = session?.user?.role
  const scope: "managed" | "all" = role === "admin" ? "all" : "managed"

  const pendingQuery = useQuery({
    queryKey: ["approval-bookings", scope, "pending"],
    queryFn: () => fetchBookings(scope, "pending"),
    refetchInterval: 30000,
  })

  const kivQuery = useQuery({
    queryKey: ["approval-bookings", scope, "kiv"],
    queryFn: () => fetchBookings(scope, "kiv"),
    refetchInterval: 30000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: ReviewAction; reviewNotes: string } }) =>
      patchBookingStatus(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approval-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })

      const actionLabel = actionConfig[variables.payload.status].label
      toast({
        title: "Berjaya",
        description: `Tempahan telah ${actionLabel.toLowerCase()}. Pemohon akan dimaklumkan.`,
      })
      setDialogOpen(false)
      setDialogBooking(null)
      setDialogAction(null)
      setReviewNotes("")
    },
    onError: (err: Error) => {
      toast({
        title: "Ralat",
        description: err.message || "Tidak dapat mengemaskini status tempahan.",
        variant: "destructive",
      })
    },
  })

  const openActionDialog = (booking: ApprovalBooking, action: ReviewAction) => {
    setDialogBooking(booking)
    setDialogAction(action)
    setReviewNotes("")
    setDialogOpen(true)
  }

  const handleConfirmAction = () => {
    if (!dialogBooking || !dialogAction) return

    const trimmed = reviewNotes.trim()
    if (dialogAction === "rejected" && !trimmed) {
      toast({
        title: "Pengesahan Diperlukan",
        description: "Sebab penolakan wajib diisi.",
        variant: "destructive",
      })
      return
    }
    if (trimmed.length < 3) {
      toast({
        title: "Pengesahan Diperlukan",
        description: "Catatan sekurang-kurangnya 3 aksara.",
        variant: "destructive",
      })
      return
    }

    statusMutation.mutate({
      id: dialogBooking.id,
      payload: { status: dialogAction, reviewNotes: trimmed },
    })
  }

  const handleDialogChange = (open: boolean) => {
    if (!open && !statusMutation.isPending) {
      setDialogOpen(false)
      setDialogBooking(null)
      setDialogAction(null)
      setReviewNotes("")
    } else if (open) {
      setDialogOpen(true)
    }
  }

  const pendingCount = pendingQuery.data?.length || 0
  const kivCount = kivQuery.data?.length || 0
  const activeList = activeTab === "pending" ? pendingQuery.data || [] : kivQuery.data || []
  const activeQuery = activeTab === "pending" ? pendingQuery : kivQuery
  const isLoading = activeQuery.isLoading
  const isError = activeQuery.isError
  const error = activeQuery.error as Error | null

  const cfg = dialogAction ? actionConfig[dialogAction] : null
  const ActionIcon = cfg?.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 md:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-[#14B8A6]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Panel Kelulusan</h2>
              <p className="text-sm text-white/60">
                {role === "admin" ? "Semua tempahan menunggu tindakan" : "Tempahan fasiliti yang anda urus"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill
              icon={Clock}
              label="Menunggu"
              value={pendingCount}
              accent="bg-white/10 text-white"
            />
            <StatPill
              icon={Pause}
              label="KIV"
              value={kivCount}
              accent="bg-amber-500/15 text-amber-400"
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "kiv")}>
        <TabsList className="glass-light border border-white/10 p-1 h-auto">
          <TabsTrigger
            value="pending"
            className={cn(
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#14B8A6] data-[state=active]:to-[#0F4C81] data-[state=active]:text-white",
              "px-4 py-2 text-sm font-medium gap-2"
            )}
          >
            <Clock className="w-4 h-4" />
            Menunggu Kelulusan
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="kiv"
            className={cn(
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-700 data-[state=active]:text-white",
              "px-4 py-2 text-sm font-medium gap-2"
            )}
          >
            <Pause className="w-4 h-4" />
            KIV
            {kivCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                {kivCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending tab */}
        <TabsContent value="pending" className="mt-4">
          {renderList(pendingQuery, "Tiada tempahan menunggu kelulusan. Semua permohonan telah diuruskan.")}
        </TabsContent>

        {/* KIV tab */}
        <TabsContent value="kiv" className="mt-4">
          {renderList(kivQuery, "Tiada tempahan ditandakan KIV.")}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {ActionIcon && (
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    dialogAction === "approved" && "bg-emerald-500/15 text-emerald-400",
                    dialogAction === "kiv" && "bg-amber-500/15 text-amber-400",
                    dialogAction === "rejected" && "bg-red-500/15 text-red-400"
                  )}
                >
                  <ActionIcon className="w-4 h-4" />
                </div>
              )}
              {cfg?.title}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {cfg?.description}
            </DialogDescription>
          </DialogHeader>

          {dialogBooking && (
            <div className="glass-light rounded-lg p-3 space-y-1.5 border border-white/10">
              <p className="text-sm font-semibold text-white line-clamp-1">{dialogBooking.title}</p>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{dialogBooking.facility.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <User className="w-3 h-3" />
                <span className="truncate">{dialogBooking.user.fullName}</span>
                <span className="text-white/30">·</span>
                <span className="truncate">{dialogBooking.user.department}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <CalendarDays className="w-3 h-3" />
                <span>{formatDate(dialogBooking.startTime, { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="text-white/30">·</span>
                <span>{formatTimeRange(dialogBooking.startTime, dialogBooking.endTime)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Catatan Ulasan
              {dialogAction === "rejected" && <span className="text-red-400 ml-1">*</span>}
            </label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                dialogAction === "rejected"
                  ? "Nyatakan sebab penolakan secara terperinci..."
                  : dialogAction === "kiv"
                  ? "Nyatakan sebab KIV dan maklumat lanjut untuk pemohon..."
                  : "Catatan untuk pemohon (pilihan)..."
              }
              rows={4}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 resize-none focus:border-[#14B8A6]/50"
              maxLength={500}
            />
            <p className="text-[11px] text-white/40 text-right">{reviewNotes.length}/500</p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={statusMutation.isPending}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={statusMutation.isPending}
              className={cn(
                "text-white border",
                dialogAction === "approved" && "bg-emerald-600 hover:bg-emerald-700 border-emerald-500",
                dialogAction === "kiv" && "bg-amber-600 hover:bg-amber-700 border-amber-500",
                dialogAction === "rejected" && "bg-red-600 hover:bg-red-700 border-red-500"
              )}
            >
              {statusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  {ActionIcon && <ActionIcon className="w-4 h-4 mr-1.5" />}
                  Sahkan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // ---------- Helper render ----------
  function renderList(
    query: ReturnType<typeof useQuery<ApprovalBooking[]>>,
    emptyMessage: string
  ) {
    if (query.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      )
    }
    if (query.isError) {
      return (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan tempahan</p>
          <p className="text-sm text-white/50 mt-1">{(query.error as Error)?.message}</p>
          <Button
            variant="outline"
            onClick={() => query.refetch()}
            className="mt-4 border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cuba Semula
          </Button>
        </div>
      )
    }
    const list = query.data || []
    if (list.length === 0) return <EmptyState message={emptyMessage} />
    return (
      <AnimatePresence mode="popLayout">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          {list.map((booking, i) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              index={i}
              onAction={openActionDialog}
            />
          ))}
        </div>
      </AnimatePresence>
    )
  }
}
