import { create } from "zustand"

export type ViewName =
  | "dashboard"
  | "facilities"
  | "facility-detail"
  | "facility-form"
  | "calendar"
  | "booking-form"
  | "my-bookings"
  | "booking-detail"
  | "approval-panel"
  | "all-bookings"
  | "user-management"
  | "notifications"
  | "profile"
  | "audit-logs"

interface AppState {
  currentView: ViewName
  selectedFacilityId: string | null
  selectedBookingId: string | null
  preselectedFacilityId: string | null
  preselectedDate: string | null
  editingFacilityId: string | null
  sidebarOpen: boolean

  setView: (view: ViewName) => void
  viewFacility: (id: string) => void
  editFacility: (id: string | null) => void
  viewBooking: (id: string) => void
  startBooking: (facilityId?: string, date?: string) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "dashboard",
  selectedFacilityId: null,
  selectedBookingId: null,
  preselectedFacilityId: null,
  preselectedDate: null,
  editingFacilityId: null,
  sidebarOpen: false,

  setView: (view) =>
    set({
      currentView: view,
      selectedFacilityId: null,
      selectedBookingId: null,
      editingFacilityId: null,
      sidebarOpen: false,
    }),

  viewFacility: (id) =>
    set({
      currentView: "facility-detail",
      selectedFacilityId: id,
      sidebarOpen: false,
    }),

  editFacility: (id) =>
    set({
      currentView: "facility-form",
      editingFacilityId: id,
      sidebarOpen: false,
    }),

  viewBooking: (id) =>
    set({
      currentView: "booking-detail",
      selectedBookingId: id,
      sidebarOpen: false,
    }),

  startBooking: (facilityId, date) =>
    set({
      currentView: "booking-form",
      preselectedFacilityId: facilityId || null,
      preselectedDate: date || null,
      sidebarOpen: false,
    }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
}))
