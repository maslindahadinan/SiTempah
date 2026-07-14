"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Users as UsersIcon,
  UserCog,
  Shield,
  User,
  Search,
  Plus,
  Pencil,
  Mail,
  Phone,
  Building2,
  Loader2,
  AlertCircle,
  Inbox,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn, getRoleLabel } from "@/lib/utils"

// ---------- Types ----------
interface UserRow {
  id: string
  email: string
  fullName: string
  department: string
  phoneNumber: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count?: {
    bookings: number
    managedFacilities: number
  }
}

type Role = "user" | "manager" | "admin"

interface UserFormState {
  fullName: string
  email: string
  department: string
  phoneNumber: string
  role: Role
  password: string
}

const emptyForm: UserFormState = {
  fullName: "",
  email: "",
  department: "",
  phoneNumber: "",
  role: "user",
  password: "",
}

// ---------- Fetchers ----------
async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch("/api/users")
  if (!res.ok) throw new Error("Gagal memuatkan senarai pengguna")
  return res.json()
}

async function createUser(payload: UserFormState) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || "Gagal mencipta pengguna")
  return data
}

async function updateUser(id: string, payload: Partial<UserFormState> & { isActive?: boolean }) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || "Gagal mengemas kini pengguna")
  return data
}

async function deactivateUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || "Gagal menyahaktifkan pengguna")
  return data
}

// ---------- Role badge ----------
function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
    admin: {
      bg: "bg-red-500/15 border-red-500/30",
      text: "text-red-400",
      icon: Shield,
    },
    manager: {
      bg: "bg-amber-500/15 border-amber-500/30",
      text: "text-amber-400",
      icon: UserCog,
    },
    user: {
      bg: "bg-blue-500/15 border-blue-500/30",
      text: "text-blue-400",
      icon: User,
    },
  }
  const c = cfg[role] || cfg.user
  const Icon = c.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        c.bg,
        c.text
      )}
    >
      <Icon className="w-3 h-3" />
      {getRoleLabel(role)}
    </span>
  )
}

// ---------- Status indicator ----------
function StatusIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-emerald-400" : "text-white/40"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-emerald-400" : "bg-white/30"
        )}
      />
      {active ? "Aktif" : "Tidak Aktif"}
    </span>
  )
}

// ---------- Stat card ----------
function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  gradient: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card glass-card-hover p-4 relative overflow-hidden"
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
        style={{ background: gradient }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/50 font-medium">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

// ---------- Mobile card ----------
function MobileUserCard({
  user,
  onEdit,
  onToggle,
}: {
  user: UserRow
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{user.fullName}</h3>
          <p className="text-xs text-white/50 truncate">{user.email}</p>
        </div>
        <RoleBadge role={user.role} />
      </div>
      <div className="space-y-1 text-xs text-white/60">
        <p className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3 text-white/40 flex-shrink-0" />
          <span className="truncate">{user.department}</span>
        </p>
        {user.phoneNumber && (
          <p className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-white/40 flex-shrink-0" />
            <span>{user.phoneNumber}</span>
          </p>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <StatusIndicator active={user.isActive} />
        <span className="text-xs text-white/50">
          {user._count?.bookings || 0} tempahan
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-1 h-8 text-xs border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <Pencil className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={cn(
            "flex-1 h-8 text-xs border",
            user.isActive
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          )}
        >
          <Power className="w-3 h-3 mr-1" />
          {user.isActive ? "Nyahaktif" : "Aktif"}
        </Button>
      </div>
    </motion.div>
  )
}

// ---------- Main View ----------
export function UserManagementView() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [roleFilter, setRoleFilterState] = useState("all")
  const [search, setSearchState] = useState("")
  const [page, setPage] = useState(1)

  // Wrappers that also reset pagination
  const setRoleFilter = (v: string) => {
    setRoleFilterState(v)
    setPage(1)
  }
  const setSearch = (v: string) => {
    setSearchState(v)
    setPage(1)
  }

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  // Deactivate confirmation
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null)

  const PAGE_SIZE = 10

  const usersQuery = useQuery({
    queryKey: ["users", "all"],
    queryFn: fetchUsers,
    refetchInterval: 60000,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Berjaya", description: "Pengguna baharu berjaya dicipta." })
      closeDialog()
    },
    onError: (err: Error) => {
      setFormError(err.message)
      toast({ title: "Ralat", description: err.message, variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<UserFormState> }) =>
      updateUser(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Berjaya", description: "Maklumat pengguna dikemas kini." })
      closeDialog()
    },
    onError: (err: Error) => {
      setFormError(err.message)
      toast({ title: "Ralat", description: err.message, variant: "destructive" })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Berjaya", description: "Pengguna telah dinyahaktifkan." })
      setConfirmOpen(false)
      setConfirmUser(null)
    },
    onError: (err: Error) => {
      toast({ title: "Ralat", description: err.message, variant: "destructive" })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      updateUser(payload.id, { isActive: payload.isActive }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "Berjaya",
        description: variables.isActive
          ? "Pengguna telah diaktifkan semula."
          : "Pengguna telah dinyahaktifkan.",
      })
    },
    onError: (err: Error) => {
      toast({ title: "Ralat", description: err.message, variant: "destructive" })
    },
  })

  // Filter + paginate client-side (already loaded all users)
  const allUsers = usersQuery.data || []
  const filtered = useMemo(() => {
    let list = allUsers
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
      )
    }
    return list
  }, [allUsers, roleFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  // Stats
  const stats = useMemo(() => {
    const total = allUsers.length
    const byRole = {
      admin: allUsers.filter((u) => u.role === "admin").length,
      manager: allUsers.filter((u) => u.role === "manager").length,
      user: allUsers.filter((u) => u.role === "user").length,
    }
    const active = allUsers.filter((u) => u.isActive).length
    return { total, byRole, active }
  }, [allUsers])

  // ---------- Dialog handlers ----------
  const openCreateDialog = () => {
    setEditingUser(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (user: UserRow) => {
    setEditingUser(user)
    setForm({
      fullName: user.fullName,
      email: user.email,
      department: user.department,
      phoneNumber: user.phoneNumber || "",
      role: user.role as Role,
      password: "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (createMutation.isPending || updateMutation.isPending) return
    setDialogOpen(false)
    setEditingUser(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const handleSubmit = () => {
    setFormError(null)

    // Validate
    if (!form.fullName.trim()) return setFormError("Nama penuh diperlukan")
    if (!form.email.trim()) return setFormError("E-mel diperlukan")
    if (!form.department.trim()) return setFormError("Jabatan diperlukan")
    if (!editingUser && !form.password) return setFormError("Kata laluan diperlukan untuk pengguna baharu")
    if (form.password && form.password.length < 8) return setFormError("Kata laluan mesti sekurang-kurangnya 8 aksara")

    if (!form.email.endsWith("@adtec-jtm.gov.my")) {
      return setFormError("E-mel mesti menggunakan domain @adtec-jtm.gov.my")
    }

    if (editingUser) {
      const data: Partial<UserFormState> = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        role: form.role,
      }
      if (form.password) data.password = form.password
      updateMutation.mutate({ id: editingUser.id, data })
    } else {
      createMutation.mutate({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        phoneNumber: form.phoneNumber.trim(),
      })
    }
  }

  // ---------- Confirm deactivate ----------
  const openConfirmDeactivate = (user: UserRow) => {
    setConfirmUser(user)
    setConfirmOpen(true)
  }

  const handleConfirmDeactivate = () => {
    if (!confirmUser) return
    deactivateMutation.mutate(confirmUser.id)
  }

  // ---------- Toggle active (instant, no confirm) ----------
  const handleToggleActive = (user: UserRow) => {
    if (user.isActive) {
      // use confirm dialog for deactivation
      openConfirmDeactivate(user)
    } else {
      toggleActiveMutation.mutate({ id: user.id, isActive: true })
    }
  }

  const isLoading = usersQuery.isLoading
  const isError = usersQuery.isError
  const error = usersQuery.error as Error | null
  const isMutating = createMutation.isPending || updateMutation.isPending

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
            <UsersIcon className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Pengurusan Pengguna</h2>
            <p className="text-sm text-white/60">
              Urus akaun pengguna, pengurus, dan pentadbir sistem
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 glow-accent h-10"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Pengguna
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={UsersIcon}
          label="Jumlah Pengguna"
          value={stats.total}
          gradient="linear-gradient(135deg, #14B8A6 0%, #0F4C81 100%)"
          index={0}
        />
        <StatCard
          icon={Shield}
          label="Pentadbir"
          value={stats.byRole.admin}
          gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
          index={1}
        />
        <StatCard
          icon={UserCog}
          label="Pengurus"
          value={stats.byRole.manager}
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          index={2}
        />
        <StatCard
          icon={User}
          label="Pengguna"
          value={stats.byRole.user}
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
          index={3}
        />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 md:p-5"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, e-mel, jabatan..."
              className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-white/5 border-white/15 text-white h-10 focus:ring-[#14B8A6]/30 w-full sm:w-48">
              <SelectValue placeholder="Peranan" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-white/20 text-white">
              <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">Semua Peranan</SelectItem>
              <SelectItem value="user" className="text-white focus:bg-white/10 focus:text-white">Pengguna</SelectItem>
              <SelectItem value="manager" className="text-white focus:bg-white/10 focus:text-white">Pengurus</SelectItem>
              <SelectItem value="admin" className="text-white focus:bg-white/10 focus:text-white">Pentadbir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="glass-card p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white/80 font-medium">Ralat memuatkan pengguna</p>
          <p className="text-sm text-white/50 mt-1">{error?.message}</p>
          <Button
            variant="outline"
            onClick={() => usersQuery.refetch()}
            className="mt-4 border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cuba Semula
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 md:p-16 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#14B8A6]/15 to-[#0F4C81]/15 border border-white/10 flex items-center justify-center mb-5">
            <Inbox className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">Tiada Pengguna Dijumpai</h3>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
            {search || roleFilter !== "all"
              ? "Tiada pengguna sepadan dengan penapis semasa."
              : "Belum ada pengguna dalam sistem."}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Desktop Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-2 md:p-4 hidden lg:block"
          >
            <div className="overflow-x-auto custom-scrollbar rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Nama</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">E-mel</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Jabatan</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Telefon</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Peranan</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider text-center">Tempahan</TableHead>
                    <TableHead className="text-white/60 font-semibold text-xs uppercase tracking-wider text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="border-white/5 hover:bg-white/[0.04] transition-colors group"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0",
                              user.role === "admin" && "bg-gradient-to-br from-red-500 to-red-700",
                              user.role === "manager" && "bg-gradient-to-br from-amber-500 to-amber-700",
                              user.role === "user" && "bg-gradient-to-br from-blue-500 to-blue-700"
                            )}
                          >
                            {user.fullName
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span className="text-sm text-white font-medium line-clamp-1 max-w-[180px]">
                            {user.fullName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-sm text-white/70">
                          <Mail className="w-3 h-3 text-white/30 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-sm text-white/70 line-clamp-1 max-w-[140px]">
                        {user.department}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        {user.phoneNumber ? (
                          <div className="flex items-center gap-1.5 text-sm text-white/70">
                            <Phone className="w-3 h-3 text-white/30 flex-shrink-0" />
                            <span>{user.phoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <StatusIndicator active={user.isActive} />
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center text-sm text-white/70">
                        {user._count?.bookings || 0}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditDialog(user)}
                            className="inline-flex items-center gap-1 text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 transition-colors px-2 py-1.5 rounded-md hover:bg-[#14B8A6]/10"
                            title="Edit pengguna"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => handleToggleActive(user)}
                            disabled={toggleActiveMutation.isPending || deactivateMutation.isPending}
                            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
                          />
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid gap-3 sm:grid-cols-2">
            {paginated.map((user) => (
              <MobileUserCard
                key={user.id}
                user={user}
                onEdit={() => openEditDialog(user)}
                onToggle={() => handleToggleActive(user)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card p-4">
            <p className="text-xs text-white/60">
              Memaparkan{" "}
              <span className="text-white font-medium">
                {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              daripada <span className="text-white font-medium">{filtered.length}</span> pengguna
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed h-9"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelum
              </Button>
              <div className="flex items-center gap-1 px-3 h-9 glass-light rounded-md text-xs text-white/80">
                Halaman <span className="text-white font-semibold mx-1">{safePage}</span> / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed h-9"
              >
                Seterus
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="glass-strong border-white/20 text-white max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center">
                {editingUser ? <Pencil className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
              </div>
              {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baharu"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingUser
                ? "Kemas kini maklumat pengguna. Kata laluan kosong = kekal sedia ada."
                : "Isi borang di bawah untuk mencipta akaun pengguna baharu."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Full name */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Nama Penuh <span className="text-red-400">*</span></Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="cth. Ahmad bin Ali"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">E-mel <span className="text-red-400">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@adtec-jtm.gov.my"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
              />
              <p className="text-[10px] text-white/40">Mesti menggunakan domain @adtec-jtm.gov.my</p>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Jabatan <span className="text-red-400">*</span></Label>
              <Input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="cth. Jabatan Elektrik"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">No. Telefon</Label>
              <Input
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="012-3456789"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">Peranan <span className="text-red-400">*</span></Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-white h-10 focus:ring-[#14B8A6]/30">
                  <SelectValue placeholder="Pilih peranan" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-white/20 text-white">
                  <SelectItem value="user" className="text-white focus:bg-white/10 focus:text-white">Pengguna</SelectItem>
                  <SelectItem value="manager" className="text-white focus:bg-white/10 focus:text-white">Pengurus</SelectItem>
                  <SelectItem value="admin" className="text-white focus:bg-white/10 focus:text-white">Pentadbir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-white/80 text-xs">
                Kata Laluan {!editingUser && <span className="text-red-400">*</span>}
                {editingUser && <span className="text-white/40 ml-1">(kosongkan jika tidak diubah)</span>}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? "••••••••" : "Minimum 8 aksara"}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 h-10"
              />
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{formError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isMutating}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isMutating}
              className="bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white hover:opacity-90 border-[#14B8A6]/40"
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                editingUser ? "Simpan Perubahan" : "Cipta Pengguna"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="glass-strong border-white/20 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              Sahkan Nyahaktif
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Adakah anda pasti mahu menyahaktifkan akaun{" "}
              <span className="text-white font-medium">{confirmUser?.fullName}</span>?
              Pengguna ini tidak akan dapat log masuk sehingga diaktifkan semula.
              Rekod tempahan sedia ada akan dikekalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              disabled={deactivateMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700 border border-red-500"
            >
              {deactivateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Ya, Nyahaktif"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
