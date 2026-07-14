import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      include: {
        booking: {
          select: { id: true, title: true, facility: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const unreadCount = await db.notification.count({
      where: { userId: user.id, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
