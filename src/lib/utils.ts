import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  })
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("ms-MY", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTimeRange(start: Date | string, end: Date | string) {
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "Baru saja"
  if (minutes < 60) return `${minutes} minit yang lalu`
  if (hours < 24) return `${hours} jam yang lalu`
  if (days < 7) return `${days} hari yang lalu`
  return formatDate(d)
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draf",
    pending: "Menunggu Kelulusan",
    kiv: "KIV",
    approved: "Diluluskan",
    rejected: "Ditolak",
    cancelled: "Dibatalkan",
    expired: "Tamat Tempoh",
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "status-draft",
    pending: "status-pending",
    kiv: "status-kiv",
    approved: "status-approved",
    rejected: "status-rejected",
    cancelled: "status-cancelled",
    expired: "status-cancelled",
  }
  return colors[status] || "status-pending"
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    user: "Pengguna",
    manager: "Pengurus",
    admin: "Pentadbir",
  }
  return labels[role] || role
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Bilik Mesyuarat": "Building2",
    "Bilik Perbincangan": "MessagesSquare",
    "Makmal": "MonitorCog",
    "Dewan Utama": "Building",
    "Bilik Seminar": "Presentation",
  }
  return icons[category] || "Building2"
}

export function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 21) slots.push(`${String(h).padStart(2, "0")}:30`)
  }
  return slots
}

export function toLocalISOString(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
