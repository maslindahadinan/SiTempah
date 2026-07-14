import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, logAudit } from "@/lib/session"
import { z } from "zod"

const statusSchema = z.object({
  status: z.enum(["approved", "kiv", "rejected"]),
  reviewNotes: z.string().min(3, "Catatan diperlukan").max(500),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "manager" && user.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya pengurus/pentadbir boleh mengubah status." }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const validated = statusSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const { status, reviewNotes } = validated.data

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        facility: { select: { id: true, name: true, managerId: true } },
        user: { select: { id: true, fullName: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Tempahan tidak dijumpai" }, { status: 404 })
    }

    // RBAC: Managers can only act on their managed facilities
    if (user.role === "manager" && booking.facility.managerId !== user.id) {
      return NextResponse.json(
        { error: "Anda tidak mempunyai kebenaran untuk menguruskan fasiliti ini" },
        { status: 403 }
      )
    }

    // Validate current status allows transition
    if (!["pending", "kiv"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Tempahan berstatus "${booking.status}" tidak boleh diubah` },
        { status: 400 }
      )
    }

    // For rejection, review notes are mandatory
    if (status === "rejected" && !reviewNotes.trim()) {
      return NextResponse.json(
        { error: "Sebab penolakan wajib diisi" },
        { status: 400 }
      )
    }

    const updated = await db.booking.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    })

    // Record in audit trail
    await db.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        oldStatus: booking.status,
        newStatus: status,
        changedBy: user.id,
        notes: reviewNotes,
      },
    })

    // Notify the applicant
    const statusMessages: Record<string, string> = {
      approved: `Permohonan tempahan "${booking.title}" telah DILULUSKAN.`,
      kiv: `Permohonan tempahan "${booking.title}" ditandakan KIV. Sila rujuk catatan pengurus.`,
      rejected: `Permohonan tempahan "${booking.title}" telah DITOLAK. Sila rujuk sebab penolakan.`,
    }

    const notifTypes: Record<string, string> = {
      approved: "success",
      kiv: "warning",
      rejected: "danger",
    }

    await db.notification.create({
      data: {
        userId: booking.user.id,
        bookingId: booking.id,
        message: statusMessages[status],
        type: notifTypes[status],
      },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(
      user.id,
      `BOOKING_${status.toUpperCase()}`,
      "booking",
      booking.id,
      `Tempahan "${booking.title}" ${status}. Catatan: ${reviewNotes}`,
      ip
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update booking status error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
