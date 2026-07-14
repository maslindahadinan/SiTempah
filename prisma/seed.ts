import { db } from "../src/lib/db"
import bcrypt from "bcryptjs"

async function main() {
  console.log("🌱 Seeding SiTempah database...")

  // Clear existing data
  await db.notification.deleteMany()
  await db.bookingStatusHistory.deleteMany()
  await db.booking.deleteMany()
  await db.facility.deleteMany()
  await db.auditLog.deleteMany()
  await db.user.deleteMany()

  // Hash passwords
  const passwordHash = await bcrypt.hash("Password123!", 12)

  // ============ USERS ============
  const admin = await db.user.create({
    data: {
      email: "admin@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Ahmad Fauzi bin Rahman",
      department: "Unit ICT",
      phoneNumber: "012-345 6789",
      role: "admin",
    },
  })

  const manager1 = await db.user.create({
    data: {
      email: "siti.hassan@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Siti Aishah binti Hassan",
      department: "Pengurusan Fasiliti",
      phoneNumber: "012-456 7890",
      role: "manager",
    },
  })

  const manager2 = await db.user.create({
    data: {
      email: "mohd.rashid@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Mohd Rashid bin Abdullah",
      department: "Pengurusan Fasiliti",
      phoneNumber: "013-567 8901",
      role: "manager",
    },
  })

  const user1 = await db.user.create({
    data: {
      email: "nurul.huda@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Nurul Huda binti Ibrahim",
      department: "Jabatan Elektrik",
      phoneNumber: "014-678 9012",
      role: "user",
    },
  })

  const user2 = await db.user.create({
    data: {
      email: "tan.wei@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Tan Wei Ming",
      department: "Jabatan Mekanikal",
      phoneNumber: "015-789 0123",
      role: "user",
    },
  })

  const user3 = await db.user.create({
    data: {
      email: "raj.kumar@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Raj a/l Kumar",
      department: "Jabatan Pengajian Am",
      phoneNumber: "016-890 1234",
      role: "user",
    },
  })

  const user4 = await db.user.create({
    data: {
      email: "fatimah.zahra@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Fatimah Zahra binti Osman",
      department: "Jabatanelektrik",
      phoneNumber: "017-901 2345",
      role: "user",
    },
  })

  const user5 = await db.user.create({
    data: {
      email: "lee.chong@adtec-jtm.gov.my",
      password: passwordHash,
      fullName: "Lee Chong Wei",
      department: "Hal Ehwal Pelajar",
      phoneNumber: "018-012 3456",
      role: "user",
    },
  })

  console.log("✅ Created users")

  // ============ FACILITIES ============
  const facilities = [
    {
      name: "Bilik Mesyuarat Cempaka",
      category: "Bilik Mesyuarat",
      capacity: 20,
      location: "Blok A, Aras 1",
      description: "Bilik mesyuarat utama dengan kelengkapan lengkap untuk mesyuarat rasmi dan perbincangan strategik.",
      amenities: JSON.stringify(["Projektor LED 65\"", "Papan Putih", "Sistem Audio", "Penyaman Udara", "WiFi"]),
      managerId: manager1.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "17:00", days: [1,2,3,4,5] }),
    },
    {
      name: "Bilik Perbincangan Mawar",
      category: "Bilik Perbincangan",
      capacity: 8,
      location: "Blok A, Aras 2",
      description: "Bilik perbincangan kecil sesuai untuk meeting santai dan kerja berkumpulan.",
      amenities: JSON.stringify(["TV Paparan 55\"", "Meja Bulat", "Penyaman Udara", "WiFi"]),
      managerId: manager1.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "17:00", days: [1,2,3,4,5] }),
    },
    {
      name: "Makmal Komputer 1",
      category: "Makmal",
      capacity: 30,
      location: "Blok B, Aras 1",
      description: "Makmal komputer lengkap dengan 30 unit PC dan perisian teknikal untuk sesi latihan.",
      amenities: JSON.stringify(["30 Unit PC", "Projektor", "Capaian Internet Gigabit", "Sistem Audio", "Printer"]),
      managerId: manager2.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "17:00", days: [1,2,3,4,5] }),
    },
    {
      name: "Makmal Komputer 2",
      category: "Makmal",
      capacity: 25,
      location: "Blok B, Aras 1",
      description: "Makmal komputer kedua untuk kelas pengaturcaraan dan latihan ICT.",
      amenities: JSON.stringify(["25 Unit PC", "Projektor", "Capaian Internet", "Sistem Audio"]),
      managerId: manager2.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "17:00", days: [1,2,3,4,5] }),
    },
    {
      name: "Dewan Seri Nilam",
      category: "Dewan Utama",
      capacity: 300,
      location: "Blok C, Aras Bawah",
      description: "Dewan utama kampus untuk majlis rasmi, konvokesyen, dan program berskala besar.",
      amenities: JSON.stringify(["Sistem PA Professional", "Pentas Utama", "Kerusi Teater 300", "Projektor 4K", "Sistem Pencahayaan Pentas", "Ruang VIP"]),
      managerId: manager1.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "22:00", days: [1,2,3,4,5,6] }),
    },
    {
      name: "Dewan Seri Intan",
      category: "Dewan Utama",
      capacity: 150,
      location: "Blok C, Aras 1",
      description: "Dewan serbaguna untuk seminar, bengkel, dan aktiviti kokurikulum pelajar.",
      amenities: JSON.stringify(["Sistem PA", "Pentas", "Kerusi Teater 150", "Projektor HD", "Sistem AC"]),
      managerId: manager2.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "22:00", days: [1,2,3,4,5,6] }),
    },
    {
      name: "Bilik Seminar Zamrud",
      category: "Bilik Seminar",
      capacity: 60,
      location: "Blok D, Aras 2",
      description: "Bilik seminar serba lengkap untuk penceramah dan latihan profesional.",
      amenities: JSON.stringify(["Projektor Full HD", "Sistem Audio", "Mikrofon Tanpa Wayar", "Penyaman Udara", "Meja Lipat"]),
      managerId: manager1.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "17:00", days: [1,2,3,4,5] }),
    },
    {
      name: "Bilik Seminar Delima",
      category: "Bilik Seminar",
      capacity: 40,
      location: "Blok D, Aras 3",
      description: "Bilik seminar kompak untuk sesi latihan dan pembentangan kumpulan kecil.",
      amenities: JSON.stringify(["Projektor HD", "Sistem Audio", "Penyaman Udara", "Papan Putih"]),
      managerId: manager2.id,
      operatingHours: JSON.stringify({ start: "08:00", end: "17:00", days: [1,2,3,4,5] }),
    },
  ]

  const createdFacilities = []
  for (const f of facilities) {
    const facility = await db.facility.create({ data: f })
    createdFacilities.push(facility)
  }

  console.log("✅ Created facilities")

  // ============ BOOKINGS ============
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const bookingsData = [
    // Pending bookings
    {
      facility: createdFacilities[0], // Bilik Mesyuarat Cempaka
      user: user1,
      title: "Mesyuarat Jawatankuasa Kurikulum",
      startTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
      attendeesCount: 15,
      purposeNotes: "Mesyuarat semakan kurikulum semester baru bagi Jabatan Elektrik.",
      status: "pending",
    },
    {
      facility: createdFacilities[4], // Dewan Seri Nilam
      user: user2,
      title: "Hari Terbuka Kampus 2026",
      startTime: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000),
      attendeesCount: 250,
      purposeNotes: "Program hari terbuka untuk pelajar baharu dan ibu bapa.",
      status: "pending",
    },
    {
      facility: createdFacilities[2], // Makmal Komputer 1
      user: user3,
      title: "Latihan Pengaturcaraan Python",
      startTime: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000),
      attendeesCount: 28,
      purposeNotes: "Sesi latihan intensif pengaturcaraan Python untuk pelajar semester akhir.",
      status: "pending",
    },
    // Approved bookings
    {
      facility: createdFacilities[0], // Bilik Mesyuarat Cempaka
      user: user4,
      title: "Mesyuarat Penilaian Prestasi",
      startTime: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      attendeesCount: 12,
      purposeNotes: "Mesyuarat penilaian prestasi staf jabatan elektrik Q3 2026.",
      status: "approved",
      reviewedBy: manager1.id,
      reviewNotes: "Diluluskan. Sila pastikan bilik dalam keadaan bersih selepas digunakan.",
      reviewedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      facility: createdFacilities[6], // Bilik Seminar Zamrud
      user: user5,
      title: "Bengkel Pembangunan Kerjaya",
      startTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      attendeesCount: 50,
      purposeNotes: "Bengkel motivasi dan pembangunan kerjaya untuk pelajar akhir semester.",
      status: "approved",
      reviewedBy: manager1.id,
      reviewNotes: "Diluluskan.",
      reviewedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      facility: createdFacilities[1], // Bilik Perbincangan Mawar
      user: user1,
      title: "Perbincangan Projek FYP",
      startTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
      attendeesCount: 6,
      purposeNotes: "Perbincangan dengan pelajar mengenai projek tahun akhir.",
      status: "approved",
      reviewedBy: manager1.id,
      reviewNotes: "Diluluskan.",
      reviewedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      facility: createdFacilities[5], // Dewan Seri Intan
      user: user3,
      title: "Ceramah Motivasi Pelajar",
      startTime: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      attendeesCount: 120,
      purposeNotes: "Ceramah motivasi pencegahan dadah untuk semua pelajar.",
      status: "approved",
      reviewedBy: manager2.id,
      reviewNotes: "Diluluskan. Pastikan susunan kerusi mengikut SOP.",
      reviewedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    // KIV bookings
    {
      facility: createdFacilities[4], // Dewan Seri Nilam
      user: user2,
      title: "Program Konvokesyen Kecil",
      startTime: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      attendeesCount: 200,
      purposeNotes: "Program konvokesyen untuk pelajar sijil dan diploma.",
      status: "kiv",
      reviewedBy: manager1.id,
      reviewNotes: "Perlu pengesahan tarikh rasmi dari pihak pengurusan. Sila kemaskini surat sokongan.",
      reviewedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    // Rejected bookings
    {
      facility: createdFacilities[2], // Makmal Komputer 1
      user: user4,
      title: "Latihan Hujung Minggu",
      startTime: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000),
      attendeesCount: 20,
      purposeNotes: "Latihan tambahan hujung minggu untuk pelajar.",
      status: "rejected",
      reviewedBy: manager2.id,
      reviewNotes: "Ditolak. Makmal tidak boleh digunakan pada hari Sabtu tanpa kelulusan khas Pengarah.",
      reviewedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    // Cancelled bookings
    {
      facility: createdFacilities[7], // Bilik Seminar Delima
      user: user5,
      title: "Taklimat Kokurikulum",
      startTime: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000),
      attendeesCount: 35,
      purposeNotes: "Taklimat aktiviti kokurikulum semester baharu.",
      status: "cancelled",
    },
    // Past approved bookings (completed)
    {
      facility: createdFacilities[0], // Bilik Mesyuarat Cempaka
      user: user1,
      title: "Mesyuarat Staf Bulanan",
      startTime: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      attendeesCount: 18,
      purposeNotes: "Mesyuarat staf bulanan Julai 2026.",
      status: "approved",
      reviewedBy: manager1.id,
      reviewNotes: "Diluluskan.",
      reviewedAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      facility: createdFacilities[4], // Dewan Seri Nilam
      user: user3,
      title: "Majlis Sambutan Hari Kebangsaan",
      startTime: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      attendeesCount: 280,
      purposeNotes: "Sambutan Hari Kebangsaan peringkat kampus.",
      status: "approved",
      reviewedBy: manager1.id,
      reviewNotes: "Diluluskan.",
      reviewedAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      facility: createdFacilities[2], // Makmal Komputer 1
      user: user2,
      title: "Ujian Bertulis Peperiksaan Akhir",
      startTime: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      attendeesCount: 30,
      purposeNotes: "Peperiksaan akhir semester subjek pengaturcaraan.",
      status: "approved",
      reviewedBy: manager2.id,
      reviewNotes: "Diluluskan.",
      reviewedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const bd of bookingsData) {
    const booking = await db.booking.create({
      data: {
        facilityId: bd.facility.id,
        userId: bd.user.id,
        title: bd.title,
        startTime: bd.startTime,
        endTime: bd.endTime,
        attendeesCount: bd.attendeesCount,
        purposeNotes: bd.purposeNotes,
        status: bd.status,
        reviewedBy: bd.reviewedBy || null,
        reviewNotes: bd.reviewNotes || null,
        reviewedAt: bd.reviewedAt || null,
      },
    })

    // Create status history
    if (bd.status === "approved" || bd.status === "kiv" || bd.status === "rejected") {
      await db.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: "pending",
          newStatus: bd.status,
          changedBy: bd.reviewedBy!,
          notes: bd.reviewNotes || null,
          changedAt: bd.reviewedAt || new Date(),
        },
      })
    }

    // Create notifications for the booking user
    if (bd.status !== "pending") {
      const messages: Record<string, string> = {
        approved: `Permohonan tempahan "${bd.title}" telah DILULUSKAN.`,
        kiv: `Permohonan tempahan "${bd.title}" ditandakan KIV. Sila rujuk catatan pengurus.`,
        rejected: `Permohonan tempahan "${bd.title}" telah DITOLAK.`,
        cancelled: `Permohonan tempahan "${bd.title}" telah dibatalkan.`,
      }
      await db.notification.create({
        data: {
          userId: bd.user.id,
          bookingId: booking.id,
          message: messages[bd.status] || `Status tempahan "${bd.title}" telah dikemas kini.`,
          type: bd.status === "approved" ? "success" : bd.status === "rejected" ? "danger" : bd.status === "kiv" ? "warning" : "info",
          isRead: Math.random() > 0.5,
          createdAt: bd.reviewedAt || new Date(),
        },
      })
    }
  }

  console.log("✅ Created bookings with status history and notifications")

  // ============ ADDITIONAL NOTIFICATIONS ============
  await db.notification.create({
    data: {
      userId: user1.id,
      message: "Selamat datang ke SiTempah! Sistem tempahan fasiliti gunasama ADTEC JTM Kampus Batu Pahat.",
      type: "info",
      isRead: false,
    },
  })

  await db.notification.create({
    data: {
      userId: manager1.id,
      message: "Anda mempunyai 3 permohonan menunggu kelulusan.",
      type: "warning",
      isRead: false,
    },
  })

  await db.notification.create({
    data: {
      userId: admin.id,
      message: "Sistem SiTempah berjaya dimulakan. Semua modul berfungsi dengan normal.",
      type: "success",
      isRead: false,
    },
  })

  console.log("✅ Created additional notifications")

  // ============ AUDIT LOGS ============
  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: "SYSTEM_INIT",
      entity: "system",
      entityId: null,
      details: "Sistem SiTempah dimulakan dan data induk dimuatkan.",
      ipAddress: "127.0.0.1",
    },
  })

  await db.auditLog.create({
    data: {
      userId: manager1.id,
      action: "BOOKING_APPROVED",
      entity: "booking",
      entityId: null,
      details: "Permohonan tempahan diluluskan oleh pengurus.",
      ipAddress: "127.0.0.1",
    },
  })

  console.log("✅ Created audit logs")
  console.log("\n🎉 Seeding completed successfully!")
  console.log("\n📋 Login Credentials:")
  console.log("   Admin:    admin@adtec-jtm.gov.my / Password123!")
  console.log("   Manager1: siti.hassan@adtec-jtm.gov.my / Password123!")
  console.log("   Manager2: mohd.rashid@adtec-jtm.gov.my / Password123!")
  console.log("   User1:    nurul.huda@adtec-jtm.gov.my / Password123!")
  console.log("   User2:    tan.wei@adtec-jtm.gov.my / Password123!")
  console.log("   User3:    raj.kumar@adtec-jtm.gov.my / Password123!")
  console.log("   User4:    fatimah.zahra@adtec-jtm.gov.my / Password123!")
  console.log("   User5:    lee.chong@adtec-jtm.gov.my / Password123!")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
