# SiTempah - Sistem Tempahan Fasiliti Gunasama

**ADTEC JTM Kampus Batu Pahat** — Facility Booking System with Glassmorphism UI

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC)](https://tailwindcss.com/)

## Overview

SiTempah is a comprehensive facility booking system developed for Jabatan Tenaga Manusia (JTM), ADTEC Kampus Batu Pahat. It enables online booking of shared facilities (meeting rooms, halls, computer labs, seminar rooms) with a structured approval workflow.

## Features

- **3 User Roles** with Role-Based Access Control (RBAC): User, Manager, Admin
- **Facility Management** — Full CRUD for 8 facility types
- **Booking System** — Calendar view, conflict detection, multi-step booking form
- **Approval Workflow** — Approve / KIV (Kept-In-View) / Reject with review notes
- **Audit Trail** — Immutable logging of all critical actions
- **Notifications** — In-system notifications for status changes
- **Dashboard** — Role-based stats with interactive charts
- **Glassmorphism UI/UX** — Modern translucent glass design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (App Router) |
| Database | Supabase (PostgreSQL) via PostgREST API |
| Authentication | NextAuth.js v4 (JWT, bcrypt) |
| Charts | Recharts |
| State | Zustand, TanStack Query |

## Security Features

- Bcrypt password hashing (12 rounds)
- NextAuth JWT sessions (8-hour expiry)
- RBAC enforced on all API endpoints
- Rate limiting on registration & booking creation
- Zod input validation
- JTM email domain validation
- Booking overlap prevention (database trigger + app-level check)
- Immutable audit trail
- Row Level Security (RLS) on Supabase

## Demo Accounts

All accounts use password: `Password123!`

| Role | Email |
|------|-------|
| Admin | admin@adtec-jtm.gov.my |
| Manager | siti.hassan@adtec-jtm.gov.my |
| Manager | mohd.rashid@adtec-jtm.gov.my |
| User | nurul.huda@adtec-jtm.gov.my |
| User | tan.wei@adtec-jtm.gov.my |
| User | raj.kumar@adtec-jtm.gov.my |
| User | fatimah.zahra@adtec-jtm.gov.my |
| User | lee.chong@adtec-jtm.gov.my |

## Environment Variables

Create a `.env` file in the root directory:

```env
NEXTAUTH_SECRET=your-secret-key-here
```

The Supabase connection is configured in `src/lib/supabase-client.ts`.

## Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase Dashboard
3. Run the SQL migration script (includes tables, RLS policies, triggers, and seed data)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment (Vercel)

### Option A: Via Vercel Dashboard
1. Push this repository to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click **Add New** → **Project**
4. Import your GitHub repo: `maslindahadinan/SiTempah`
5. Vercel auto-detects Next.js — no config needed
6. Add environment variable: `NEXTAUTH_SECRET` = `sitempah-adtec-jtm-batu-pahat-secret-key-2026-very-secure-glm52`
7. Click **Deploy**

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

## Deployment (Netlify - Alternative)

1. Push this repository to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. Click **Add new site** → **Import an existing project**
4. Connect your GitHub repo
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Add environment variable: `NEXTAUTH_SECRET`
7. Deploy!

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (facilities, bookings, users, etc.)
│   ├── globals.css       # Glassmorphism design system
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main entry (auth gate)
├── components/
│   ├── auth/             # Login form
│   ├── approval/         # Approval panel, all bookings table
│   ├── bookings/         # Calendar, booking form, my bookings, detail
│   ├── common/           # Status badge, shared components
│   ├── dashboard/        # Role-based dashboard
│   ├── facilities/       # Facility list, detail, form
│   ├── layout/           # App shell, sidebar, header, footer
│   ├── notifications/    # Notification bell, notifications view
│   └── users/            # User management, profile, audit logs
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── db.ts             # Prisma-compatible Supabase wrapper
│   ├── session.ts        # Auth helpers
│   ├── supabase-client.ts # Supabase client
│   └── utils.ts          # Utilities
└── stores/
    └── app-store.ts      # Zustand state management
```

## License

© 2026 ADTEC JTM Kampus Batu Pahat. Internal use only.
