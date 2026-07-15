# Task 1-A — Dashboard, Notifications, Profile Views

**Agent:** full-stack-developer
**Task ID:** 1-A
**Scope:** Build 3 React view components for SiTempah using Next.js 16, TypeScript, glassmorphism design system

## Files Delivered
1. `/home/z/my-project/src/components/dashboard/dashboard-view.tsx`
2. `/home/z/my-project/src/components/notifications/notifications-view.tsx`
3. `/home/z/my-project/src/components/users/profile-view.tsx`

## Key Decisions

### DashboardView (role-based)
- Single component, switches on `data.role` returned by `GET /api/dashboard/stats`
- **User**: 4 stat cards (Total / Pending / Approved / Rejected) + Upcoming Bookings (5, date-chip UI) + Quick Actions card (Tempah / Fasiliti / Notifikasi)
- **Manager**: 5 stat cards (Pending / Approved / KIV / Rejected / Managed Facilities) + Pending Approvals (10, "Semak" button → `viewBooking(id)`) + Popular Facilities (5, animated progress bars based on max booking count)
- **Admin**: 8 stat cards + 3 recharts charts + recent bookings table (8 rows, click-to-view)
  - Pie chart: Bookings by Status (donut, inner radius 50, outer 85)
  - Bar chart: Facilities by Category (rounded top corners, gradient cells)
  - Pie chart: Users by Role (with value labels)
  - Custom `ChartTooltip` with `glass-strong` background
  - Palette: `#14B8A6, #0F4C81, #F59E0B, #EF4444, #22C55E`
- Stat cards have stagger animation (delay = `index * 0.06s`)
- Loading skeletons, error state with retry button, empty states everywhere
- Polling: refetch every 60s

### NotificationsView
- Glass header card with bell icon, "Notifikasi" title, unread count, and "Tanda Semua Dibaca" button (calls `/api/notifications/[id]/read` PATCH in parallel via `Promise.all` for each unread item)
- Each notification card:
  - Left border colored by type (info=blue, success=green, warning=amber, danger=red)
  - Type icon in matching color badge
  - Message + optional booking facility/title chip
  - Relative time + absolute datetime
  - Mail/MailOpen icon for read/unread status
  - Click handler: PATCH mark-read if unread, then `viewBooking(bookingId)` if bookingId exists
- Reuses query key `["notifications"]` so the existing NotificationBell in the header stays in sync
- Polling: 30s (matches NotificationBell)
- Empty state with `Inbox` icon + explanation copy

### ProfileView
- Read-only (per task spec — editing requires admin role)
- Glass header card with:
  - Avatar (initials, gradient teal→blue, glow-accent, border)
  - Full name + role badge (color-coded: admin=red, manager=amber, user=teal)
  - Department + email
  - "Ahli sejak" date + "Akaun Aktif" status pill
- Stats grid (4 cards) from `GET /api/dashboard/stats` (Total / Pending / Approved / Rejected)
- Personal Info card with InfoRow components (Nama Penuh, E-mel, Jabatan, No. Telefon "—", Peranan)
  - Lock badge indicating read-only mode
  - Note explaining editing requires Pentadbir Sistem
- Recent Activity list (6 latest bookings from `GET /api/bookings?scope=me`, sorted client-side by createdAt desc) — click navigates to booking detail
- Empty state for users with no bookings, with CTA "Buat Tempahan Pertama anda"

## Cross-Cutting Concerns
- All text in **Bahasa Malaysia**
- `"use client"` directive at top of each file
- Responsive: grid-cols-2 on mobile → 3/4 on md → 4/5/8 on lg depending on card count
- All click targets ≥ 36px, easily tappable on mobile
- Semantic HTML: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>` for tabular data; `<button>` for all interactive elements
- Framer Motion `motion.div` with `initial`/`animate` for entrance animations
- shadcn/ui via `@/components/ui/...` (Button etc.) — but mostly styled with project's glass-card classes per design system
- Uses `cn()` from `@/lib/utils` for conditional class merging
- Uses `formatDate`, `formatDateTime`, `formatTimeRange`, `formatRelativeTime`, `getStatusLabel`, `getRoleLabel` from `@/lib/utils`
- Uses `StatusBadge` from `@/components/common/status-badge` for status pills
- Uses `useAppStore` actions: `setView`, `viewBooking`, `startBooking` — every button is functional

## Quality Checks
- `bun run lint` — exit 0 (clean)
- `bunx tsc --noEmit --skipLibCheck` — no errors in my 3 files
- `dev.log` shows Module Not Found errors only for OTHER agents' views (facilities-view, calendar-view, booking-form-view, my-bookings-view, booking-detail-view, approval-panel-view, all-bookings-view, user-management-view, audit-logs-view) — these will resolve when other agents build them
- No errors for dashboard-view, notifications-view, or profile-view

## What Other Agents Should Know
- The `["notifications"]` TanStack Query key is shared between `NotificationBell` (header) and `NotificationsView`. Any mutation that changes notifications should `invalidateQueries({ queryKey: ["notifications"] })` to keep both in sync.
- The `["dashboard-stats"]` query key is shared between `DashboardView` and `ProfileView` (for stats). If any view mutates bookings, consider invalidating this key too.
- My views assume `session.user` shape: `{ id, name, email, role, department }` — see `src/types/next-auth.d.ts`.
- For booking detail navigation, use `useAppStore().viewBooking(bookingId)`.
- For view switching, use `useAppStore().setView(viewName)`.
