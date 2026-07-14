import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, requireRole, logAudit } from "@/lib/session"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const search = searchParams.get("search")

    // Only admins and managers can list users (managers see limited info)
    let where: Record<string, unknown> = {}
    if (role && role !== "all") where.role = role
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { department: { contains: search } },
      ]
    }

    // Non-admins can only see managers and themselves
    if (user.role !== "admin") {
      where = {
        ...where,
        OR: [
          { role: "manager" },
          { id: user.id },
        ],
      }
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            managedFacilities: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireRole("admin")
    const body = await req.json()

    const { email, fullName, department, phoneNumber, role, password } = body

    if (!email || !fullName || !department || !password) {
      return NextResponse.json({ error: "Semua medan diperlukan" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: "E-mel telah didaftarkan" }, { status: 409 })
    }

    const bcrypt = await import("bcryptjs")
    const hashedPassword = await bcrypt.default.hash(password, 12)

    const newUser = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName,
        department,
        phoneNumber: phoneNumber || null,
        role: role || "user",
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(currentUser.id, "USER_CREATE", "user", newUser.id, `Pengguna baharu dicipta: ${normalizedEmail} (${role})`, ip)

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
