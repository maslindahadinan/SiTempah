import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"

export async function GET(req: Request) {
  try {
    await requireRole("admin")

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const entity = searchParams.get("entity")
    const action = searchParams.get("action")

    const where: Record<string, unknown> = {}
    if (entity && entity !== "all") where.entity = entity
    if (action && action !== "all") where.action = { contains: action }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Forbidden") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Get audit logs error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
