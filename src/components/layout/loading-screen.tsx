export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 relative z-10">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl glass-strong flex items-center justify-center animate-pulse">
          <div className="w-10 h-10 border-4 border-white/20 border-t-[#14B8A6] rounded-full animate-spin" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-r from-[#14B8A6]/20 to-[#0F4C81]/20 rounded-2xl blur-xl animate-pulse" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold gradient-text">SiTempah</h2>
        <p className="text-sm text-white/60 mt-1">Memuatkan sistem...</p>
      </div>
    </div>
  )
}
