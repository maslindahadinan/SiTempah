"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  Building,
  MessagesSquare,
  MonitorCog,
  Presentation,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertOctagon,
  Save,
  X,
  Info,
  Tag,
  MapPin,
  Users,
  FileText,
  UserCog,
  Clock,
  ShieldCheck,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// ---------- Types ----------
interface Manager {
  id: string
  fullName: string
  email: string
  department?: string | null
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
}

interface FacilityFormValues {
  name: string
  category: string
  capacity: string // keep as string for input handling
  location: string
  description: string
  amenities: string[]
  managerId: string
  operatingHoursStart: string
  operatingHoursEnd: string
  operatingDays: number[]
  isActive: boolean
}

const CATEGORIES = [
  "Bilik Mesyuarat",
  "Bilik Perbincangan",
  "Makmal",
  "Dewan Utama",
  "Bilik Seminar",
] as const

const DAY_LABELS = [
  { idx: 0, label: "Ahad" },
  { idx: 1, label: "Isnin" },
  { idx: 2, label: "Selasa" },
  { idx: 3, label: "Rabu" },
  { idx: 4, label: "Khamis" },
  { idx: 5, label: "Jumaat" },
  { idx: 6, label: "Sabtu" },
]

const DEFAULT_FORM: FacilityFormValues = {
  name: "",
  category: "Bilik Mesyuarat",
  capacity: "10",
  location: "",
  description: "",
  amenities: [],
  managerId: "none",
  operatingHoursStart: "08:00",
  operatingHoursEnd: "17:00",
  operatingDays: [1, 2, 3, 4, 5],
  isActive: true,
}

// ---------- Category icons ----------
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Bilik Mesyuarat": Building2,
  "Bilik Perbincangan": MessagesSquare,
  Makmal: MonitorCog,
  "Dewan Utama": Building,
  "Bilik Seminar": Presentation,
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

// ---------- Fetchers ----------
async function fetchFacilityForEdit(id: string): Promise<FacilityDetail> {
  const res = await fetch(`/api/facilities/${id}`)
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || "Gagal memuatkan butiran fasiliti")
  }
  return res.json()
}

async function fetchManagers(): Promise<Manager[]> {
  const res = await fetch("/api/users?role=manager")
  if (!res.ok) throw new Error("Gagal memuatkan senarai pengurus")
  return res.json()
}

// ---------- Field wrapper ----------
function FieldRow({
  icon: Icon,
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  htmlFor?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-white/80 flex items-center gap-1.5"
      >
        <Icon className="w-3.5 h-3.5 text-[#14B8A6]" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
          <AlertOctagon className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ---------- MAIN ----------
export function FacilityFormView() {
  const { data: session } = useSession()
  const { editingFacilityId, setView, viewFacility } = useAppStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const isEditing = !!editingFacilityId
  const isAdmin = session?.user?.role === "admin"

  const [form, setForm] = useState<FacilityFormValues>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newAmenity, setNewAmenity] = useState("")

  // Fetch existing facility data when editing
  const facilityQuery = useQuery({
    queryKey: ["facility", editingFacilityId],
    queryFn: () => fetchFacilityForEdit(editingFacilityId as string),
    enabled: !!editingFacilityId,
  })

  // Fetch managers list (admin only)
  const managersQuery = useQuery({
    queryKey: ["users", "manager"],
    queryFn: fetchManagers,
    enabled: !!session && isAdmin,
  })

  // Prefill form when editing — using React's recommended "adjust state during
  // render" pattern for syncing with fetched data. We track the previously
  // loaded id and only update the form when a new/different facility data
  // arrives, which avoids both the cascading-render effect lint rule and the
  // need for a useEffect.
  const [prevLoadedId, setPrevLoadedId] = useState<string | null>(null)
  const loadedData = facilityQuery.data
  const loadedId = loadedData?.id

  if (isEditing && loadedData && loadedId && loadedId !== prevLoadedId) {
    setPrevLoadedId(loadedId)
    const f = loadedData
    const amenities = parseAmenities(f.amenities)
    const oh = parseOperatingHours(f.operatingHours)
    setForm({
      name: f.name,
      category: f.category,
      capacity: String(f.capacity),
      location: f.location,
      description: f.description,
      amenities,
      managerId: f.managerId || "none",
      operatingHoursStart: oh.start || "08:00",
      operatingHoursEnd: oh.end || "17:00",
      operatingDays: oh.days?.length ? oh.days : [1, 2, 3, 4, 5],
      isActive: f.isActive,
    })
  }

  // Reset tracker when switching from edit → create mode
  if (!isEditing && prevLoadedId !== null) {
    setPrevLoadedId(null)
  }

  // ---------- Validation ----------
  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = "Nama fasiliti diperlukan"
    else if (form.name.trim().length < 2)
      next.name = "Nama mesti sekurang-kurangnya 2 aksara"
    if (!form.category) next.category = "Kategori diperlukan"
    const cap = Number(form.capacity)
    if (!form.capacity || Number.isNaN(cap) || cap < 1)
      next.capacity = "Kapasiti mesti nombor positif (≥ 1)"
    if (cap > 10000) next.capacity = "Kapasiti nampaknya terlalu besar"
    if (!form.location.trim()) next.location = "Lokasi diperlukan"
    else if (form.location.trim().length < 2)
      next.location = "Lokasi mesti sekurang-kurangnya 2 aksara"
    if (!form.description.trim()) next.description = "Penerangan diperlukan"
    else if (form.description.trim().length < 5)
      next.description = "Penerangan mesti sekurang-kurangnya 5 aksara"
    if (form.operatingDays.length === 0)
      next.operatingDays = "Pilih sekurang-kurangnya satu hari beroperasi"
    if (
      form.operatingHoursStart &&
      form.operatingHoursEnd &&
      form.operatingHoursStart >= form.operatingHoursEnd
    ) {
      next.operatingHoursEnd = "Masa tamat mesti selepas masa mula"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // ---------- Mutation ----------
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        capacity: Number(form.capacity),
        location: form.location.trim(),
        description: form.description.trim(),
        amenities: form.amenities,
        managerId: form.managerId === "none" ? null : form.managerId,
        operatingHours: JSON.stringify({
          start: form.operatingHoursStart,
          end: form.operatingHoursEnd,
          days: form.operatingDays,
        }),
        isActive: form.isActive,
      }

      const url = isEditing
        ? `/api/facilities/${editingFacilityId}`
        : "/api/facilities"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error || "Gagal menyimpan fasiliti")
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] })
      queryClient.invalidateQueries({ queryKey: ["facility", editingFacilityId] })
      toast({
        title: isEditing ? "Fasiliti dikemas kini" : "Fasiliti dicipta",
        description: `${data.name} telah ${isEditing ? "dikemas kini" : "ditambah"} dengan jayanya.`,
      })
      // Navigate to detail if we have an id (POST returns facility, PUT returns facility)
      if (data?.id) {
        viewFacility(data.id)
      } else {
        setView("facilities")
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Ralat",
        description: err.message,
        variant: "destructive",
      })
    },
  })

  // ---------- Handlers ----------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast({
        title: "Sila semak borang",
        description: "Terdapat medan yang tidak lengkap atau tidak sah.",
        variant: "destructive",
      })
      return
    }
    submitMutation.mutate()
  }

  const handleAddAmenity = () => {
    const v = newAmenity.trim()
    if (!v) return
    if (form.amenities.some((a) => a.toLowerCase() === v.toLowerCase())) {
      toast({
        title: "Kemudahan wujud",
        description: `"${v}" sudah ada dalam senarai.`,
        variant: "destructive",
      })
      return
    }
    setForm((f) => ({ ...f, amenities: [...f.amenities, v] }))
    setNewAmenity("")
  }

  const handleRemoveAmenity = (idx: number) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.filter((_, i) => i !== idx),
    }))
  }

  const toggleDay = (dayIdx: number) => {
    setForm((f) => ({
      ...f,
      operatingDays: f.operatingDays.includes(dayIdx)
        ? f.operatingDays.filter((d) => d !== dayIdx)
        : [...f.operatingDays, dayIdx].sort(),
    }))
  }

  // ---------- Guards ----------
  if (!isAdmin) {
    return (
      <div className="glass-card p-10 md:p-16 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
          <AlertOctagon className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-white/80 font-medium">Akses Ditolak</p>
        <p className="text-sm text-white/50 mt-1 mb-4">
          Hanya Pentadbir boleh mencipta atau mengedit fasiliti.
        </p>
        <button
          onClick={() => setView("facilities")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Fasiliti
        </button>
      </div>
    )
  }

  if (isEditing && facilityQuery.isLoading) {
    return (
      <div className="space-y-6">
        <BackButton onClick={() => setView("facilities")} />
        <div className="glass-card p-6 h-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 h-96 animate-pulse" />
          <div className="glass-card p-6 h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  if (isEditing && facilityQuery.isError) {
    return (
      <div className="space-y-6">
        <BackButton onClick={() => setView("facilities")} />
        <div className="glass-card p-10 md:p-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertOctagon className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Tidak dapat memuatkan fasiliti</p>
          <p className="text-sm text-white/50 mt-1 mb-4">
            {(facilityQuery.error as Error)?.message}
          </p>
          <button
            onClick={() => setView("facilities")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>
    )
  }

  const SelectedCategoryIcon = categoryIcons[form.category] || Building2

  return (
    <div className="space-y-6">
      {/* Back button */}
      <BackButton onClick={() => setView("facilities")} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
            {isEditing ? (
              <Building2 className="w-6 h-6 text-[#14B8A6]" />
            ) : (
              <Plus className="w-6 h-6 text-[#14B8A6]" />
            )}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {isEditing ? "Edit Fasiliti" : "Tambah Fasiliti Baharu"}
            </h2>
            <p className="text-sm text-white/60 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
              {isEditing
                ? "Kemas kini butiran fasiliti sedia ada"
                : "Isikan borang di bawah untuk mendaftar fasiliti baharu"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light text-xs text-white/60">
          <SelectedCategoryIcon className="w-4 h-4 text-[#14B8A6]" />
          {form.category}
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 md:p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
              <Info className="w-4.5 h-4.5 text-[#14B8A6]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Maklumat Asas</h3>
              <p className="text-xs text-white/50">Butiran utama fasiliti</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FieldRow
                icon={Building2}
                label="Nama Fasiliti"
                htmlFor="name"
                required
                error={errors.name}
              >
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="cth. Bilik Mesyuarat Utama Tingkat 2"
                  className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-[#14B8A6]/50"
                  maxLength={120}
                />
              </FieldRow>
            </div>

            <FieldRow
              icon={Tag}
              label="Kategori"
              htmlFor="category"
              required
              error={errors.category}
            >
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger
                  id="category"
                  className="h-11 w-full bg-white/5 border-white/15 text-white data-[placeholder]:text-white/40"
                >
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d2847]/95 border-white/15 text-white">
                  {CATEGORIES.map((c) => {
                    const Icon = categoryIcons[c] || Building2
                    return (
                      <SelectItem
                        key={c}
                        value={c}
                        className="text-white focus:bg-white/10 focus:text-white"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="w-4 h-4 text-[#14B8A6]" />
                          {c}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              icon={Users}
              label="Kapasiti (orang)"
              htmlFor="capacity"
              required
              error={errors.capacity}
            >
              <Input
                id="capacity"
                type="number"
                min={1}
                max={10000}
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
                placeholder="cth. 30"
                className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-[#14B8A6]/50"
              />
            </FieldRow>

            <div className="md:col-span-2">
              <FieldRow
                icon={MapPin}
                label="Lokasi"
                htmlFor="location"
                required
                error={errors.location}
              >
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="cth. Blok A, Tingkat 2, Bilik 205"
                  className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-[#14B8A6]/50"
                  maxLength={200}
                />
              </FieldRow>
            </div>

            <div className="md:col-span-2">
              <FieldRow
                icon={FileText}
                label="Penerangan"
                htmlFor="description"
                required
                error={errors.description}
              >
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Terangkan fasiliti, ciri-ciri, dan tujuan penggunaan..."
                  rows={4}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-[#14B8A6]/50 resize-y min-h-24"
                  maxLength={1000}
                />
                <p className="text-[11px] text-white/40 text-right mt-1">
                  {form.description.length}/1000 aksara
                </p>
              </FieldRow>
            </div>
          </div>
        </motion.div>

        {/* Section 2: Amenities */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-5 md:p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
              <Tag className="w-4.5 h-4.5 text-[#14B8A6]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Kemudahan</h3>
              <p className="text-xs text-white/50">
                Tambah peralatan / kemudahan yang tersedia
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddAmenity()
                }
              }}
              placeholder="cth. Projektor, Papan Putih, Penyaman Udara"
              className="h-11 flex-1 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-[#14B8A6]/50"
              maxLength={80}
            />
            <button
              type="button"
              onClick={handleAddAmenity}
              disabled={!newAmenity.trim()}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap h-11",
                newAmenity.trim()
                  ? "bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90"
                  : "glass-light text-white/40 cursor-not-allowed"
              )}
            >
              <Plus className="w-4 h-4" />
              Tambah
            </button>
          </div>

          {form.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {form.amenities.map((a, i) => (
                <motion.span
                  key={`${a}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg glass-light text-sm text-white/80 group"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(i)}
                    className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-red-500/30 text-white/40 hover:text-red-200 transition-colors"
                    aria-label={`Buang ${a}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 italic mt-4">
              Tiada kemudahan ditambah lagi.
            </p>
          )}
        </motion.div>

        {/* Section 3: Manager + operating hours + status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 md:p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6]/25 to-[#0F4C81]/25 border border-white/10 flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5 text-[#14B8A6]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Pengurusan & Operasi</h3>
              <p className="text-xs text-white/50">
                Tetapkan pengurus, waktu operasi, dan status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manager */}
            <FieldRow
              icon={UserCog}
              label="Pengurus Fasiliti"
              htmlFor="managerId"
            >
              <Select
                value={form.managerId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, managerId: v }))
                }
              >
                <SelectTrigger
                  id="managerId"
                  className="h-11 w-full bg-white/5 border-white/15 text-white data-[placeholder]:text-white/40"
                >
                  <SelectValue placeholder="Pilih pengurus" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d2847]/95 border-white/15 text-white">
                  <SelectItem
                    value="none"
                    className="text-white focus:bg-white/10 focus:text-white"
                  >
                    <span className="italic text-white/50">
                      Tanpa pengurus
                    </span>
                  </SelectItem>
                  {managersQuery.isLoading ? (
                    <SelectItem value="_loading" disabled>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memuatkan...
                      </span>
                    </SelectItem>
                  ) : managersQuery.data?.length ? (
                    managersQuery.data.map((m) => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                        className="text-white focus:bg-white/10 focus:text-white"
                      >
                        <span className="flex flex-col">
                          <span>{m.fullName}</span>
                          <span className="text-[11px] text-white/50">
                            {m.department || m.email}
                          </span>
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none_available" disabled>
                      <span className="text-white/50 italic">
                        Tiada pengurus tersedia
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {managersQuery.isError && (
                <p className="text-xs text-amber-400 mt-1">
                  Tidak dapat memuatkan senarai pengurus
                </p>
              )}
            </FieldRow>

            {/* Status switch */}
            <div className="space-y-1.5">
              <Label className="text-white/80 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
                Status Fasiliti
              </Label>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl glass-light h-11">
                <span
                  className={cn(
                    "text-sm font-medium",
                    form.isActive ? "text-emerald-300" : "text-red-300"
                  )}
                >
                  {form.isActive ? "Aktif" : "Tidak Aktif"}
                </span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, isActive: c }))
                  }
                  aria-label="Togol status aktif"
                />
              </div>
              <p className="text-[11px] text-white/40">
                Fasiliti tidak aktif tidak boleh ditempah
              </p>
            </div>

            {/* Operating hours start */}
            <FieldRow
              icon={Clock}
              label="Waktu Mula Operasi"
              htmlFor="operatingHoursStart"
              error={errors.operatingHoursEnd ? "" : undefined}
            >
              <Input
                id="operatingHoursStart"
                type="time"
                value={form.operatingHoursStart}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    operatingHoursStart: e.target.value,
                  }))
                }
                className="h-11 bg-white/5 border-white/15 text-white focus-visible:border-[#14B8A6]/50"
              />
            </FieldRow>

            {/* Operating hours end */}
            <FieldRow
              icon={Clock}
              label="Waktu Tamat Operasi"
              htmlFor="operatingHoursEnd"
              error={errors.operatingHoursEnd}
            >
              <Input
                id="operatingHoursEnd"
                type="time"
                value={form.operatingHoursEnd}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    operatingHoursEnd: e.target.value,
                  }))
                }
                className="h-11 bg-white/5 border-white/15 text-white focus-visible:border-[#14B8A6]/50"
              />
            </FieldRow>

            {/* Operating days */}
            <div className="md:col-span-2">
              <Label className="text-white/80 flex items-center gap-1.5 mb-2">
                <CalendarDays className="w-3.5 h-3.5 text-[#14B8A6]" />
                Hari Beroperasi
                <span className="text-red-400">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {DAY_LABELS.map((d) => {
                  const active = form.operatingDays.includes(d.idx)
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      onClick={() => toggleDay(d.idx)}
                      className={cn(
                        "h-11 rounded-xl text-sm font-medium border transition-all",
                        active
                          ? "bg-[#14B8A6]/20 border-[#14B8A6]/40 text-[#14B8A6] glow-accent"
                          : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
                      )}
                      aria-pressed={active}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
              {errors.operatingDays && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertOctagon className="w-3 h-3" />
                  {errors.operatingDays}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-10"
        >
          <p className="text-xs text-white/50 text-center sm:text-left">
            {isEditing
              ? "Pastikan semua perubahan disahkan sebelum menyimpan."
              : "Semua medan bertanda * adalah wajib."}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setView("facilities")}
              disabled={submitMutation.isPending}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white/80"
            >
              <X className="w-4 h-4" />
              Batal
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className={cn(
                "flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                submitMutation.isPending
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent"
              )}
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? "Simpan Perubahan" : "Cipta Fasiliti"}
            </button>
          </div>
        </motion.div>
      </form>
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
      Kembali
    </button>
  )
}
