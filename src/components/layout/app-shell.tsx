"use client"

import { useSession, signOut } from "next-auth/react"
import { useAppStore } from "@/stores/app-store"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { Footer } from "./footer"
import { AnimatePresence, motion } from "framer-motion"
import { Building2 } from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"

// Lazy load all view components to reduce initial compilation memory
const DashboardView = dynamic(() => import("@/components/dashboard/dashboard-view").then(m => ({ default: m.DashboardView })), { loading: () => <ViewLoader /> })
const FacilitiesView = dynamic(() => import("@/components/facilities/facilities-view").then(m => ({ default: m.FacilitiesView })), { loading: () => <ViewLoader /> })
const FacilityDetailView = dynamic(() => import("@/components/facilities/facility-detail-view").then(m => ({ default: m.FacilityDetailView })), { loading: () => <ViewLoader /> })
const FacilityFormView = dynamic(() => import("@/components/facilities/facility-form-view").then(m => ({ default: m.FacilityFormView })), { loading: () => <ViewLoader /> })
const CalendarView = dynamic(() => import("@/components/bookings/calendar-view").then(m => ({ default: m.CalendarView })), { loading: () => <ViewLoader /> })
const BookingFormView = dynamic(() => import("@/components/bookings/booking-form-view").then(m => ({ default: m.BookingFormView })), { loading: () => <ViewLoader /> })
const MyBookingsView = dynamic(() => import("@/components/bookings/my-bookings-view").then(m => ({ default: m.MyBookingsView })), { loading: () => <ViewLoader /> })
const BookingDetailView = dynamic(() => import("@/components/bookings/booking-detail-view").then(m => ({ default: m.BookingDetailView })), { loading: () => <ViewLoader /> })
const ApprovalPanelView = dynamic(() => import("@/components/approval/approval-panel-view").then(m => ({ default: m.ApprovalPanelView })), { loading: () => <ViewLoader /> })
const AllBookingsView = dynamic(() => import("@/components/approval/all-bookings-view").then(m => ({ default: m.AllBookingsView })), { loading: () => <ViewLoader /> })
const UserManagementView = dynamic(() => import("@/components/users/user-management-view").then(m => ({ default: m.UserManagementView })), { loading: () => <ViewLoader /> })
const NotificationsView = dynamic(() => import("@/components/notifications/notifications-view").then(m => ({ default: m.NotificationsView })), { loading: () => <ViewLoader /> })
const ProfileView = dynamic(() => import("@/components/users/profile-view").then(m => ({ default: m.ProfileView })), { loading: () => <ViewLoader /> })
const AuditLogsView = dynamic(() => import("@/components/users/audit-logs-view").then(m => ({ default: m.AuditLogsView })), { loading: () => <ViewLoader /> })

function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-white/20 border-t-[#14B8A6] rounded-full animate-spin" />
    </div>
  )
}

export function AppShell() {
  const { data: session } = useSession()
  const { currentView } = useAppStore()
  const [signingOut, setSigningOut] = useState(false)

  if (!session) return null

  const user = session.user

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />
      case "facilities":
        return <FacilitiesView />
      case "facility-detail":
        return <FacilityDetailView />
      case "facility-form":
        return <FacilityFormView />
      case "calendar":
        return <CalendarView />
      case "booking-form":
        return <BookingFormView />
      case "my-bookings":
        return <MyBookingsView />
      case "booking-detail":
        return <BookingDetailView />
      case "approval-panel":
        return <ApprovalPanelView />
      case "all-bookings":
        return <AllBookingsView />
      case "user-management":
        return <UserManagementView />
      case "notifications":
        return <NotificationsView />
      case "profile":
        return <ProfileView />
      case "audit-logs":
        return <AuditLogsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header user={user} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
