import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { logAudit } from "@/lib/session"

const registerSchema = z.object({
  email: z.string().email("Format e-mel tidak sah"),
  password: z.string().min(8, "Kata laluan mestilah sekurang-kurangnya 8 aksara"),
  fullName: z.string().min(3, "Nama penuh diperlukan"),
  department: z.string().min(2, "Jabatan diperlukan"),
  phoneNumber: z.string().optional(),
})

// Simple rate limiting
const rateLimit = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(ip)

  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown"

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak percubaan. Sila cuba lagi kemudian." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const validated = registerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, fullName, department, phoneNumber } = validated.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: "E-mel telah didaftarkan. Sila log masuk." },
        { status: 409 }
      )
    }

    // Validate JTM email domain
    if (!normalizedEmail.endsWith("@adtec-jtm.gov.my") && !normalizedEmail.endsWith("@jtm.gov.my")) {
      return NextResponse.json(
        { error: "Sila gunakan e-mel rasmi JTM (@adtec-jtm.gov.my atau @jtm.gov.my)" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName: fullName.trim(),
        department: department.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        role: "user",
      },
    })

    await logAudit(user.id, "USER_REGISTER", "user", user.id, `Pengguna baharu berdaftar: ${normalizedEmail}`, ip)

    return NextResponse.json({
      message: "Pendaftaran berjaya. Sila log masuk.",
      userId: user.id,
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    )
  }
}
