export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto glass border-t border-white/10 px-4 md:px-6 lg:px-8 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs md:text-sm text-white/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#14B8A6] to-[#0F4C81] flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">ST</span>
          </div>
          <span>© {currentYear} SiTempah — ADTEC JTM Kampus Batu Pahat</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Jabatan Tenaga Manusia</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Sistem Aktif
          </span>
        </div>
      </div>
    </footer>
  )
}
