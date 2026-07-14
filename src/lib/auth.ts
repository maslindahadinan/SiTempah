import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Sila masukkan e-mel dan kata laluan.")
        }

        // Normalize email
        const email = credentials.email.toLowerCase().trim()

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user) {
          throw new Error("E-mel atau kata laluan tidak sah.")
        }

        if (!user.isActive) {
          throw new Error("Akaun anda telah dinyahaktifkan. Sila hubungi pentadbir.")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("E-mel atau kata laluan tidak sah.")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          department: user.department,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.department = (user as { department: string }).department
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.department = token.department as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "sitempah-adtec-jtm-secret-key-2026-very-secure",
}
