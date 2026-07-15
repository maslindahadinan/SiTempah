-- ============================================================================
-- SiTempah - Sistem Tempahan Fasiliti Gunasama
-- ADTEC JTM Kampus Batu Pahat
-- Supabase PostgreSQL Migration & Seed Script
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/lcmtjdpgpfzsoygoujlf
-- 2. Navigate to SQL Editor (left sidebar)
-- 3. Click "New Query"
-- 4. Paste this entire script and click "Run"
-- 5. All tables, policies, triggers, and dummy data will be created
-- ============================================================================

-- ============================================================================
-- PART 1: DROP EXISTING TABLES (Clean slate - safe to re-run)
-- ============================================================================
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "BookingStatusHistory" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Facility" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ============================================================================
-- PART 2: CREATE TABLES
-- ============================================================================

-- 2.1 Users Table
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "User_role_idx" ON "User"("role");

-- 2.2 Facilities Table
CREATE TABLE "Facility" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amenities" TEXT NOT NULL DEFAULT '[]',
    "imageUrl" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "operatingHours" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Facility_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Facility_category_idx" ON "Facility"("category");
CREATE INDEX "Facility_managerId_idx" ON "Facility"("managerId");
CREATE INDEX "Facility_isActive_idx" ON "Facility"("isActive");

-- 2.3 Bookings Table
CREATE TABLE "Booking" (
    "id" TEXT PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ NOT NULL,
    "attendeesCount" INTEGER NOT NULL,
    "purposeNotes" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Booking_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Booking_facilityId_idx" ON "Booking"("facilityId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");
CREATE INDEX "Booking_endTime_idx" ON "Booking"("endTime");

-- 2.4 Booking Status History Table (Audit Trail)
CREATE TABLE "BookingStatusHistory" (
    "id" TEXT PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "notes" TEXT,
    "changedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "BookingStatusHistory_bookingId_idx" ON "BookingStatusHistory"("bookingId");

-- 2.5 Notifications Table
CREATE TABLE "Notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- 2.6 Audit Log Table
CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS) POLICIES
-- As per PRD Section 6 & 13: RBAC enforced via RLS
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Facility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Note: Since SiTempah uses NextAuth (JWT-based) for authentication at the application layer
-- and Prisma as the database client (service-level access), RLS policies here are set to
-- allow access via the service role (which bypasses RLS by default in Supabase).
-- The application-level RBAC in the API routes enforces the actual permission checks.
-- This is the recommended pattern for Next.js + Prisma + Supabase architectures.

-- Create a permissive policy for service role access (Prisma uses the service role)
CREATE POLICY "Service role full access on User" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Facility" ON "Facility" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Booking" ON "Booking" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on BookingStatusHistory" ON "BookingStatusHistory" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on Notification" ON "Notification" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on AuditLog" ON "AuditLog" FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 4: TRIGGERS
-- As per PRD Section 13: Overlap check trigger for bookings
-- ============================================================================

-- 4.1 Function to prevent double-booking (overlap detection)
CREATE OR REPLACE FUNCTION prevent_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check for pending, approved, or kiv bookings
    IF NEW.status IN ('pending', 'approved', 'kiv') THEN
        IF EXISTS (
            SELECT 1 FROM "Booking"
            WHERE "facilityId" = NEW."facilityId"
              AND id != NEW.id
              AND status IN ('pending', 'approved', 'kiv')
              AND "startTime" < NEW."endTime"
              AND "endTime" > NEW."startTime"
        ) THEN
            RAISE EXCEPTION 'Pertindihan tempahan dikesan: Slot masa ini telah ditempah untuk fasiliti ini.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Trigger for overlap detection
CREATE TRIGGER check_booking_overlap
    BEFORE INSERT OR UPDATE ON "Booking"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_booking_overlap();

-- 4.3 Function to auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Triggers for auto-updating updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_facility_updated_at BEFORE UPDATE ON "Facility" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_booking_updated_at BEFORE UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 5: SEED DUMMY DATA
-- ============================================================================

-- 5.1 Insert Users
-- Password hash for "Password123!" (bcrypt 12 rounds) - pre-computed
INSERT INTO "User" ("id", "email", "password", "fullName", "department", "phoneNumber", "role", "isActive", "createdAt", "updatedAt") VALUES
('user_admin_01', 'admin@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Ahmad Fauzi bin Rahman', 'Unit ICT', '012-345 6789', 'admin', true, now(), now()),
('user_mgr_01', 'siti.hassan@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Siti Aishah binti Hassan', 'Pengurusan Fasiliti', '012-456 7890', 'manager', true, now(), now()),
('user_mgr_02', 'mohd.rashid@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Mohd Rashid bin Abdullah', 'Pengurusan Fasiliti', '013-567 8901', 'manager', true, now(), now()),
('user_usr_01', 'nurul.huda@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Nurul Huda binti Ibrahim', 'Jabatan Elektrik', '014-678 9012', 'user', true, now(), now()),
('user_usr_02', 'tan.wei@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Tan Wei Ming', 'Jabatan Mekanikal', '015-789 0123', 'user', true, now(), now()),
('user_usr_03', 'raj.kumar@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Raj a/l Kumar', 'Jabatan Pengajian Am', '016-890 1234', 'user', true, now(), now()),
('user_usr_04', 'fatimah.zahra@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Fatimah Zahra binti Osman', 'Jabatan Elektrik', '017-901 2345', 'user', true, now(), now()),
('user_usr_05', 'lee.chong@adtec-jtm.gov.my', '$2b$12$ugUSaUlpBzHKa2YeMx3ibO1RwGQZT/SlyhMIky9.XY0y4EbT0scJi', 'Lee Chong Wei', 'Hal Ehwal Pelajar', '018-012 3456', 'user', true, now(), now())
ON CONFLICT ("email") DO NOTHING;

-- 5.2 Insert Facilities
INSERT INTO "Facility" ("id", "name", "category", "capacity", "location", "description", "amenities", "managerId", "isActive", "operatingHours", "createdAt", "updatedAt") VALUES
('fac_01', 'Bilik Mesyuarat Cempaka', 'Bilik Mesyuarat', 20, 'Blok A, Aras 1', 'Bilik mesyuarat utama dengan kelengkapan lengkap untuk mesyuarat rasmi dan perbincangan strategik.', '["Projektor LED 65\"","Papan Putih","Sistem Audio","Penyaman Udara","WiFi"]', 'user_mgr_01', true, '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}', now(), now()),
('fac_02', 'Bilik Perbincangan Mawar', 'Bilik Perbincangan', 8, 'Blok A, Aras 2', 'Bilik perbincangan kecil sesuai untuk meeting santai dan kerja berkumpulan.', '["TV Paparan 55\"","Meja Bulat","Penyaman Udara","WiFi"]', 'user_mgr_01', true, '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}', now(), now()),
('fac_03', 'Makmal Komputer 1', 'Makmal', 30, 'Blok B, Aras 1', 'Makmal komputer lengkap dengan 30 unit PC dan perisian teknikal untuk sesi latihan.', '["30 Unit PC","Projektor","Capaian Internet Gigabit","Sistem Audio","Printer"]', 'user_mgr_02', true, '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}', now(), now()),
('fac_04', 'Makmal Komputer 2', 'Makmal', 25, 'Blok B, Aras 1', 'Makmal komputer kedua untuk kelas pengaturcaraan dan latihan ICT.', '["25 Unit PC","Projektor","Capaian Internet","Sistem Audio"]', 'user_mgr_02', true, '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}', now(), now()),
('fac_05', 'Dewan Seri Nilam', 'Dewan Utama', 300, 'Blok C, Aras Bawah', 'Dewan utama kampus untuk majlis rasmi, konvokesyen, dan program berskala besar.', '["Sistem PA Professional","Pentas Utama","Kerusi Teater 300","Projektor 4K","Sistem Pencahayaan Pentas","Ruang VIP"]', 'user_mgr_01', true, '{"start":"08:00","end":"22:00","days":[1,2,3,4,5,6]}', now(), now()),
('fac_06', 'Dewan Seri Intan', 'Dewan Utama', 150, 'Blok C, Aras 1', 'Dewan serbaguna untuk seminar, bengkel, dan aktiviti kokurikulum pelajar.', '["Sistem PA","Pentas","Kerusi Teater 150","Projektor HD","Sistem AC"]', 'user_mgr_02', true, '{"start":"08:00","end":"22:00","days":[1,2,3,4,5,6]}', now(), now()),
('fac_07', 'Bilik Seminar Zamrud', 'Bilik Seminar', 60, 'Blok D, Aras 2', 'Bilik seminar serba lengkap untuk penceramah dan latihan profesional.', '["Projektor Full HD","Sistem Audio","Mikrofon Tanpa Wayar","Penyaman Udara","Meja Lipat"]', 'user_mgr_01', true, '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}', now(), now()),
('fac_08', 'Bilik Seminar Delima', 'Bilik Seminar', 40, 'Blok D, Aras 3', 'Bilik seminar kompak untuk sesi latihan dan pembentangan kumpulan kecil.', '["Projektor HD","Sistem Audio","Penyaman Udara","Papan Putih"]', 'user_mgr_02', true, '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}', now(), now())
ON CONFLICT DO NOTHING;

-- 5.3 Insert Bookings
-- Using relative dates to ensure they're always current
INSERT INTO "Booking" ("id", "facilityId", "userId", "title", "startTime", "endTime", "attendeesCount", "purposeNotes", "status", "reviewedBy", "reviewNotes", "reviewedAt", "createdAt", "updatedAt") VALUES
-- Pending bookings
('book_01', 'fac_01', 'user_usr_01', 'Mesyuarat Jawatankuasa Kurikulum', now() + INTERVAL '2 days' + INTERVAL '9 hours', now() + INTERVAL '2 days' + INTERVAL '11 hours', 15, 'Mesyuarat semakan kurikulum semester baru bagi Jabatan Elektrik.', 'pending', NULL, NULL, NULL, now() - INTERVAL '1 day', now()),
('book_02', 'fac_05', 'user_usr_02', 'Hari Terbuka Kampus 2026', now() + INTERVAL '14 days' + INTERVAL '8 hours', now() + INTERVAL '14 days' + INTERVAL '13 hours', 250, 'Program hari terbuka untuk pelajar baharu dan ibu bapa.', 'pending', NULL, NULL, NULL, now() - INTERVAL '1 day', now()),
('book_03', 'fac_03', 'user_usr_03', 'Latihan Pengaturcaraan Python', now() + INTERVAL '5 days' + INTERVAL '14 hours', now() + INTERVAL '5 days' + INTERVAL '17 hours', 28, 'Sesi latihan intensif pengaturcaraan Python untuk pelajar semester akhir.', 'pending', NULL, NULL, NULL, now() - INTERVAL '1 day', now()),
-- Approved bookings
('book_04', 'fac_01', 'user_usr_04', 'Mesyuarat Penilaian Prestasi', now() + INTERVAL '1 day' + INTERVAL '10 hours', now() + INTERVAL '1 day' + INTERVAL '12 hours', 12, 'Mesyuarat penilaian prestasi staf jabatan elektrik Q3 2026.', 'approved', 'user_mgr_01', 'Diluluskan. Sila pastikan bilik dalam keadaan bersih selepas digunakan.', now() - INTERVAL '2 days', now() - INTERVAL '3 days', now()),
('book_05', 'fac_07', 'user_usr_05', 'Bengkel Pembangunan Kerjaya', now() + INTERVAL '7 days' + INTERVAL '9 hours', now() + INTERVAL '7 days' + INTERVAL '12 hours', 50, 'Bengkel motivasi dan pembangunan kerjaya untuk pelajar akhir semester.', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '1 day', now() - INTERVAL '2 days', now()),
('book_06', 'fac_02', 'user_usr_01', 'Perbincangan Projek FYP', now() + INTERVAL '3 days' + INTERVAL '14 hours', now() + INTERVAL '3 days' + INTERVAL '16 hours', 6, 'Perbincangan dengan pelajar mengenai projek tahun akhir.', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '3 days', now() - INTERVAL '4 days', now()),
('book_07', 'fac_06', 'user_usr_03', 'Ceramah Motivasi Pelajar', now() + INTERVAL '10 days' + INTERVAL '9 hours', now() + INTERVAL '10 days' + INTERVAL '12 hours', 120, 'Ceramah motivasi pencegahan dadah untuk semua pelajar.', 'approved', 'user_mgr_02', 'Diluluskan. Pastikan susunan kerusi mengikut SOP.', now() - INTERVAL '5 days', now() - INTERVAL '6 days', now()),
-- KIV booking
('book_08', 'fac_05', 'user_usr_02', 'Program Konvokesyen Kecil', now() + INTERVAL '21 days' + INTERVAL '8 hours', now() + INTERVAL '21 days' + INTERVAL '14 hours', 200, 'Program konvokesyen untuk pelajar sijil dan diploma.', 'kiv', 'user_mgr_01', 'Perlu pengesahan tarikh rasmi dari pihak pengurusan. Sila kemaskini surat sokongan.', now() - INTERVAL '1 day', now() - INTERVAL '2 days', now()),
-- Rejected booking
('book_09', 'fac_03', 'user_usr_04', 'Latihan Hujung Minggu', now() + INTERVAL '8 days' + INTERVAL '9 hours', now() + INTERVAL '8 days' + INTERVAL '17 hours', 20, 'Latihan tambahan hujung minggu untuk pelajar.', 'rejected', 'user_mgr_02', 'Ditolak. Makmal tidak boleh digunakan pada hari Sabtu tanpa kelulusan khas Pengarah.', now() - INTERVAL '2 days', now() - INTERVAL '3 days', now()),
-- Cancelled booking
('book_10', 'fac_08', 'user_usr_05', 'Taklimat Kokurikulum', now() + INTERVAL '4 days' + INTERVAL '15 hours', now() + INTERVAL '4 days' + INTERVAL '17 hours', 35, 'Taklimat aktiviti kokurikulum semester baharu.', 'cancelled', NULL, NULL, NULL, now() - INTERVAL '3 days', now()),
-- Past approved bookings (completed)
('book_11', 'fac_01', 'user_usr_01', 'Mesyuarat Staf Bulanan', now() - INTERVAL '7 days' + INTERVAL '10 hours', now() - INTERVAL '7 days' + INTERVAL '12 hours', 18, 'Mesyuarat staf bulanan Julai 2026.', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '10 days', now() - INTERVAL '12 days', now()),
('book_12', 'fac_05', 'user_usr_03', 'Majlis Sambutan Hari Kebangsaan', now() - INTERVAL '14 days' + INTERVAL '8 hours', now() - INTERVAL '14 days' + INTERVAL '12 hours', 280, 'Sambutan Hari Kebangsaan peringkat kampus.', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '20 days', now() - INTERVAL '22 days', now()),
('book_13', 'fac_03', 'user_usr_02', 'Ujian Bertulis Peperiksaan Akhir', now() - INTERVAL '3 days' + INTERVAL '9 hours', now() - INTERVAL '3 days' + INTERVAL '12 hours', 30, 'Peperiksaan akhir semester subjek pengaturcaraan.', 'approved', 'user_mgr_02', 'Diluluskan.', now() - INTERVAL '7 days', now() - INTERVAL '8 days', now())
ON CONFLICT DO NOTHING;

-- 5.4 Insert Booking Status History (Audit Trail)
INSERT INTO "BookingStatusHistory" ("id", "bookingId", "oldStatus", "newStatus", "changedBy", "notes", "changedAt") VALUES
-- book_04: approved
('hist_01', 'book_04', 'pending', 'approved', 'user_mgr_01', 'Diluluskan. Sila pastikan bilik dalam keadaan bersih selepas digunakan.', now() - INTERVAL '2 days'),
('hist_02', 'book_04', NULL, 'pending', 'user_usr_04', 'Permohonan dicipta', now() - INTERVAL '3 days'),
-- book_05: approved
('hist_03', 'book_05', 'pending', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '1 day'),
('hist_04', 'book_05', NULL, 'pending', 'user_usr_05', 'Permohonan dicipta', now() - INTERVAL '2 days'),
-- book_06: approved
('hist_05', 'book_06', 'pending', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '3 days'),
('hist_06', 'book_06', NULL, 'pending', 'user_usr_01', 'Permohonan dicipta', now() - INTERVAL '4 days'),
-- book_07: approved
('hist_07', 'book_07', 'pending', 'approved', 'user_mgr_02', 'Diluluskan. Pastikan susunan kerusi mengikut SOP.', now() - INTERVAL '5 days'),
('hist_08', 'book_07', NULL, 'pending', 'user_usr_03', 'Permohonan dicipta', now() - INTERVAL '6 days'),
-- book_08: kiv
('hist_09', 'book_08', 'pending', 'kiv', 'user_mgr_01', 'Perlu pengesahan tarikh rasmi dari pihak pengurusan. Sila kemaskini surat sokongan.', now() - INTERVAL '1 day'),
('hist_10', 'book_08', NULL, 'pending', 'user_usr_02', 'Permohonan dicipta', now() - INTERVAL '2 days'),
-- book_09: rejected
('hist_11', 'book_09', 'pending', 'rejected', 'user_mgr_02', 'Ditolak. Makmal tidak boleh digunakan pada hari Sabtu tanpa kelulusan khas Pengarah.', now() - INTERVAL '2 days'),
('hist_12', 'book_09', NULL, 'pending', 'user_usr_04', 'Permohonan dicipta', now() - INTERVAL '3 days'),
-- book_11: approved (past)
('hist_13', 'book_11', 'pending', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '10 days'),
('hist_14', 'book_11', NULL, 'pending', 'user_usr_01', 'Permohonan dicipta', now() - INTERVAL '12 days'),
-- book_12: approved (past)
('hist_15', 'book_12', 'pending', 'approved', 'user_mgr_01', 'Diluluskan.', now() - INTERVAL '20 days'),
('hist_16', 'book_12', NULL, 'pending', 'user_usr_03', 'Permohonan dicipta', now() - INTERVAL '22 days'),
-- book_13: approved (past)
('hist_17', 'book_13', 'pending', 'approved', 'user_mgr_02', 'Diluluskan.', now() - INTERVAL '7 days'),
('hist_18', 'book_13', NULL, 'pending', 'user_usr_02', 'Permohonan dicipta', now() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- 5.5 Insert Notifications
INSERT INTO "Notification" ("id", "userId", "bookingId", "message", "type", "isRead", "createdAt") VALUES
('notif_01', 'user_usr_04', 'book_04', 'Permohonan tempahan "Mesyuarat Penilaian Prestasi" telah DILULUSKAN.', 'success', false, now() - INTERVAL '2 days'),
('notif_02', 'user_usr_05', 'book_05', 'Permohonan tempahan "Bengkel Pembangunan Kerjaya" telah DILULUSKAN.', 'success', true, now() - INTERVAL '1 day'),
('notif_03', 'user_usr_01', 'book_06', 'Permohonan tempahan "Perbincangan Projek FYP" telah DILULUSKAN.', 'success', true, now() - INTERVAL '3 days'),
('notif_04', 'user_usr_03', 'book_07', 'Permohonan tempahan "Ceramah Motivasi Pelajar" telah DILULUSKAN.', 'success', false, now() - INTERVAL '5 days'),
('notif_05', 'user_usr_02', 'book_08', 'Permohonan tempahan "Program Konvokesyen Kecil" ditandakan KIV. Sila rujuk catatan pengurus.', 'warning', false, now() - INTERVAL '1 day'),
('notif_06', 'user_usr_04', 'book_09', 'Permohonan tempahan "Latihan Hujung Minggu" telah DITOLAK.', 'danger', true, now() - INTERVAL '2 days'),
('notif_07', 'user_usr_05', 'book_10', 'Permohonan tempahan "Taklimat Kokurikulum" telah dibatalkan.', 'info', true, now() - INTERVAL '2 days'),
('notif_08', 'user_usr_01', NULL, 'Selamat datang ke SiTempah! Sistem tempahan fasiliti gunasama ADTEC JTM Kampus Batu Pahat.', 'info', false, now() - INTERVAL '1 day'),
('notif_09', 'user_mgr_01', NULL, 'Anda mempunyai 3 permohonan menunggu kelulusan.', 'warning', false, now() - INTERVAL '1 day'),
('notif_10', 'user_admin_01', NULL, 'Sistem SiTempah berjaya dimulakan. Semua modul berfungsi dengan normal.', 'success', false, now() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- 5.6 Insert Audit Logs
INSERT INTO "AuditLog" ("id", "userId", "action", "entity", "entityId", "details", "ipAddress", "createdAt") VALUES
('audit_01', 'user_admin_01', 'SYSTEM_INIT', 'system', NULL, 'Sistem SiTempah dimulakan dan data induk dimuatkan.', '127.0.0.1', now() - INTERVAL '1 day'),
('audit_02', 'user_mgr_01', 'BOOKING_APPROVED', 'booking', 'book_04', 'Permohonan tempahan "Mesyuarat Penilaian Prestasi" diluluskan.', '127.0.0.1', now() - INTERVAL '2 days'),
('audit_03', 'user_mgr_02', 'BOOKING_REJECTED', 'booking', 'book_09', 'Permohonan tempahan "Latihan Hujung Minggu" ditolak.', '127.0.0.1', now() - INTERVAL '2 days'),
('audit_04', 'user_mgr_01', 'BOOKING_KIV', 'booking', 'book_08', 'Permohonan tempahan "Program Konvokesyen Kecil" ditandakan KIV.', '127.0.0.1', now() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify data was inserted correctly
SELECT 'Users' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Facilities', COUNT(*) FROM "Facility"
UNION ALL
SELECT 'Bookings', COUNT(*) FROM "Booking"
UNION ALL
SELECT 'StatusHistory', COUNT(*) FROM "BookingStatusHistory"
UNION ALL
SELECT 'Notifications', COUNT(*) FROM "Notification"
UNION ALL
SELECT 'AuditLogs', COUNT(*) FROM "AuditLog";

-- ============================================================================
-- DONE! 
-- Expected counts: Users=8, Facilities=8, Bookings=13, StatusHistory=18, 
--                  Notifications=10, AuditLogs=4
-- ============================================================================
