import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { db } from "./db"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  department: string
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user as SessionUser
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient permissions")
  }
  return user
}

export async function logAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: string,
  ipAddress?: string
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
        ipAddress: ipAddress || null,
      },
    })
  } catch (error) {
    console.error("Failed to log audit:", error)
  }
}
