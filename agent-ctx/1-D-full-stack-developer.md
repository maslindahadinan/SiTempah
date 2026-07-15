# Task 1-D — Approval, All Bookings, User Management, Audit Logs Views

**Agent:** full-stack-developer
**Task ID:** 1-D
**Scope:** Build 4 React view components for SiTempah using Next.js 16, TypeScript, glassmorphism design system

## Files Delivered
1. `/home/z/my-project/src/components/approval/approval-panel-view.tsx` — Approval panel (pending + KIV tabs, quick action dialog)
2. `/home/z/my-project/src/components/approval/all-bookings-view.tsx` — Full data table with filters, CSV export, pagination
3. `/home/z/my-project/src/components/users/user-management-view.tsx` — Admin-only user CRUD with dialogs and AlertDialog
4. `/home/z/my-project/src/components/users/audit-logs-view.tsx` — Timeline audit log viewer with color-coded categories

## Key Decisions

### ApprovalPanelView
- Detects role from `useSession().data.session.user.role` → uses `scope=all` for admin, `scope=managed` for manager
- Two parallel TanStack queries: `["approval-bookings", scope, "pending"]` and `["approval-bookings", scope, "kiv"]` with 30s refetch
- Tabs component with custom-styled TabsTrigger (teal gradient for pending, amber gradient for KIV)
- Each BookingCard shows: title (clickable → `viewBooking`), facility name + location, applicant name + department, date + time range, attendee count vs capacity, purpose notes (line-clamped), and three colored action buttons (Lulus=emerald, KIV=amber, Tolak=red)
- Quick action opens a Dialog with: action title/description, mini booking summary card, Textarea for review notes (mandatory for "rejected"), character counter (max 500)
- Submit validates min 3 chars + mandatory for rejection; calls `PATCH /api/bookings/[id]/status`
- On success: invalidates `["approval-bookings"]`, `["bookings"]`, `["dashboard-stats"]`, `["notifications"]` for cross-component sync
- StatPills at top: pending count + KIV count
- Loading skeletons, error state with retry, empty states per tab
- 2-column grid on lg screens

### AllBookingsView
- Single query `["all-bookings", scope, filters]` with 60s refetch, plus separate `["facilities-list"]` query for the facility dropdown
- 5 filter controls in a responsive grid: search text, status Select, facility Select, start date, end date
- "Kosongkan" link appears when any filter is active
- "Eksport CSV" button generates UTF-8 BOM CSV (Excel-compatible) via Blob + download link
- Desktop: full glass Table with 8 columns (Tajuk, Fasiliti, Pemohon, Mula, Tamat, Peserta, Status, Tindakan)
- Mobile (<lg): replaces table with stacked motion cards
- Pagination (10 per page) with "Sebelum"/"Seterus" buttons + page indicator
- Each row/card click → `viewBooking(id)`
- Status badges via shared `StatusBadge` component
- Loading skeleton (6 rows), error state with retry, empty state with conditional message

### UserManagementView
- Single query `["users", "all"]` with 60s refetch, returns array with `_count.bookings`
- Client-side filtering (role + search) and pagination (10 per page)
- Stats grid: 4 cards (Total, Pentadbir, Pengurus, Pengguna) with role-colored gradients
- Desktop: glass Table with avatar (initials colored by role), name, email, department, phone, role badge, status indicator, bookings count, and Switch for activate/deactivate + Edit button
- Mobile: 2-column card grid with full info + Edit/Toggle buttons
- "Tambah Pengguna" button opens create Dialog with form: fullName, email, department, phoneNumber, role Select, password
- Edit opens same Dialog pre-filled; password field optional (placeholder shows "kosongkan jika tidak diubah")
- Form validation: required fields, password ≥ 8 chars for new users, JTM email domain check
- Create → `POST /api/users`, Edit → `PUT /api/users/[id]`
- Switch ON (active → click) opens AlertDialog confirmation (calls `DELETE /api/users/[id]` which soft-deletes)
- Switch OFF (inactive → click) calls `PUT /api/users/[id]` with `{ isActive: true }` (no confirmation needed)
- Role badge: admin=red, manager=amber, user=blue (with matching icon)
- Inlines error display in dialog + toast notifications

### AuditLogsView
- Query `["audit-logs", 100]` → `GET /api/audit?limit=100`, 60s refetch
- Stats by category (8 mini-cards): Cipta, Kemas Kini, Padam/Nyahaktif, Lulus, KIV, Tolak, Pengesahan, Lain-lain
- Action categorization function: parses action string (e.g. `BOOKING_APPROVED`, `USER_CREATE`, `FACILITY_DELETE`) into one of 8 categories
- Each category has: color, left border color, icon, icon background, label
- Timeline UI: vertical gradient line on sm+ screens, motion cards staggered entrance
- Each entry: category icon, translated action label (e.g. "Tempahan Diluluskan"), entity chip, details text, user avatar (initials colored by role) or "Sistem" fallback, optional IP address, relative time + hover tooltip with full datetime
- Filters: entity Select (all/user/facility/booking/system), action search Input
- "Eksport CSV" button generates CSV with timestamp, user, role, action, entity, details, IP
- Loading skeleton, error state with reload, empty state with conditional message

## Cross-Cutting Concerns
- All text in **Bahasa Malaysia** (button labels, dialog copy, error messages, empty states)
- `"use client"` directive at top of each file
- All interactive elements use `<button>`, `<select>`, `<input>`, etc. with proper ARIA via shadcn/ui
- Framer Motion `motion.div`/`motion.tr`/`motion.button` for entrance animations (initial opacity/y, staggered delays)
- Glassmorphism classes: `glass-card`, `glass-card glass-card-hover`, `glass-strong` (for dialogs), `glass-light` (for inner panels)
- Status colors via shared `StatusBadge` (from `@/components/common/status-badge`)
- Responsive: tables hidden on `<lg`, replaced with stacked cards; grids collapse 4→2→1; full-width buttons on mobile
- Touch-friendly: all buttons ≥ 36px height (`h-9` or `h-10`)
- Every mutation invalidates the relevant query keys to keep UI in sync
- All toasts via `useToast` hook with `title` + `description` + optional `variant: "destructive"`
- CSV exports include UTF-8 BOM (`\uFEFF`) for Excel compatibility and proper escaping of commas/quotes/newlines
- Date pickers use `[color-scheme:dark]` Tailwind class for dark mode calendar UI

## Quality Checks
- `bun run lint` — exit 0 (clean, no warnings)
- `bunx tsc --noEmit --skipLibCheck` — no errors in my 4 files (remaining project errors are pre-existing in API routes due to zod v4 `.errors` API change, prisma seed.ts, websocket examples, and other agents' not-yet-built views)
- `dev.log` shows `✓ Compiled in 202ms` and `✓ Compiled in 260ms` — my views compile successfully. Only remaining Module Not Found is `booking-detail-view` (Task 1-C agent's responsibility)

## What Other Agents Should Know
- The `["approval-bookings"]` query key is used by ApprovalPanelView. If any view mutates bookings (approve/kiv/reject), the `PATCH /api/bookings/[id]/status` mutation in approval-panel-view already invalidates `["approval-bookings"]`, `["bookings"]`, `["dashboard-stats"]`, and `["notifications"]` — other views can rely on this cascade.
- The `["all-bookings"]` query key (with filter args) is used by AllBookingsView. BookingDetail or MyBookings mutations may want to also invalidate this if they affect the underlying list.
- The `["users"]` query key is used by UserManagementView. ProfileView reads from `["dashboard-stats"]` instead.
- The `["audit-logs", 100]` query key is used by AuditLogsView.
- The `["facilities-list"]` query key (separate from `["facilities"]` used by FacilitiesView) is used by AllBookingsView for the facility filter dropdown.
- For navigation, my views use `useAppStore().viewBooking(id)` to navigate to booking detail (resolves to `booking-detail` view, which Task 1-C is building).
- For admin-only RBAC enforcement, the API routes already return 403 for non-admins. The UI relies on `session.user.role === "admin"` to show admin-only views (UserManagementView, AuditLogsView) — sidebar should already filter these.
