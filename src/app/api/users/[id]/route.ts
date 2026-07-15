import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole, logAudit } from "@/lib/session"
import bcrypt from "bcryptjs"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole("admin")
    const { id } = await params
    const body = await req.json()

    const { fullName, department, phoneNumber, role, isActive, password } = body

    const updateData: Record<string, unknown> = {}
    if (fullName !== undefined) updateData.fullName = fullName
    if (department !== undefined) updateData.department = department
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        phoneNumber: true,
        role: true,
        isActive: true,
      },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(currentUser.id, "USER_UPDATE", "user", updated.id, `Pengguna dikemas kini: ${updated.email}`, ip)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole("admin")
    const { id } = await params

    // Soft delete - deactivate
    const user = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, email: true },
    })

    const ip = req.headers.get("x-forwarded-for") || undefined
    await logAudit(currentUser.id, "USER_DEACTIVATE", "user", user.id, `Pengguna dinyahaktifkan: ${user.email}`, ip)

    return NextResponse.json({ message: "Pengguna berjaya dinyahaktifkan" })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
