"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  MapPin,
  Link2,
  AlertCircle,
  Loader2,
  Save,
  Send,
  CheckCircle2,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, generateTimeSlots } from "@/lib/utils"

// ---------- Types ----------
interface Facility {
  id: string
  name: string
  category: string
  location: string
  capacity: number
  isActive: boolean
}

interface BookingPayload {
  facilityId: string
  title: string
  startTime: string // ISO
  endTime: string // ISO
  attendeesCount: number
  purposeNotes: string
  attachmentUrl?: string
  status: "draft" | "pending"
}

interface ConflictInfo {
  error: string
  conflicts?: {
    title: string
    startTime: string
    endTime: string
    status: string
  }[]
}

// ---------- Helpers ----------
const TIME_SLOTS = generateTimeSlots()

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function buildISO(dateStr: string, timeStr: string): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mm] = timeStr.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm, 0).toISOString()
}

function todayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---------- Component ----------
export function BookingFormView() {
  const {
    preselectedFacilityId,
    preselectedDate,
    viewBooking,
    setView,
  } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: facilities, isLoading: facilitiesLoading } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: async () => {
      const res = await fetch("/api/facilities?activeOnly=true")
      if (!res.ok) throw new Error("Gagal memuatkan fasiliti")
      return res.json()
    },
  })

  // Form state — initial values come from the store's preselection.
  // Because AppShell uses AnimatePresence with key=currentView, this component
  // is fully unmounted on view switch, so initial state is always fresh.
  const [facilityId, setFacilityId] = useState<string>(
    preselectedFacilityId || ""
  )
  const [title, setTitle] = useState("")
  const [date, setDate] = useState<string>(preselectedDate || "")
  const [startTime, setStartTime] = useState<string>("08:00")
  const [endTime, setEndTime] = useState<string>("09:00")
  const [attendeesCount, setAttendeesCount] = useState<string>("1")
  const [purposeNotes, setPurposeNotes] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const selectedFacility = useMemo(
    () => facilities?.find((f) => f.id === facilityId),
    [facilities, facilityId]
  )

  // ---------- Validation ----------
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!facilityId) e.facilityId = "Fasiliti diperlukan"
    if (!title.trim()) e.title = "Tajuk diperlukan"
    else if (title.trim().length < 3) e.title = "Tajuk terlalu pendek (min 3 aksara)"
    if (!date) e.date = "Tarikh diperlukan"
    else {
      const today = todayDateStr()
      if (date < today) e.date = "Tarikh tidak boleh lepas"
    }
    if (!startTime) e.startTime = "Masa mula diperlukan"
    if (!endTime) e.endTime = "Masa tamat diperlukan"
    if (startTime && endTime && startTime >= endTime) {
      e.endTime = "Masa tamat mesti selepas masa mula"
    }
    const att = parseInt(attendeesCount, 10)
    if (!attendeesCount || isNaN(att) || att < 1) {
      e.attendeesCount = "Bilangan peserta mesti sekurang-kurangnya 1"
    }
    if (selectedFacility && att > selectedFacility.capacity) {
      e.attendeesCount = `Melebihi kapasiti fasiliti (${selectedFacility.capacity} orang)`
    }
    if (!purposeNotes.trim()) e.purposeNotes = "Tujuan diperlukan"
    else if (purposeNotes.trim().length < 5)
      e.purposeNotes = "Tuhan terlalu pendek (min 5 aksara)"
    if (attachmentUrl) {
      try {
        new URL(attachmentUrl)
      } catch {
        e.attachmentUrl = "URL lampiran tidak sah"
      }
    }
    return e
  }, [
    facilityId,
    title,
    date,
    startTime,
    endTime,
    attendeesCount,
    purposeNotes,
    attachmentUrl,
    selectedFacility,
  ])

  const hasErrors = Object.keys(errors).length > 0
  const isCapacityWarning =
    selectedFacility &&
    parseInt(attendeesCount, 10) > 0 &&
    parseInt(attendeesCount, 10) > selectedFacility.capacity

  // ---------- Mutation ----------
  const createMutation = useMutation({
    mutationFn: async (payload: BookingPayload) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        const err: ConflictInfo = data
        const error = new Error(err.error || "Gagal mencipta tempahan") as Error & {
        status?: number
        conflicts?: ConflictInfo["conflicts"]
      }
        error.status = res.status
        error.conflicts = err.conflicts
        throw error
      }
      return data
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })

      toast({
        title:
          vars.status === "draft"
            ? "Draf Disimpan"
            : "Tempahan Dihantar",
        description:
          vars.status === "draft"
            ? "Draf tempahan telah disimpan. Anda boleh hantar untuk kelulusan kemudian."
            : "Permohonan tempahan telah dihantar untuk kelulusan.",
      })
      viewBooking(data.id)
    },
    onError: (err: Error & { status?: number; conflicts?: ConflictInfo["conflicts"] }) => {
      if (err.status === 409 && err.conflicts) {
        const list = err.conflicts
          .map(
            (c) =>
              `• ${c.title} (${c.startTime.split("T")[1]?.slice(0, 5) || ""}-${c.endTime.split("T")[1]?.slice(0, 5) || ""})`
          )
          .join("\n")
        setConflictError(
          `Pertindihan tempahan dikesan:\n${list}\n\nSila pilih slot masa lain.`
        )
      } else {
        setConflictError(err.message)
      }
      toast({
        title: "Ralat",
        description: err.message,
        variant: "destructive",
      })
    },
  })

  // ---------- Handlers ----------
  const handleSubmit = (asDraft: boolean) => {
    setTouched({
      facilityId: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      attendeesCount: true,
      purposeNotes: true,
      attachmentUrl: true,
    })
    setConflictError(null)
    if (hasErrors) {
      toast({
        title: "Sila Semak Borang",
        description: "Sila lengkapkan semua medan yang diperlukan dengan betul.",
        variant: "destructive",
      })
      return
    }
    const payload: BookingPayload = {
      facilityId,
      title: title.trim(),
      startTime: buildISO(date, startTime),
      endTime: buildISO(date, endTime),
      attendeesCount: parseInt(attendeesCount, 10),
      purposeNotes: purposeNotes.trim(),
      status: asDraft ? "draft" : "pending",
    }
    if (attachmentUrl.trim()) payload.attachmentUrl = attachmentUrl.trim()

    createMutation.mutate(payload)
  }

  const showError = (field: string) =>
    touched[field] && errors[field] ? errors[field] : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 md:p-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setView("calendar")}
            aria-label="Kembali"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg glass-light text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Borang Tempahan Baharu
            </h2>
            <p className="text-sm text-white/60">
              Lengkapkan maklumat di bawah untuk menempah fasiliti
            </p>
          </div>
        </div>
      </motion.div>

      {/* Conflict alert */}
      {conflictError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-4 border-l-4 border-l-red-500 bg-red-500/5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-300">
                Pertindihan Tempahan Dikesan
              </p>
              <pre className="mt-1 text-xs text-white/70 whitespace-pre-wrap font-sans">
                {conflictError}
              </pre>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-5 md:p-6 space-y-5"
      >
        {/* Facility */}
        <div className="space-y-1.5">
          <Label htmlFor="facility" className="text-white/80">
            <MapPin className="w-3.5 h-3.5 text-[#14B8A6]" />
            Fasiliti <span className="text-red-400">*</span>
          </Label>
          <Select
            value={facilityId}
            onValueChange={(v) => {
              setFacilityId(v)
              setTouched((t) => ({ ...t, facilityId: true }))
            }}
          >
            <SelectTrigger
              className={cn(
                "w-full bg-white/5 border-white/15 text-white",
                showError("facilityId") && "border-red-500/60"
              )}
            >
              <SelectValue
                placeholder={
                  facilitiesLoading ? "Memuatkan..." : "Pilih fasiliti"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {facilities?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="font-medium">{f.name}</span>
                  <span className="text-white/50 ml-2">
                    · {f.location} · {f.capacity} org
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showError("facilityId") && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.facilityId}
            </p>
          )}
          {selectedFacility && (
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <Users className="w-3 h-3" />
                Kapasiti: {selectedFacility.capacity} orang
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <MapPin className="w-3 h-3" />
                {selectedFacility.location}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <FileText className="w-3 h-3" />
                {selectedFacility.category}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-white/80">
            <FileText className="w-3.5 h-3.5 text-[#14B8A6]" />
            Tajuk Tempahan <span className="text-red-400">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            placeholder="Cth: Mesyuarat JPP"
            className={cn(
              "bg-white/5 border-white/15 text-white placeholder:text-white/40",
              showError("title") && "border-red-500/60"
            )}
            maxLength={200}
          />
          {showError("title") && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-white/80">
            <Calendar className="w-3.5 h-3.5 text-[#14B8A6]" />
            Tarikh <span className="text-red-400">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            min={todayDateStr()}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, date: true }))}
            className={cn(
              "bg-white/5 border-white/15 text-white [color-scheme:dark]",
              showError("date") && "border-red-500/60"
            )}
          />
          {showError("date") && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.date}
            </p>
          )}
        </div>

        {/* Time range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startTime" className="text-white/80">
              <Clock className="w-3.5 h-3.5 text-[#14B8A6]" />
              Masa Mula <span className="text-red-400">*</span>
            </Label>
            <Select
              value={startTime}
              onValueChange={(v) => {
                setStartTime(v)
                setTouched((t) => ({ ...t, startTime: true }))
                // Auto-adjust end time if it's now invalid
                if (endTime && v >= endTime) {
                  // Bump end to next slot
                  const idx = TIME_SLOTS.indexOf(v)
                  if (idx >= 0 && idx < TIME_SLOTS.length - 1) {
                    setEndTime(TIME_SLOTS[idx + 1])
                  }
                }
              }}
            >
              <SelectTrigger
                className={cn(
                  "w-full bg-white/5 border-white/15 text-white",
                  showError("startTime") && "border-red-500/60"
                )}
              >
                <SelectValue placeholder="Pilih masa mula" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError("startTime") && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.startTime}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endTime" className="text-white/80">
              <Clock className="w-3.5 h-3.5 text-[#14B8A6]" />
              Masa Tamat <span className="text-red-400">*</span>
            </Label>
            <Select
              value={endTime}
              onValueChange={(v) => {
                setEndTime(v)
                setTouched((t) => ({ ...t, endTime: true }))
              }}
            >
              <SelectTrigger
                className={cn(
                  "w-full bg-white/5 border-white/15 text-white",
                  showError("endTime") && "border-red-500/60"
                )}
              >
                <SelectValue placeholder="Pilih masa tamat" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => (
                  <SelectItem key={t} value={t} disabled={startTime ? t <= startTime : false}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError("endTime") && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.endTime}
              </p>
            )}
          </div>
        </div>

        {/* Attendees */}
        <div className="space-y-1.5">
          <Label htmlFor="attendeesCount" className="text-white/80">
            <Users className="w-3.5 h-3.5 text-[#14B8A6]" />
            Bilangan Peserta <span className="text-red-400">*</span>
          </Label>
          <Input
            id="attendeesCount"
            type="number"
            min={1}
            value={attendeesCount}
            onChange={(e) => setAttendeesCount(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, attendeesCount: true }))}
            placeholder="Cth: 25"
            className={cn(
              "bg-white/5 border-white/15 text-white placeholder:text-white/40 max-w-[200px]",
              showError("attendeesCount") && "border-red-500/60"
            )}
          />
          {showError("attendeesCount") ? (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.attendeesCount}
            </p>
          ) : isCapacityWarning ? (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Melebihi kapasiti fasiliti ({selectedFacility?.capacity} orang). Permohonan akan ditolak.
            </p>
          ) : selectedFacility ? (
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Kapasiti maksimum: {selectedFacility.capacity} orang
            </p>
          ) : null}
        </div>

        {/* Purpose Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="purposeNotes" className="text-white/80">
            <FileText className="w-3.5 h-3.5 text-[#14B8A6]" />
            Tujuan / Catatan <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="purposeNotes"
            value={purposeNotes}
            onChange={(e) => setPurposeNotes(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, purposeNotes: true }))}
            placeholder="Nyatakan tujuan tempahan, agenda, dll."
            className={cn(
              "bg-white/5 border-white/15 text-white placeholder:text-white/40 min-h-[100px]",
              showError("purposeNotes") && "border-red-500/60"
            )}
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            {showError("purposeNotes") ? (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.purposeNotes}
              </p>
            ) : (
              <span />
            )}
            <span className="text-xs text-white/40">
              {purposeNotes.length}/1000
            </span>
          </div>
        </div>

        {/* Attachment URL */}
        <div className="space-y-1.5">
          <Label htmlFor="attachmentUrl" className="text-white/80">
            <Link2 className="w-3.5 h-3.5 text-[#14B8A6]" />
            URL Lampiran (Pilihan)
          </Label>
          <Input
            id="attachmentUrl"
            type="url"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, attachmentUrl: true }))}
            placeholder="https://example.com/sokongan.pdf"
            className={cn(
              "bg-white/5 border-white/15 text-white placeholder:text-white/40",
              showError("attachmentUrl") && "border-red-500/60"
            )}
          />
          {showError("attachmentUrl") ? (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.attachmentUrl}
            </p>
          ) : (
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Lampirkan pautan dokumen sokongan jika ada (surat, jadual, dll.)
            </p>
          )}
        </div>
      </motion.div>

      {/* Action bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 md:p-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 sticky bottom-4 z-20"
      >
        <Button
          variant="ghost"
          onClick={() => setView("calendar")}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={createMutation.isPending}
          className="glass-light border-white/15 text-white hover:bg-white/10"
        >
          {createMutation.isPending && createMutation.variables?.status === "draft" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan sebagai Draf
        </Button>
        <Button
          onClick={() => handleSubmit(false)}
          disabled={createMutation.isPending}
          className="bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent"
        >
          {createMutation.isPending && createMutation.variables?.status !== "draft" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Hantar Untuk Kelulusan
        </Button>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-light p-4 rounded-xl flex items-start gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-[#14B8A6] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-white/70 leading-relaxed">
          <p className="font-medium text-white/90 mb-1">Maklumat</p>
          Permohonan akan dihantar kepada pengurus fasiliti untuk kelulusan. Anda akan
          menerima notifikasi apabila status dikemas kini. Jika anda menyimpan sebagai
          draf, anda boleh menghantarnya kemudian dari halaman butiran tempahan.
        </div>
      </motion.div>
    </div>
  )
}
