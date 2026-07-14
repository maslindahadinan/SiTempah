"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  Building,
  MessagesSquare,
  MonitorCog,
  Presentation,
  MapPin,
  Users,
  Search,
  Plus,
  Pencil,
  Loader2,
  SearchX,
  AlertOctagon,
  ChevronRight,
  CheckCircle2,
  XCircle,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------- Types ----------
interface Manager {
  id: string
  fullName: string
  email: string
  department?: string | null
}

interface FacilityListItem {
  id: string
  name: string
  category: string
  capacity: number
  location: string
  description: string
  amenities: string // JSON string
  imageUrl: string | null
  managerId: string | null
  isActive: boolean
  operatingHours: string
  createdAt: string
  manager: Manager | null
  _count: { bookings: number }
}

// ---------- Category config ----------
const CATEGORIES = [
  "Bilik Mesyuarat",
  "Bilik Perbincangan",
  "Makmal",
  "Dewan Utama",
  "Bilik Seminar",
] as const

type CategoryIconProps = { className?: string }
type IconComponent = React.ComponentType<CategoryIconProps>

const categoryConfig: Record<
  string,
  {
    Icon: IconComponent
    gradient: string
    iconColor: string
    badgeBg: string
    badgeText: string
    label: string
  }
> = {
  "Bilik Mesyuarat": {
    Icon: Building2,
    gradient: "from-teal-500/30 to-cyan-600/30",
    iconColor: "text-teal-300",
    badgeBg: "bg-teal-500/15 border-teal-500/30",
    badgeText: "text-teal-300",
    label: "Bilik Mesyuarat",
  },
  "Bilik Perbincangan": {
    Icon: MessagesSquare,
    gradient: "from-sky-500/30 to-blue-600/30",
    iconColor: "text-sky-300",
    badgeBg: "bg-sky-500/15 border-sky-500/30",
    badgeText: "text-sky-300",
    label: "Bilik Perbincangan",
  },
  Makmal: {
    Icon: MonitorCog,
    gradient: "from-amber-500/30 to-orange-600/30",
    iconColor: "text-amber-300",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-300",
    label: "Makmal",
  },
  "Dewan Utama": {
    Icon: Building,
    gradient: "from-violet-500/30 to-purple-600/30",
    iconColor: "text-violet-300",
    badgeBg: "bg-violet-500/15 border-violet-500/30",
    badgeText: "text-violet-300",
    label: "Dewan Utama",
  },
  "Bilik Seminar": {
    Icon: Presentation,
    gradient: "from-rose-500/30 to-pink-600/30",
    iconColor: "text-rose-300",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    badgeText: "text-rose-300",
    label: "Bilik Seminar",
  },
}

function getCategoryConfig(category: string) {
  return categoryConfig[category] || categoryConfig["Bilik Mesyuarat"]
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

// ---------- Fetch ----------
async function fetchFacilities(params: {
  search: string
  category: string
}): Promise<FacilityListItem[]> {
  const qs = new URLSearchParams()
  if (params.search) qs.set("search", params.search)
  if (params.category && params.category !== "all")
    qs.set("category", params.category)
  const res = await fetch(`/api/facilities?${qs.toString()}`)
  if (!res.ok) throw new Error("Gagal memuatkan senarai fasiliti")
  return res.json()
}

// ---------- Facility Card ----------
function FacilityCard({
  facility,
  index,
  onOpen,
}: {
  facility: FacilityListItem
  index: number
  onOpen: () => void
}) {
  const cfg = getCategoryConfig(facility.category)
  const Icon = cfg.Icon
  const amenities = parseAmenities(facility.amenities)

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      onClick={onOpen}
      className="group text-left glass-card glass-card-hover p-5 relative overflow-hidden flex flex-col h-full"
      aria-label={`Lihat detail ${facility.name}`}
    >
      {/* Decorative gradient blob */}
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-40 pointer-events-none transition-opacity group-hover:opacity-70",
          cfg.gradient
        )}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br border border-white/10 flex items-center justify-center flex-shrink-0",
            cfg.gradient
          )}
        >
          <Icon className={cn("w-6 h-6", cfg.iconColor)} />
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
              cfg.badgeBg,
              cfg.badgeText
            )}
          >
            {cfg.label}
          </span>
          {facility.isActive ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80">
              <CheckCircle2 className="w-3 h-3" />
              Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-300/80">
              <XCircle className="w-3 h-3" />
              Tidak Aktif
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="relative text-base md:text-lg font-semibold text-white leading-snug line-clamp-2">
        {facility.name}
      </h3>

      {/* Location */}
      <div className="relative flex items-center gap-1.5 text-sm text-white/60 mt-1.5">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{facility.location}</span>
      </div>

      {/* Capacity + bookings */}
      <div className="relative flex items-center gap-4 mt-3 text-xs">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg glass-light text-white/70">
          <Users className="w-3.5 h-3.5 text-[#14B8A6]" />
          <span className="font-medium text-white">{facility.capacity}</span>
          orang
        </div>
        <div className="inline-flex items-center gap-1.5 text-white/50">
          <span className="font-medium text-white/70">
            {facility._count.bookings}
          </span>
          tempahan
        </div>
      </div>

      {/* Amenities (first 3) */}
      {amenities.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {amenities.slice(0, 3).map((a, i) => (
            <span
              key={`${a}-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/60"
            >
              {a}
            </span>
          ))}
          {amenities.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/40">
              +{amenities.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: manager + chevron */}
      <div className="relative mt-auto pt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-white/55">
          <UserCog className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
          <span className="truncate">
            {facility.manager?.fullName || "Tanpa pengurus"}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </motion.button>
  )
}

// ---------- Loading skeleton ----------
function FacilityCardSkeleton() {
  return (
    <div className="glass-card p-5 h-72 animate-pulse flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="w-20 h-5 rounded-full bg-white/10" />
      </div>
      <div className="h-5 w-3/4 bg-white/10 rounded" />
      <div className="h-4 w-1/2 bg-white/5 rounded mt-2" />
      <div className="flex gap-2 mt-4">
        <div className="h-7 w-20 bg-white/10 rounded-lg" />
        <div className="h-7 w-16 bg-white/5 rounded-lg" />
      </div>
      <div className="flex gap-1.5 mt-3">
        <div className="h-5 w-14 bg-white/5 rounded-md" />
        <div className="h-5 w-12 bg-white/5 rounded-md" />
        <div className="h-5 w-10 bg-white/5 rounded-md" />
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between">
        <div className="h-3 w-24 bg-white/5 rounded" />
        <div className="h-4 w-4 bg-white/10 rounded" />
      </div>
    </div>
  )
}

// ---------- MAIN ----------
export function FacilitiesView() {
  const { data: session } = useSession()
  const { viewFacility, editFacility } = useAppStore()
  const { toast } = useToast()

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")

  const isAdmin = session?.user?.role === "admin"

  // Debounced search - update the debounced value 350ms after search stops changing.
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["facilities", debouncedSearch, category],
    queryFn: () => fetchFacilities({ search: debouncedSearch, category }),
    enabled: !!session,
  })

  const facilities = data || []

  const handleClearFilters = () => {
    setSearch("")
    setCategory("all")
    toast({
      title: "Penapis dikosongkan",
      description: "Menampilkan semua fasiliti.",
    })
  }

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
            <Building2 className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Fasiliti
            </h2>
            <p className="text-sm text-white/60">
              {isFetching && !isLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Memuatkan...
                </span>
              ) : (
                <>
                  <span className="text-[#14B8A6] font-medium">
                    {facilities.length}
                  </span>{" "}
                  fasiliti tersenarai
                </>
              )}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => editFacility(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-opacity glow-accent"
          >
            <Plus className="w-4 h-4" />
            Tambah Fasiliti
          </button>
        )}
      </motion.div>

      {/* Search + filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-light p-4 rounded-2xl flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mengikut nama, lokasi atau penerangan..."
            className="pl-9 h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-[#14B8A6]/50"
            aria-label="Cari fasiliti"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs"
              aria-label="Kosongkan carian"
            >
              ✕
            </button>
          )}
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            className="w-full md:w-56 h-11 bg-white/5 border-white/15 text-white data-[placeholder]:text-white/40"
            aria-label="Tapis kategori"
          >
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d2847]/95 border-white/15 text-white">
            <SelectItem
              value="all"
              className="text-white focus:bg-white/10 focus:text-white"
            >
              Semua Kategori
            </SelectItem>
            {CATEGORIES.map((c) => {
              const cfg = getCategoryConfig(c)
              const Icon = cfg.Icon
              return (
                <SelectItem
                  key={c}
                  value={c}
                  className="text-white focus:bg-white/10 focus:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", cfg.iconColor)} />
                    {c}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <FacilityCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-10 md:p-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertOctagon className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan fasiliti</p>
          <p className="text-sm text-white/50 mt-1 mb-4">
            {(error as Error)?.message || "Sila cuba lagi."}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass-light hover:bg-white/10 transition-colors text-white"
          >
            <Loader2 className="w-4 h-4" />
            Cuba Semula
          </button>
        </div>
      ) : facilities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 md:p-16 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#14B8A6]/15 to-[#0F4C81]/15 border border-white/10 flex items-center justify-center mb-5">
            <SearchX className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">
            {search || category !== "all"
              ? "Tiada fasiliti dijumpai"
              : "Tiada Fasiliti Tersedia"}
          </h3>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            {search || category !== "all"
              ? "Cuba ubah kata kunci carian atau penapis kategori untuk melihat hasil lain."
              : "Belum ada fasiliti yang didaftarkan dalam sistem."}
          </p>
          {(search || category !== "all") && (
            <button
              onClick={handleClearFilters}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-opacity"
            >
              Kosongkan Penapis
            </button>
          )}
          {isAdmin && !search && category === "all" && (
            <button
              onClick={() => editFacility(null)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Tambah Fasiliti Pertama
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((facility, i) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              index={i}
              onOpen={() => viewFacility(facility.id)}
            />
          ))}
        </div>
      )}

      {/* Admin quick edit hint (only on results) */}
      {isAdmin && facilities.length > 0 && !isLoading && (
        <div className="text-center text-xs text-white/40">
          Klik pada mana-mana kad untuk melihat butiran penuh dan menguruskan
          fasiliti.
        </div>
      )}
    </div>
  )
}
