import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, requireRole, logAudit } from "@/lib/session"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  capacity: z.number().int().min(1).optional(),
  location: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  amenities: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  operatingHours: z.string().optional(),
})

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
    const facility = await db.facility.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        bookings: {
          where: {
            status: { in: ["pending", "approved", "kiv"] },
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
            user: { select: { id: true, fullName: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
    })

    if (!facility) {
      return NextResponse.json({ error: "Fasiliti tidak dijumpai" }, { status: 404 })
    }

    return NextResponse.json(facility)
  } catch (error) {
    console.error("Get facility error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin")
    const { id } = await params
    const body = await req.json()
    const validated = updateSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validated.data
    const updateData: Record<string, unknown> = { ...data }
    if (data.amenities) {
      updateData.amenities = JSON.stringify(data.amenities)
    }

    const facility = await db.facility.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
      },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(user.id, "FACILITY_UPDATE", "facility", facility.id, `Fasiliti dikemas kini: ${facility.name}`, ip)

    return NextResponse.json(facility)
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Update facility error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin")
    const { id } = await params

    // Soft delete - deactivate instead of hard delete
    const facility = await db.facility.update({
      where: { id },
      data: { isActive: false },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(user.id, "FACILITY_DEACTIVATE", "facility", facility.id, `Fasiliti dinyahaktifkan: ${facility.name}`, ip)

    return NextResponse.json({ message: "Fasiliti berjaya dinyahaktifkan" })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Delete facility error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
