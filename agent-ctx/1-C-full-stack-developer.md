# Task 1-C — Calendar, Booking Form, My Bookings, Booking Detail Views

**Agent:** full-stack-developer
**Task ID:** 1-C
**Scope:** Build 4 React view components for the SiTempah Booking module using Next.js 16, TypeScript, glassmorphism design system

## Files Delivered
1. `/home/z/my-project/src/components/bookings/calendar-view.tsx`
2. `/home/z/my-project/src/components/bookings/booking-form-view.tsx`
3. `/home/z/my-project/src/components/bookings/my-bookings-view.tsx`
4. `/home/z/my-project/src/components/bookings/booking-detail-view.tsx`

## Key Decisions

### CalendarView (`calendar-view.tsx`)
- Custom 6×7 monthly calendar grid built from scratch (no external calendar lib — shadcn's `Calendar` is for date picking, not for showing events)
- 7-column grid with weekday labels: Ahd / Isn / Sel / Rab / Kha / Jum / Sab (Malay abbreviations)
- Each day cell is a `<button>` that calls `startBooking(facilityId, dateString)` where dateString = "YYYY-MM-DD"
- Past days are disabled (cursor-not-allowed, opacity-50); today is ringed with teal (`ring-1 ring-[#14B8A6]/60`)
- Status dot colors per day cell (max 4 dots with "+N" overflow):
  - `approved` → `bg-emerald-400`
  - `kiv` → `bg-amber-400`
  - `rejected` → `bg-red-400`
  - `pending` → `bg-gray-400`
- Facility selector dropdown at top: "Semua Fasiliti" + each facility with capacity
- Month navigation: prev/next chevrons + "Hari Ini" button
- Fetches only the visible month's bookings via `?startDate=YYYY-MM-01T00:00:00&endDate=YYYY-MM-DDT23:59:59` (efficiency)
- `scope` is role-aware: `scope=all` for managers/admins, `scope=me` for users
- 4 stat summary cards (Approved / Pending / KIV / Rejected counts for current filter)
- Side panel listing all month's bookings (sorted ascending by startTime) with date chip, title, facility, time range, StatusBadge — max-h-640px with `custom-scrollbar`
- Color legend at bottom of grid
- Loading state with spinner; helper text explaining click-to-book

### BookingFormView (`booking-form-view.tsx`)
- Initial state from store: `facilityId` from `preselectedFacilityId`, `date` from `preselectedDate`
- **No useEffect syncing** — works because AppShell uses `AnimatePresence mode="wait"` with `key={currentView}`, so the component is fully unmounted on view switch and `useState` initializers always run fresh. This avoids the `react-hooks/set-state-in-effect` lint error.
- Fields:
  - **Facility**: Select dropdown showing name + location + capacity
  - **Title**: text input (max 200 chars)
  - **Date**: native `<input type="date">` with `min={todayDateStr()}` and `[color-scheme:dark]` for the native picker on dark theme
  - **Start time / End time**: Select dropdowns using `generateTimeSlots()` (08:00–21:00 in 30-min increments)
  - **Attendees**: number input (min 1)
  - **Purpose Notes**: Textarea (max 1000 chars, live counter)
  - **Attachment URL**: optional URL input (validated via `new URL()`)
- Real-time validation (computed via `useMemo`):
  - End time must be after start time — auto-bumps end to next slot when start changes
  - Date cannot be in the past (`date < todayDateStr()` check)
  - Attendees cannot exceed facility capacity (amber warning, blocks submit)
  - URL must be a valid URL
  - Title ≥ 3 chars, Purpose Notes ≥ 5 chars (matches API zod schema)
- `touched[]` state delays error display until user interacts with each field
- Conflict alert banner (red left-border) appears when 409 returned, lists each conflicting booking's title and time range
- Submit handlers:
  - "Simpan sebagai Draf" → POST with `status: "draft"`
  - "Hantar Untuk Kelulusan" → POST with `status: "pending"`
- On success: invalidates `["bookings"]`, `["calendar-bookings"]`, `["dashboard-stats"]` queries, shows toast, calls `viewBooking(newBooking.id)` to navigate to detail
- Sticky action bar at bottom (`sticky bottom-4 z-20`) with Back / Save Draft / Submit buttons; spinner replaces icon during pending state
- Glass info card at bottom explaining the review process

### MyBookingsView (`my-bookings-view.tsx`)
- Fetches `GET /api/bookings?scope=me`
- Search bar filters by title, facility name, and purpose notes (case-insensitive)
- Filter tabs (shadcn `Tabs`): Semua / Menunggu / Diluluskan / KIV / Ditolak / Dibatalkan
  - Each tab has a count badge (e.g. `12`)
  - Active tab styled with teal→blue gradient via `data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#14B8A6]/80 data-[state=active]:to-[#0F4C81]/80`
- Responsive 2-column grid (1 col on mobile) of `BookingCard` components
- `BookingCard`:
  - Top accent strip colored by status (emerald/amber/red/gray/blue)
  - "Akan Datang" pulse badge for upcoming approved bookings
  - "Selesai" badge for past approved bookings
  - Date chip (month abbreviation + day number)
  - Title (truncates, hover → teal)
  - Time range, facility name (with MapPin), attendees count
  - ChevronRight indicator
  - Stagger entrance animation (`delay = Math.min(index * 0.04, 0.4)`)
- Loading skeleton grid (6 placeholder cards with animate-pulse)
- Empty state with contextual icon: `Inbox` for "all" empty, `CalendarOff` for status-filtered empty, `Search` for no search results
- CTA "Buat Tempahan Pertama" button on empty all-tab

### BookingDetailView (`booking-detail-view.tsx`)
- Fetches `GET /api/bookings/[id]` using `selectedBookingId` from store
- Glass header with back button, prominent `StatusBadge` (text-sm, px-3 py-1.5), "Selesai" badge for past approved, facility category chip
- Action buttons (conditional based on role + status):
  - **Owner** (when status ∈ pending/approved/kiv): "Batal Tempahan" → opens `AlertDialog` with reason textarea (max 500 chars), then `DELETE /api/bookings/[id]?reason=...`
  - **Manager** (must own facility) or **Admin** (when status ∈ pending/kiv): "Lulus" (green) / "KIV" (amber) / "Tolak" (red) → opens `Dialog` with review notes textarea, then `PATCH /api/bookings/[id]/status`
- 3-column layout (`lg:grid-cols-3`):
  - **Left 2 cols**:
    - Booking Info card: 2-col grid of `InfoRow` components (Date, Time, Attendees with capacity hint, Facility with location hint) + Purpose Notes section + Attachment link (opens new tab)
    - Status History Timeline: vertical timeline with colored dot per entry; icon based on `newStatus` (CheckCircle2 / XCircle / Pause / Ban / Clock / FileText); vertical connecting line; "Terkini" badge on last entry; shows transition text like "Menunggu → Diluluskan" or "Dicipta sebagai Draf"; notes; timestamp + `changedByUser.fullName`
  - **Right 1 col**:
    - Applicant card: avatar with initials (teal→blue gradient), full name, email, then InfoRow list (email, department, phone)
    - Reviewer card (only if reviewed): avatar (amber→blue gradient), name, `reviewedAt`, review notes section
    - Quick Summary card: booking ID (last 8 chars), created/updated dates
- Mutations properly invalidate all related queries: `["bookings"]`, `["booking", selectedBookingId]`, `["calendar-bookings"]`, `["dashboard-stats"]`, `["notifications"]` — so the NotificationBell, DashboardView, CalendarView, and MyBookingsView all stay in sync after a cancel/approve/reject
- Client-side validation: empty `reviewNotes` blocks rejection submit with toast "Catatan Diperlukan"
- Loading skeleton, error state with back button, "no booking selected" guard when `selectedBookingId` is null

## Cross-Cutting Concerns
- All text in **Bahasa Malaysia**
- `"use client"` directive at top of each file
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- All click targets ≥ 36px (h-9 buttons, h-9 inputs, w-9 icon buttons)
- Semantic HTML: `<button>` for all interactive elements, `<ol>` for timeline, `<a target="_blank" rel="noopener noreferrer">` for external links
- Framer Motion `motion.div` / `motion.button` with `initial` / `animate` for entrance animations and stagger
- shadcn/ui via `@/components/ui/...` (Button, Input, Textarea, Label, Select, Tabs, AlertDialog, Dialog)
- Glass card classes per design system: `glass-card`, `glass-card-hover`, `glass-light`, `glass-strong`
- Status colors per design system: `status-approved`, `status-pending`, `status-kiv`, `status-rejected`, `status-cancelled`, `status-draft`
- Uses `cn()` from `@/lib/utils` for conditional class merging
- Uses `formatDate`, `formatDateTime`, `formatTimeRange`, `getStatusLabel`, `generateTimeSlots` from `@/lib/utils`
- Uses `StatusBadge` from `@/components/common/status-badge` for status pills
- Uses `useAppStore` actions: `setView`, `viewBooking`, `startBooking` — every button is functional

## TanStack Query Keys Used
- `["facilities"]` — facilities list (used by Calendar + BookingForm)
- `["facilities", "activeOnly"]` — active-only facilities (used by BookingForm)
- `["calendar-bookings", scope, year, month]` — bookings for the visible calendar month (Calendar)
- `["bookings", "me"]` — current user's bookings (MyBookings)
- `["booking", selectedBookingId]` — single booking detail (BookingDetail)
- After any mutation, the following keys are invalidated to keep views in sync:
  - `["bookings"]` (covers `["bookings", "me"]` and any other variants)
  - `["booking", selectedBookingId]`
  - `["calendar-bookings"]`
  - `["dashboard-stats"]` (shared with DashboardView + ProfileView)
  - `["notifications"]` (shared with NotificationBell + NotificationsView)

## Important Notes for Other Agents
- My `BookingDetailView` handles BOTH owner-cancel and manager/admin-approve-kiv-reject flows. If you build `ApprovalPanelView` (task 1-D area), you may want to reuse the same `PATCH /api/bookings/[id]/status` endpoint and pattern.
- When navigating to a booking detail from anywhere, use `useAppStore().viewBooking(bookingId)`.
- When starting a booking from a specific date or facility, use `useAppStore().startBooking(facilityId?, dateString?)` where `dateString` is `"YYYY-MM-DD"`.
- The booking form's preselection mechanism relies on AppShell unmounting components on view switch. If you change AppShell's `AnimatePresence` behavior, preselection may break.
- The `react-hooks/set-state-in-effect` ESLint rule is enforced — avoid calling `setState` synchronously inside `useEffect`. Use `useState` initializers or the "adjust state during render" pattern (see `FacilityFormView` from task 1-B).

## Quality Checks
- `bun run lint` — exit 0 (clean for all my files; the only previous error in `user-management-view.tsx` is another agent's file)
- `bunx tsc --noEmit --skipLibCheck` — no errors in my 4 view files (remaining errors are pre-existing in API routes due to zod v4 `.errors` API change, prisma seed.ts, websocket examples, and skills/ — none mine)
- `dev.log` shows "✓ Compiled" success — Module Not Found errors for my 4 views are all resolved
