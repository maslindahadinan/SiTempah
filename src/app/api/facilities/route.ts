import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, requireRole, logAudit } from "@/lib/session"
import { z } from "zod"

const facilitySchema = z.object({
  name: z.string().min(2, "Nama fasiliti diperlukan"),
  category: z.string().min(2, "Kategori diperlukan"),
  capacity: z.number().int().min(1, "Kapasiti mesti sekurang-kurangnya 1"),
  location: z.string().min(2, "Lokasi diperlukan"),
  description: z.string().min(5, "Penerangan diperlukan"),
  amenities: z.array(z.string()).optional().default([]),
  imageUrl: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  operatingHours: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const activeOnly = searchParams.get("activeOnly") === "true"

    const where: Record<string, unknown> = {}
    if (category && category !== "all") where.category = category
    if (activeOnly) where.isActive = true
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const facilities = await db.facility.findMany({
      where,
      include: {
        manager: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(facilities)
  } catch (error) {
    console.error("Get facilities error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("admin")
    const body = await req.json()
    const validated = facilitySchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validated.data
    const facility = await db.facility.create({
      data: {
        name: data.name,
        category: data.category,
        capacity: data.capacity,
        location: data.location,
        description: data.description,
        amenities: JSON.stringify(data.amenities),
        imageUrl: data.imageUrl || null,
        managerId: data.managerId || null,
        isActive: data.isActive,
        operatingHours: data.operatingHours || JSON.stringify({ start: "08:00", end: "17:00", days: [1, 2, 3, 4, 5] }),
      },
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
      },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(user.id, "FACILITY_CREATE", "facility", facility.id, `Fasiliti baharu dicipta: ${facility.name}`, ip)

    return NextResponse.json(facility)
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Create facility error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
