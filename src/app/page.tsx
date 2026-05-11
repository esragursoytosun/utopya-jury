
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        {/* Logo alanı */}
        <div className="flex items-center justify-center gap-6 mb-8 opacity-70">
          <div className="w-20 h-20 border-2 border-white/20 rounded-2xl flex items-center justify-center text-white/30 text-xs text-center">
            IGÜ<br/>Logo
          </div>
          <div className="w-20 h-20 border-2 border-white/20 rounded-2xl flex items-center justify-center text-white/30 text-xs text-center">
            SBF<br/>Logo
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
          Ütopya Yarışması 2026
        </h1>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Kentsel Adaleti Yeniden Düşünmek: Umut, Ütopya ve Ortak Yaşam Sempozyumu-III
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <a
          href="/jury"
          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all text-lg shadow-lg"
        >
          🗳️ Jüri Girişi
        </a>
        <a
          href="/display"
          className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white font-bold py-4 px-6 rounded-2xl transition-all text-lg border border-white/10"
        >
          📺 Ana Ekran (Projeksiyon)
        </a>
        <a
          href="/admin"
          className="flex items-center justify-center gap-3 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold py-4 px-6 rounded-2xl transition-all text-lg border border-amber-600/30"
        >
          ⚙️ Admin Paneli
        </a>
      </div>

      <p className="text-white/20 text-xs text-center">
        İstanbul Gelişim Üniversitesi · Sağlık Bilimleri Fakültesi
      </p>
    </main>
  )
}
