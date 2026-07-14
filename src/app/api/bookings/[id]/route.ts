import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, logAudit } from "@/lib/session"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            category: true,
            location: true,
            capacity: true,
            managerId: true,
          },
        },
        user: {
          select: { id: true, fullName: true, email: true, department: true, phoneNumber: true },
        },
        reviewer: {
          select: { id: true, fullName: true },
        },
        statusHistory: {
          include: {
            changedByUser: { select: { id: true, fullName: true } },
          },
          orderBy: { changedAt: "asc" },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Tempahan tidak dijumpai" }, { status: 404 })
    }

    // RBAC check: user can only see their own bookings unless they're a manager/admin
    if (user.role === "user" && booking.userId !== user.id) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }

    // Managers can only see bookings for their facilities or their own
    if (user.role === "manager" && booking.userId !== user.id && booking.facility.managerId !== user.id) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Get booking error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const booking = await db.booking.findUnique({
      where: { id },
      include: { facility: { select: { name: true } } },
    })

    if (!booking) {
      return NextResponse.json({ error: "Tempahan tidak dijumpai" }, { status: 404 })
    }

    // Only the booking owner or admin can cancel
    if (booking.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }

    // Can only cancel pending, approved, or kiv bookings
    if (!["pending", "approved", "kiv"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Tempahan berstatus "${booking.status}" tidak boleh dibatalkan` },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const reason = searchParams.get("reason") || "Dibatalkan oleh pemohon"

    const updated = await db.booking.update({
      where: { id },
      data: { status: "cancelled" },
    })

    // Record status change
    await db.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        oldStatus: booking.status,
        newStatus: "cancelled",
        changedBy: user.id,
        notes: reason,
      },
    })

    // Notify the user if cancelled by admin/manager
    if (booking.userId !== user.id) {
      await db.notification.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,
          message: `Tempahan "${booking.title}" telah dibatalkan oleh pentadbir. Sebab: ${reason}`,
          type: "warning",
        },
      })
    }

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(user.id, "BOOKING_CANCEL", "booking", booking.id, `Tempahan dibatalkan: ${booking.title}`, ip)

    return NextResponse.json({ message: "Tempahan berjaya dibatalkan", booking: updated })
  } catch (error) {
    console.error("Cancel booking error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
