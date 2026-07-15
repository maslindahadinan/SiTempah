"use client"

import { useSession } from "next-auth/react"
import { LoginForm } from "@/components/auth/login-form"
import { AppShell } from "@/components/layout/app-shell"
import { LoadingScreen } from "@/components/layout/loading-screen"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <LoadingScreen />
  }

  if (!session) {
    return <LoginForm />
  }

  return <AppShell />
}
