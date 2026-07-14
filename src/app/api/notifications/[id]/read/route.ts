import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification) {
      return NextResponse.json({ error: "Notifikasi tidak dijumpai" }, { status: 404 })
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Mark notification read error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
