'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCompetitionRealtime } from '@/hooks/useCompetitionRealtime'
import { CRITERIA, MAX_SCORE_PER_JURY } from '@/lib/constants'
import type { Jury } from '@/types'

type Scores = Record<string, number>

const SCORE_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500']
const SCORE_LABELS = ['', '1 — Zayıf', '2 — Orta', '3 — İyi', '4 — Çok İyi', '5 — Mükemmel']

interface SimpleJury { id: string; name: string }

/* ════════════════ Giriş ekranı ════════════════ */
function LoginScreen({ juries, onLogin }: { juries: Jury[]; onLogin: (jury: SimpleJury) => void }) {
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  // Sunucu access_code'ları gizler. Bu yüzden kod alanı her zaman gösterilir.
  // Eğer hiç jüri yoksa hata mesajı.
  if (juries.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-6xl">😶</div>
        <h2 className="text-white text-xl font-bold">Henüz Jüri Tanımlanmamış</h2>
        <p className="text-white/50 text-sm max-w-xs">
          Admin paneliden jüri eklenmesini bekleyin
        </p>
      </div>
    )
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!codeInput.trim()) return
    setChecking(true); setError('')
    try {
      const res = await fetch('/api/jury/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.jury) onLogin(data.jury)
      else { setError(data.error || 'Geçersiz kod'); setCodeInput('') }
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setChecking(false)
    }
  }

  async function loginByName(jury: Jury) {
    setChecking(true)
    try {
      const res = await fetch('/api/jury/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juryId: jury.id }),
      })
      const data = await res.json()
      if (res.ok && data.jury) onLogin(data.jury)
    } finally { setChecking(false) }
  }

  const [mode, setMode] = useState<'code' | 'name'>('code')

  return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🗳️</div>
        <h1 className="text-white font-black text-2xl mb-1">Jüri Girişi</h1>
        <p className="text-white/50 text-sm">
          {mode === 'code' ? 'Erişim kodunuzu girin' : 'Adınızı listeden seçin'}
        </p>
      </div>

      {mode === 'code' ? (
        <form onSubmit={handleCodeSubmit} className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text" value={codeInput} onChange={e => setCodeInput(e.target.value)}
            placeholder="Erişim Kodu" autoFocus inputMode="numeric"
            className={`w-full text-center text-3xl font-mono font-bold tracking-widest bg-white/10 text-white rounded-2xl px-6 py-5 outline-none border-2 transition-all ${
              error ? 'border-red-500' : 'border-white/10 focus:border-blue-500'
            }`} />
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-red-400 text-sm text-center">{error}</motion.p>
            )}
          </AnimatePresence>
          <button type="submit" disabled={checking || !codeInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition text-lg">
            {checking ? 'Kontrol ediliyor...' : 'Giriş Yap'}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm max-h-[60vh] overflow-y-auto">
          {[...juries].sort((a, b) => a.display_order - b.display_order).map(jury => (
            <button key={jury.id} onClick={() => loginByName(jury)} disabled={checking}
              className="bg-white/10 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-white font-bold py-4 rounded-2xl transition-all text-sm">
              {jury.name}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => { setMode(m => m === 'code' ? 'name' : 'code'); setError('') }}
        className="text-white/40 hover:text-white text-sm underline">
        {mode === 'code' ? 'Kodum yok, isim listesi göster' : 'Kod ile giriş yap'}
      </button>
    </div>
  )
}

/* ════════════════ Ana sayfa ════════════════ */
export default function JuryPage() {
  const [me, setMe] = useState<SimpleJury | null>(null)
  const [scores, setScores] = useState<Scores>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { competition, juries, currentGroup, currentGroupVotes, loading, error, refresh } = useCompetitionRealtime()

  useEffect(() => {
    const saved = localStorage.getItem('jury_session')
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as SimpleJury
      // Henüz juriler yüklenmediyse hiçbir şey yapma (sonraki tetiklemede tekrar bakılır)
      if (juries.length === 0) return
      // Saklı jüri hâlâ DB'de mi?
      const exists = juries.find(j => j.id === parsed.id)
      if (exists) {
        setMe({ id: exists.id, name: exists.name })
      } else {
        // Silinmiş — oturumu temizle, yeniden giriş istesin
        localStorage.removeItem('jury_session')
        setMe(null)
      }
    } catch {
      localStorage.removeItem('jury_session')
    }
  }, [juries])

  useEffect(() => { setSubmitted(false); setScores({}); setError('') }, [currentGroup?.id])

  useEffect(() => {
    if (me && currentGroup) {
      if (currentGroupVotes.some(v => v.jury_id === me.id)) setSubmitted(true)
    }
  }, [currentGroupVotes, me, currentGroup])

  function handleLogin(jury: SimpleJury) {
    setMe(jury)
    localStorage.setItem('jury_session', JSON.stringify(jury))
  }

  function logout() {
    localStorage.removeItem('jury_session')
    setMe(null); setScores({}); setSubmitted(false)
  }

  if (loading || (!competition && !error)) return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-white/50">
        Sunucuya bağlanıyor...
      </motion.p>
      <p className="text-white/30 text-xs">Render Free 30-60 sn uyanma süresi olabilir</p>
      {error && (
        <>
          <p className="text-red-400 text-sm mt-2">{error}</p>
          <button onClick={() => refresh()} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm">
            Yeniden Dene
          </button>
        </>
      )}
    </div>
  )

  if (error && !competition) return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">⚠️</div>
      <p className="text-white text-lg font-bold">Sunucuya ulaşılamıyor</p>
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={() => refresh()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl">
        Yeniden Dene
      </button>
      <p className="text-white/30 text-xs max-w-xs">
        İnternet bağlantını kontrol et. Sorun devam ederse sayfayı kapat aç.
      </p>
    </div>
  )

  if (!me) return <LoginScreen juries={juries} onLogin={handleLogin} />

  function Header() {
    return (
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest">Jüri</p>
          <p className="text-white font-bold">{me?.name}</p>
        </div>
        <button onClick={logout} className="text-white/30 hover:text-white/60 text-xs border border-white/10 px-2 py-1 rounded-lg">Çıkış</button>
      </div>
    )
  }

  if (competition?.status === 'finished') return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="max-w-sm w-full"><Header /></div>
      <div className="text-6xl">🏁</div>
      <h2 className="text-white text-2xl font-bold">Yarışma Tamamlandı</h2>
      <p className="text-white/50">Tüm gruplar değerlendirildi. Teşekkürler!</p>
    </div>
  )

  if (!currentGroup) return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="max-w-sm w-full"><Header /></div>
      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl">⏳</motion.div>
      <p className="text-white/60 text-lg">Sıradaki grup bekleniyor...</p>
    </div>
  )

  if (!competition?.voting_open && !submitted) return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="max-w-sm w-full"><Header /></div>
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-sm w-full">
        <p className="text-white/50 text-sm uppercase tracking-widest mb-2">Aktif Grup</p>
        <h2 className="text-white font-black text-2xl mb-4">{currentGroup.name}</h2>
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <p className="text-amber-400 font-semibold">⏸ Oylama henüz açılmadı</p>
        </motion.div>
      </div>
    </div>
  )

  if (submitted) {
    const myVote = currentGroupVotes.find(v => v.jury_id === me.id)
    return (
      <div className="min-h-screen bg-[#0B1528] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="max-w-sm w-full"><Header /></div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="text-6xl">✅</motion.div>
        <div>
          <h2 className="text-white font-black text-2xl">Oyunuz Alındı!</h2>
          <p className="text-white/50 mt-2">{currentGroup.name}</p>
          {myVote && <p className="text-amber-400 font-bold text-lg mt-1">Verdiğiniz puan: {myVote.total} / {MAX_SCORE_PER_JURY}</p>}
        </div>
        <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="text-white/40">
          Diğer jüriler bekleniyor...
        </motion.p>
      </div>
    )
  }

  const totalScore = CRITERIA.reduce((s, c) => s + (scores[c.id] ?? 0), 0)
  const allFilled = CRITERIA.every(c => scores[c.id] !== undefined)

  async function handleSubmit() {
    if (!me || !currentGroup || !allFilled) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: currentGroup.id,
          jury_id: me.id,
          criteria_1: scores.criteria_1,
          criteria_2: scores.criteria_2,
          criteria_3: scores.criteria_3,
          criteria_4: scores.criteria_4,
          criteria_5: scores.criteria_5,
        }),
      })
      const data = await res.json()
      if (res.ok) setSubmitted(true)
      else if (data.error?.includes('zaten')) setSubmitted(true)
      else setError(data.error || 'Hata oluştu')
    } catch (e: any) {
      setError('Bağlantı hatası')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-[#0B1528] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#0B1528]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs">Değerlendirilen Grup</p>
            <p className="text-white font-black text-lg leading-tight">{currentGroup.name}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs">Toplam</p>
            <p className={`font-black text-2xl ${allFilled ? 'text-amber-400' : 'text-white/30'}`}>
              {totalScore}<span className="text-sm font-normal text-white/30">/{MAX_SCORE_PER_JURY}</span>
            </p>
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-1">
          <p className="text-white/30 text-xs text-right">{me.name}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full flex flex-col gap-4">
        {CRITERIA.map((c, idx) => {
          const selected = scores[c.id]
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
              className={`bg-white/5 border rounded-2xl p-4 transition-all ${selected ? 'border-white/20' : 'border-white/10'}`}>
              <div className="mb-3 flex items-start gap-2">
                <span className="text-xl">{c.emoji}</span>
                <div>
                  <p className="text-white font-bold text-sm leading-snug">{c.title}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{c.description}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-between">
                {[1,2,3,4,5].map(val => (
                  <button key={val} onClick={() => setScores(p => ({ ...p, [c.id]: val }))}
                    className={[
                      'flex-1 py-3 rounded-xl font-black text-lg transition-all active:scale-95',
                      selected === val ? `${SCORE_COLORS[val]} text-white shadow-lg scale-105` : 'bg-white/10 text-white/50 hover:bg-white/20',
                    ].join(' ')}>{val}</button>
                ))}
              </div>
              {selected && <p className="text-xs text-center mt-2 text-white/40">{SCORE_LABELS[selected]}</p>}
            </motion.div>
          )
        })}

        <div className="pb-8 pt-2">
          {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
          <motion.button onClick={handleSubmit} disabled={!allFilled || submitting} whileTap={{ scale: 0.97 }}
            className={`w-full py-5 rounded-2xl font-black text-xl transition-all ${
              allFilled ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30' : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}>
            {submitting ? 'Gönderiliyor...' : allFilled ? `✓ Oyumu Gönder (${totalScore}/${MAX_SCORE_PER_JURY})` : `${CRITERIA.filter(c => !scores[c.id]).length} kriter eksik`}
          </motion.button>
          <p className="text-white/20 text-xs text-center mt-3">Gönderildikten sonra değiştirilemiyor</p>
        </div>
      </div>
    </div>
  )
}
