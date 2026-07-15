import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, logAudit } from "@/lib/session"
import { z } from "zod"

const bookingSchema = z.object({
  facilityId: z.string().min(1, "Fasiliti diperlukan"),
  title: z.string().min(3, "Tajuk diperlukan").max(200, "Tajuk terlalu panjang"),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  attendeesCount: z.number().int().min(1, "Bilangan peserta diperlukan"),
  purposeNotes: z.string().min(5, "Tujuan tempahan diperlukan").max(1000),
  attachmentUrl: z.string().optional(),
  status: z.enum(["draft", "pending"]).optional().default("pending"),
})

// Simple rate limiting for booking creation
const bookingRateLimit = new Map<string, { count: number; lastReset: number }>()
const BOOKING_RATE_WINDOW = 60 * 60 * 1000 // 1 hour
const BOOKING_RATE_MAX = 20

function checkBookingRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = bookingRateLimit.get(userId)

  if (!record || now - record.lastReset > BOOKING_RATE_WINDOW) {
    bookingRateLimit.set(userId, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= BOOKING_RATE_MAX) {
    return false
  }

  record.count++
  return true
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const facilityId = searchParams.get("facilityId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const scope = searchParams.get("scope") || "me" // me, managed, all
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    // RBAC filtering
    if (scope === "me") {
      where.userId = user.id
    } else if (scope === "managed" && user.role === "manager") {
      // Managers see bookings for their managed facilities
      where.facility = { managerId: user.id }
    } else if (scope === "all" && (user.role === "manager" || user.role === "admin")) {
      // Managers and admins can see all
    } else {
      where.userId = user.id
    }

    if (status && status !== "all") where.status = status
    if (facilityId) where.facilityId = facilityId
    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate)
      if (endDate) where.startTime.lte = new Date(endDate)
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { purposeNotes: { contains: search } },
        { user: { fullName: { contains: search } } },
        { facility: { name: { contains: search } } },
      ]
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        facility: {
          select: { id: true, name: true, category: true, location: true, capacity: true },
        },
        user: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        reviewer: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { startTime: "desc" },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Get bookings error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkBookingRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Terlalu banyak tempahan dicipta. Sila cuba lagi kemudian." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const validated = bookingSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validated.data
    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Validate times
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "Masa tamat mesti selepas masa mula" },
        { status: 400 }
      )
    }

    if (startTime < new Date()) {
      return NextResponse.json(
        { error: "Tidak boleh menempah masa yang telah berlalu" },
        { status: 400 }
      )
    }

    // Check facility exists and is active
    const facility = await db.facility.findUnique({
      where: { id: data.facilityId },
    })

    if (!facility) {
      return NextResponse.json({ error: "Fasiliti tidak dijumpai" }, { status: 404 })
    }

    if (!facility.isActive) {
      return NextResponse.json({ error: "Fasiliti ini tidak aktif" }, { status: 400 })
    }

    // Check capacity
    if (data.attendeesCount > facility.capacity) {
      return NextResponse.json(
        { error: `Bilangan peserta melebihi kapasiti fasiliti (${facility.capacity} orang)` },
        { status: 400 }
      )
    }

    // CONFLICT DETECTION - Check for overlapping bookings
    const conflictingBookings = await db.booking.findMany({
      where: {
        facilityId: data.facilityId,
        status: { in: ["pending", "approved", "kiv"] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    })

    if (conflictingBookings.length > 0) {
      return NextResponse.json(
        {
          error: "Pertindihan tempahan dikesan. Slot masa ini telah ditempah. Sila pilih slot lain.",
          conflicts: conflictingBookings.map((b) => ({
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status,
          })),
        },
        { status: 409 }
      )
    }

    const booking = await db.booking.create({
      data: {
        facilityId: data.facilityId,
        userId: user.id,
        title: data.title,
        startTime,
        endTime,
        attendeesCount: data.attendeesCount,
        purposeNotes: data.purposeNotes,
        attachmentUrl: data.attachmentUrl || null,
        status: data.status,
      },
      include: {
        facility: { select: { id: true, name: true, category: true, location: true } },
        user: { select: { id: true, fullName: true, email: true, department: true } },
      },
    })

    // Create status history
    await db.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        oldStatus: null,
        newStatus: data.status,
        changedBy: user.id,
        notes: "Permohonan dicipta",
      },
    })

    // Notify the facility manager if booking is pending
    if (data.status === "pending" && facility.managerId) {
      await db.notification.create({
        data: {
          userId: facility.managerId,
          bookingId: booking.id,
          message: `Permohonan tempahan baharu: "${booking.title}" untuk ${facility.name}`,
          type: "info",
        },
      })
    }

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(user.id, "BOOKING_CREATE", "booking", booking.id, `Tempahan dicipta: ${booking.title}`, ip)

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Create booking error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
