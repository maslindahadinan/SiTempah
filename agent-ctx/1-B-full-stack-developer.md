# Task 1-B — Facilities List, Detail, and Form Views

**Agent:** full-stack-developer
**Task ID:** 1-B
**Scope:** Build 3 React view components for the Facility module of SiTempah using Next.js 16, TypeScript, and the glassmorphism design system.

## Files Delivered
1. `/home/z/my-project/src/components/facilities/facilities-view.tsx` — facilities list view
2. `/home/z/my-project/src/components/facilities/facility-detail-view.tsx` — facility detail view
3. `/home/z/my-project/src/components/facilities/facility-form-view.tsx` — facility create/edit form (admin only)

## Key Decisions

### FacilitiesView (list)
- Glass header card with `Building2` icon, total count badge ("X fasiliti tersenarai"), and an admin-only **"Tambah Fasiliti"** button that calls `editFacility(null)`.
- Search bar with 350 ms debounce via `useEffect` + `setTimeout` cleanup. The debounced value drives the TanStack Query key `["facilities", search, category]` so refetches are automatic.
- Category `Select` dropdown with the 5 PRD categories (`Bilik Mesyuarat`, `Bilik Perbincangan`, `Makmal`, `Dewan Utama`, `Bilik Seminar`) plus an "all" option. Each SelectItem renders the category's lucide icon for visual scanning.
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`.
- Facility card (`glass-card glass-card-hover`):
  - Coloured category icon (gradient + matching text color per category — teal for Bilik Mesyuarat, sky for Bilik Perbincangan, amber for Makmal, violet for Dewan Utama, rose for Bilik Seminar).
  - Category badge pill + active/inactive pill (emerald/red).
  - Truncated facility name, location with MapPin, capacity chip ("30 orang") + bookings count.
  - First 3 amenities as small chips, with `+N` overflow indicator.
  - Manager name with `UserCog` icon at the bottom, `ChevronRight` arrow that animates on hover.
  - Whole card is a `<button>` (semantic, keyboard-accessible) calling `viewFacility(id)`.
- Loading skeleton grid (6 cards) with pulse animation, error state with retry button, and an empty state with `SearchX` icon and a "Kosongkan Penapis" / "Tambah Fasiliti Pertama" CTA depending on context.
- Stagger animation on cards (`delay = index * 0.05`, capped at 0.4s).

### FacilityDetailView
- Back button at top navigates to facilities list via `setView("facilities")`.
- Hero header card with:
  - Large gradient category icon (20×20 with `glow-accent`).
  - Facility name + active/inactive status pill.
  - Quick info chips: category, location, capacity.
  - Description paragraph (max-w-2xl, line-clamped gracefully).
  - Action buttons:
    - **"Tempah Fasiliti Ini"** — gradient button calling `startBooking(facility.id)`. Disabled when facility is inactive.
    - **"Lihat Kalendar"** — calls `setView("calendar")`.
  - Admin-only section (below border) with:
    - **"Edit Fasiliti"** button — calls `editFacility(id)`.
    - **"Nyahaktifkan"** button — two-step inline confirm (`Pasti nyahaktifkan? Ya/Batal`) before DELETE. Calls `DELETE /api/facilities/[id]`. On success: invalidates both `["facilities"]` and `["facility", id]` queries, shows success toast, navigates back to facilities list.
- Three-column responsive layout (`grid-cols-1 lg:grid-cols-3`):
  - **Left column**: "Maklumat Pantas" (category, capacity, location, total bookings) + "Kemudahan" (full amenities list as chips with stagger animation).
  - **Middle column**: "Waktu Operasi" (time range + day-of-week grid showing active/inactive days using teal for active) + "Pengurus Fasiliti" (avatar with initials, name, email, department — or empty state with admin "Tugaskan pengurus →" link).
  - **Right column**: "Tempahan Akan Datang" list — only shows bookings whose `endTime >= now`. Each row is a clickable button calling `viewBooking(bookingId)`, with date chip, title, user name, time range, and `StatusBadge`. Empty state with `CalendarClock` icon and "Buat tempahan pertama →" CTA.
- Loading skeleton, error state with retry, and a "no facility selected" guard.
- `formatDate` and `formatTimeRange` used throughout.
- Safe JSON parsing for both `amenities` and `operatingHours` with `try/catch`.

### FacilityFormView (admin only)
- Access guard: non-admin users see an "Akses Ditolak" card with a back button.
- Header card showing "Tambah Fasiliti Baharu" or "Edit Fasiliti" depending on `editingFacilityId`. Includes a small live-preview chip showing the currently selected category's icon and label.
- Pre-fill logic uses React's recommended **"adjust state during render"** pattern (tracking `prevLoadedId` with `useState` and conditionally calling `setForm` during render). This avoids the React 19 `react-hooks/set-state-in-effect` lint rule that fires on synchronous `setState` calls in effect bodies. Also resets the tracker when switching from edit → create mode.
- Three glass-card form sections:
  1. **Maklumat Asas**: name (Input), category (Select with category icons), capacity (number Input), location (Input), description (Textarea with 1000-char counter).
  2. **Kemudahan**: dynamic amenities list. Add via Input + "Tambah" button (Enter key also works). Duplicate detection (case-insensitive) shows a toast. Each chip has an X remove button. Empty state shows italic helper text.
  3. **Pengurusan & Operasi**: manager `Select` (fetched from `GET /api/users?role=manager`, includes "Tanpa pengurus" option and department/email subtext per item), status `Switch` (Aktif/Tidak Aktif), operating-hours start/end `time` Inputs, and a 7-day-of-week button grid for `operatingDays` (toggle on/off, with `glow-accent` highlight on active days).
- Form validation function `validate()` checks: name ≥ 2 chars, capacity is positive integer ≤ 10000, location ≥ 2 chars, description ≥ 5 chars, operating days non-empty, end time after start time. Errors render inline below each field with `AlertOctagon` icon.
- Submit handler: builds payload `{ name, category, capacity, location, description, amenities: string[], managerId: string | null, operatingHours: JSON.stringify({start, end, days}), isActive }`. POST to `/api/facilities` for create, PUT to `/api/facilities/[id]` for update.
- On success: invalidates both `["facilities"]` and `["facility", id]` query keys, shows a success toast, then navigates to `viewFacility(data.id)` (returned by the API) so the user lands on the detail page of the just-created/edited facility.
- On error: shows destructive toast with the server's error message.
- Sticky bottom action bar with "Batal" (cancels, returns to facilities) and the primary submit button (gradient + glow-accent, shows spinner when submitting). Submit button text dynamically shows "Cipta Fasiliti" or "Simpan Perubahan".
- Loading skeleton while fetching existing facility for edit; error state if the fetch fails.

## Cross-Cutting Concerns
- All text in **Bahasa Malaysia** (button labels, field labels, helper text, toasts, empty states, validation messages).
- `"use client"` directive at the top of every file.
- Mobile-first responsive design: grids collapse from 3 → 2 → 1 cols, action buttons stack vertically on mobile, form fields stack on mobile.
- All click targets ≥ 36 px tall (buttons use `py-2.5 px-4 rounded-xl`, inputs are `h-11`).
- Semantic HTML: `<form>` for the form, `<button>` for every interactive element, `<Label htmlFor>` for accessibility.
- Framer Motion: `motion.div` with `initial={{opacity:0, y:-8}}`/`animate={{opacity:1, y:0}}` for entrance on every section; staggered delays on cards and amenities chips.
- TanStack Query keys I introduced: `["facilities", search, category]` (list), `["facility", id]` (detail), `["users", "manager"]` (manager dropdown). The detail view also invalidates `["facilities"]` on delete so the list view refreshes when the user navigates back.
- Safe JSON parse helpers (`parseAmenities`, `parseOperatingHours`) — both use `try/catch` and return safe defaults.
- Category icon mapping mirrors `lib/utils.ts → getCategoryIcon` but adds full visual config (gradient, text color, badge bg/border) per category.

## Quality Checks
- `bun run lint` — 0 errors in my 3 facility view files. (3 pre-existing errors remain in other agents' files: `booking-form-view.tsx`, `user-management-view.tsx` — not my scope.)
- `bunx tsc --noEmit --skipLibCheck` — 0 errors in my 3 facility view files. (Pre-existing errors in API routes, prisma seed, skills, and examples — not my scope.)
- `dev.log` — last entries show `✓ Compiled in 202ms` and `✓ Compiled in 260ms`. The Module Not Found errors visible in the log are only for OTHER agents' view components (booking-detail-view, calendar-view, my-bookings-view, approval-panel-view, all-bookings-view, user-management-view, audit-logs-view). My facility views resolve cleanly.

## What Other Agents Should Know
- The `["facilities"]` TanStack Query key is shared between the list view, the detail view (invalidates on delete), and the form view (invalidates on create/update). If you build a calendar view or booking form that needs to show facilities, reuse the same key — invalidations will propagate automatically.
- The `["facility", id]` key is shared between the detail view and the form view (for prefill). The form view invalidates it on successful update so the detail view re-fetches when the user navigates back.
- The facility detail view's "Tempah Fasiliti Ini" button calls `startBooking(facilityId)` from the app store. The booking form view should read `preselectedFacilityId` from the store to prefill its facility field.
- The facility form view expects `editingFacilityId` from the app store. `editFacility(null)` opens the form in create mode; `editFacility(id)` opens it in edit mode with prefill.
- The form's submit handler navigates to `viewFacility(data.id)` on success — so after creating/editing a facility, the user lands on that facility's detail page (not the list).
- The `["users", "manager"]` query is scoped to admins in the form view (`enabled: !!session && isAdmin`) since only admins can access the form. If you need managers elsewhere, use a separate key like `["users", "manager", "list"]`.
- All API calls use relative paths (`/api/facilities`, `/api/facilities/[id]`, `/api/users?role=manager`) so they route through the Next.js dev server — no `XTransformPort` needed.
