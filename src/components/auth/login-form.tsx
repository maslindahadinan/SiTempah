"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Building2, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Shield, Clock, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    department: "",
    phoneNumber: "",
  })

  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === "login") {
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          toast({
            title: "Log Masuk Gagal",
            description: result.error,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Berjaya",
            description: "Selamat datang ke SiTempah!",
          })
          router.refresh()
        }
      } else {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        const data = await res.json()

        if (!res.ok) {
          toast({
            title: "Pendaftaran Gagal",
            description: data.error,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Pendaftaran Berjaya",
            description: "Sila log masuk dengan akaun baharu anda.",
          })
          setMode("login")
          setFormData((prev) => ({ ...prev, password: "" }))
        }
      }
    } catch {
      toast({
        title: "Ralat",
        description: "Sila cuba lagi.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: string) => {
    const demoAccounts: Record<string, { email: string; password: string }> = {
      admin: { email: "admin@adtec-jtm.gov.my", password: "Password123!" },
      manager: { email: "siti.hassan@adtec-jtm.gov.my", password: "Password123!" },
      user: { email: "nurul.huda@adtec-jtm.gov.my", password: "Password123!" },
    }
    const account = demoAccounts[role]
    setFormData((prev) => ({ ...prev, email: account.email, password: account.password }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex flex-col gap-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center glow-accent">
              <Building2 className="w-8 h-8 text-[#14B8A6]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">SiTempah</h1>
              <p className="text-sm text-white/60">Sistem Tempahan Fasiliti Gunasama</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Tempah Fasiliti Kampus
              <br />
              <span className="gradient-text">dengan Mudah & Selamat</span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Platform dalam talian ADTEC JTM Kampus Batu Pahat untuk tempahan bilik mesyuarat, dewan, makmal komputer dan bilik seminar dengan aliran kelulusan berstruktur.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Clock, title: "Masa Nyata", desc: "Kalendar kekosongan langsung" },
              { icon: Shield, title: "Selamat", desc: "RBAC & Audit Trail" },
              { icon: CheckCircle2, title: "Berstruktur", desc: "Aliran kelulusan telus" },
              { icon: Building2, title: "Berpusat", desc: "Rekod digital menyeluruh" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="glass-card p-4 flex items-start gap-3"
              >
                <feature.icon className="w-5 h-5 text-[#14B8A6] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-xs text-white/60">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right side - Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="glass-card p-8">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl glass-strong flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#14B8A6]" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">SiTempah</h1>
                <p className="text-xs text-white/60">ADTEC JTM Kampus Batu Pahat</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  {mode === "login" ? "Log Masuk" : "Daftar Akaun"}
                </h2>
                <p className="text-white/60 text-sm mb-6">
                  {mode === "login"
                    ? "Masukkan e-mel rasmi JTM dan kata laluan anda"
                    : "Isi maklumat untuk mendaftar akaun baharu"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "register" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Nama Penuh</label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="cth: Ahmad bin Ali"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/80">Jabatan</label>
                          <input
                            type="text"
                            required
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            placeholder="Jabatan Elektrik"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/80">Telefon</label>
                          <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            placeholder="012-345 6789"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">E-mel Rasmi JTM</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nama@adtec-jtm.gov.my"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Kata Laluan</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0F4C81] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 glow-accent"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : mode === "login" ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        Log Masuk
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Daftar
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                    className="text-sm text-white/60 hover:text-[#14B8A6] transition-colors flex items-center gap-1 mx-auto"
                  >
                    {mode === "login" ? (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Belum ada akaun? Daftar di sini
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="w-3 h-3" />
                        Sudah ada akaun? Log masuk
                      </>
                    )}
                  </button>
                </div>

                {mode === "login" && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-xs text-white/50 text-center mb-3">Akaun Demo (klik untuk auto-isi):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { role: "user", label: "Pengguna", color: "from-blue-500/20 to-blue-600/20" },
                        { role: "manager", label: "Pengurus", color: "from-teal-500/20 to-teal-600/20" },
                        { role: "admin", label: "Pentadbir", color: "from-purple-500/20 to-purple-600/20" },
                      ].map((acc) => (
                        <button
                          key={acc.role}
                          onClick={() => fillDemo(acc.role)}
                          className={`py-2 px-3 rounded-lg bg-gradient-to-r ${acc.color} border border-white/10 text-xs text-white/80 hover:scale-105 transition-transform`}
                        >
                          {acc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
