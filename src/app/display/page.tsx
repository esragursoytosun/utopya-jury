'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCompetitionRealtime } from '@/hooks/useCompetitionRealtime'
import { audioManager } from '@/lib/audio'
import JuryStatusLights from '@/components/JuryStatusLights'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import ScoreReveal from '@/components/ScoreReveal'
import Podium from '@/components/Podium'
import ConfettiBurst from '@/components/ConfettiBurst'
import { MAX_SCORE_PER_JURY } from '@/lib/constants'

export default function DisplayPage() {
  const {
    competition, groups, juries, currentGroup, currentGroupVotes, allVotesIn, loading,
  } = useCompetitionRealtime()

  const [showConfetti, setShowConfetti] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const prevVoteCountRef = useRef(0)
  const prevAllVotesRef = useRef(false)
  const prevPodiumRef = useRef(false)
  // Her grup için en son hangi reveal timestamp'inin gösterildiğini takip et.
  // Admin "Yeniden Oynat" tıklayınca timestamp değişir → animasyon yeniden başlar.
  const lastShownRevealRef = useRef<Map<string, string>>(new Map())

  const maxTotal = juries.length * MAX_SCORE_PER_JURY

  useEffect(() => {
    if (!audioUnlocked) return
    if (currentGroupVotes.length > prevVoteCountRef.current) audioManager?.voteReceived()
    prevVoteCountRef.current = currentGroupVotes.length
  }, [currentGroupVotes.length, audioUnlocked])

  useEffect(() => {
    if (!audioUnlocked) return
    if (allVotesIn && !prevAllVotesRef.current) audioManager?.allVotesIn()
    prevAllVotesRef.current = allVotesIn
  }, [allVotesIn, audioUnlocked])

  useEffect(() => {
    if (!audioUnlocked) return
    if (competition?.show_podium && !prevPodiumRef.current) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 6000)
    }
    prevPodiumRef.current = !!competition?.show_podium
  }, [competition?.show_podium, audioUnlocked])

  const votedJuryIds = new Set(currentGroupVotes.map(v => v.jury_id))

  if (loading) return (
    <div className="min-h-screen bg-[#0B1528] flex items-center justify-center">
      <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="text-white/50 text-xl">
        Bağlanıyor...
      </motion.p>
    </div>
  )

  // Sıralama tablosu (admin "Sıralamayı Göster" tıkladığında)
  if (competition?.show_leaderboard) {
    const revealed = [...groups].filter(g => g.score_revealed).sort((a, b) => b.total_score - a.total_score)
    const notRevealed = [...groups].filter(g => !g.score_revealed).sort((a, b) => a.order_index - b.order_index)
    const maxTotal = juries.length * MAX_SCORE_PER_JURY
    const topScore = revealed[0]?.total_score ?? 1

    return (
      <div className="min-h-screen bg-display-grad flex flex-col no-scrollbar">
        <DisplayHeader competition={competition} />
        <div className="flex-1 flex flex-col items-center p-8 gap-6 overflow-y-auto no-scrollbar">
          {/* Üst başlık */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center">
            <p className="text-amber-400/70 text-sm md:text-base uppercase tracking-[0.4em] mb-2">Genel Sıralama</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">📊 Sonuçlar</h2>
            <p className="text-white/40 text-sm mt-3">
              {revealed.length} / {groups.length} grup değerlendirildi · {juries.length} jüri · {maxTotal} max
            </p>
          </motion.div>

          {/* Açıklanan sonuçlar — bar grafikli sıralama */}
          {revealed.length > 0 && (
            <div className="w-full max-w-3xl flex flex-col gap-2">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1 px-1">✓ Açıklanan</p>
              {revealed.map((g, i) => {
                const isPodium = i < 3
                const medal = ['🥇', '🥈', '🥉'][i]
                const barWidth = topScore > 0 ? (g.total_score / topScore) * 100 : 0
                const avg = juries.length > 0 ? (g.total_score / juries.length).toFixed(1) : '0'
                return (
                  <motion.div key={g.id}
                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`relative overflow-hidden rounded-xl border ${
                      isPodium ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10'
                    }`}>
                    {/* Arka plan puan barı */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ delay: i * 0.06 + 0.2, duration: 0.8, ease: 'easeOut' }}
                      className={`absolute inset-y-0 left-0 ${
                        isPodium ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5' : 'bg-gradient-to-r from-blue-500/10 to-blue-500/0'
                      }`}
                    />
                    {/* İçerik */}
                    <div className="relative flex items-center gap-4 px-5 py-4">
                      <span className="w-12 text-center text-3xl">
                        {isPodium ? medal : <span className="text-white/40 text-xl font-bold">{i + 1}</span>}
                      </span>
                      <span className={`flex-1 font-bold ${isPodium ? 'text-white text-xl' : 'text-white/90 text-lg'}`}>
                        {g.name}
                      </span>
                      <div className="text-right">
                        <p className={`font-black tabular-nums leading-none ${isPodium ? 'text-amber-400 text-3xl' : 'text-white text-2xl'}`}>
                          {g.total_score}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          ort {avg}/25 · /{maxTotal}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Henüz değerlendirilmemiş gruplar */}
          {notRevealed.length > 0 && (
            <div className="w-full max-w-3xl flex flex-col gap-1.5 mt-2">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1 px-1">Bekliyor</p>
              {notRevealed.map((g, i) => (
                <motion.div key={g.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/20 text-base font-bold w-12 text-center">—</span>
                  <span className="flex-1 text-white/50 text-base">{g.name}</span>
                  <span className="text-white/30 text-xs uppercase tracking-wider">
                    {g.status === 'active' ? 'oylanıyor' : g.status === 'locked' ? 'açıklanmadı' : 'bekliyor'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {revealed.length === 0 && notRevealed.length === 0 && (
            <p className="text-white/40 text-center text-lg mt-12">Henüz grup yok</p>
          )}
        </div>
        {!audioUnlocked && <AudioButton onUnlock={() => setAudioUnlocked(true)} />}
      </div>
    )
  }

  // Podyumu sadece admin tetiklediğinde göster
  if (competition?.show_podium) return (
    <div className="min-h-screen bg-display-grad flex flex-col items-center justify-center p-8 overflow-hidden no-scrollbar">
      <ConfettiBurst active={showConfetti} />
      <Podium groups={groups} juryCount={juries.length} />
      {!audioUnlocked && <AudioButton onUnlock={() => setAudioUnlocked(true)} />}
    </div>
  )

  if (currentGroup?.score_revealed && currentGroup.status === 'active') {
    const currentTs = currentGroup.score_revealed_at ?? 'no-ts'
    const lastSeenTs = lastShownRevealRef.current.get(currentGroup.id)
    const shouldAnimate = lastSeenTs !== currentTs
    if (shouldAnimate) {
      // Yeni reveal (veya admin yeniden tetikledi) → animasyonlu
      lastShownRevealRef.current.set(currentGroup.id, currentTs)
      return (
        <div className="min-h-screen bg-display-grad flex flex-col items-center justify-center p-8 overflow-hidden no-scrollbar">
          <DisplayHeader competition={competition} />
          <ScoreReveal groupName={currentGroup.name} totalScore={currentGroup.total_score} maxScore={maxTotal} juryCount={juries.length} />
          {!audioUnlocked && <AudioButton onUnlock={() => setAudioUnlocked(true)} />}
        </div>
      )
    }
    // Daha önce animasyon oynatılmış (örn. Geri Al ile geri dönüldü) → statik özet
    return (
      <div className="min-h-screen bg-display-grad flex flex-col no-scrollbar">
        <DisplayHeader competition={competition} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-white/40 text-sm md:text-base uppercase tracking-[0.4em] mb-3">Değerlendirme Sonucu</p>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight text-balance">{currentGroup.name}</h1>
          </motion.div>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="bg-amber-500/10 border-2 border-amber-500/40 rounded-[2.5rem] px-16 py-10 shadow-[0_0_60px_rgba(245,158,11,0.3)]">
            <p className="text-8xl md:text-9xl font-black text-amber-400 tabular-nums leading-none text-center">
              {currentGroup.total_score}
            </p>
            <p className="text-amber-300/50 text-lg mt-3 text-center">/ {maxTotal}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex items-center gap-12">
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Ortalama</p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {juries.length > 0 ? (currentGroup.total_score / juries.length).toFixed(1) : '0'}<span className="text-white/30">/25</span>
              </p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Jüri</p>
              <p className="text-2xl font-bold text-white tabular-nums">{juries.length}</p>
            </div>
          </motion.div>
        </div>
        {!audioUnlocked && <AudioButton onUnlock={() => setAudioUnlocked(true)} />}
      </div>
    )
  }

  if (competition?.status === 'waiting' || !currentGroup) return (
    <div className="min-h-screen bg-display-grad flex flex-col items-center justify-center gap-8 p-8 no-scrollbar">
      <DisplayHeader competition={competition} large />
      <motion.div animate={{ scale: [1, 1.03, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }} className="text-center">
        <p className="text-white/40 text-xl">Yarışma başlamak üzere...</p>
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-3 h-3 rounded-full bg-white/30"
              animate={{ y: [0, -8, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      </motion.div>
      {!audioUnlocked && <AudioButton onUnlock={() => setAudioUnlocked(true)} />}
    </div>
  )

  return (
    <div className="min-h-screen bg-display-grad flex flex-col no-scrollbar overflow-hidden">
      <DisplayHeader competition={competition} />

      <div className="flex flex-1 gap-6 p-6 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <AnimatePresence mode="wait">
            <motion.div key={currentGroup.id}
              initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 150 }} className="text-center">
              <p className="text-white/40 text-sm uppercase tracking-[0.3em] mb-3">Değerlendirilen Grup</p>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight text-balance">{currentGroup.name}</h1>
            </motion.div>
          </AnimatePresence>

          {competition?.voting_open ? (
            <div className="flex flex-col items-center gap-6">
              <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-5 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-fast" />
                <span className="text-emerald-300 font-semibold text-sm uppercase tracking-wider">Oylama Açık</span>
              </motion.div>
              <JuryStatusLights juries={juries} votedJuryIds={votedJuryIds} />
              {allVotesIn && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center bg-amber-500/20 border border-amber-500/40 px-6 py-3 rounded-2xl">
                  <p className="text-amber-300 font-bold text-lg">✓ Tüm Jüriler Oy Verdi!</p>
                  <p className="text-amber-300/60 text-sm">Sonuç açıklanmayı bekliyor...</p>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-white/40 font-semibold text-sm uppercase tracking-wider">Oylama Kapalı</span>
              </div>
              <JuryStatusLights juries={juries} votedJuryIds={votedJuryIds} />
            </div>
          )}
        </div>

        <div className="w-72 hidden lg:flex flex-col overflow-y-auto no-scrollbar py-4">
          <LeaderboardPanel groups={groups} currentGroupId={currentGroup.id} juryCount={juries.length} />
        </div>
      </div>

      {!audioUnlocked && <AudioButton onUnlock={() => setAudioUnlocked(true)} />}
    </div>
  )
}

function DisplayHeader({ competition, large = false }: { competition: { name: string } | null; large?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 gap-4 ${large ? '' : 'border-b border-white/10'}`}>
      <img src="/logo-igu.png" alt="İGÜ"
        className={`object-contain bg-white rounded-full p-1 shrink-0 ${large ? 'h-20 w-20' : 'h-14 w-14'}`} />
      <div className="text-center flex-1 px-4">
        <p className={`text-white font-black tracking-tight ${large ? 'text-2xl' : 'text-base'}`}>
          {competition?.name ?? 'Ütopya Yarışması'}
        </p>
      </div>
      <img src="/logo-sbf.png" alt="SBF"
        className={`object-contain bg-white rounded-xl p-1.5 shrink-0 ${large ? 'h-20' : 'h-14'}`} />
    </div>
  )
}

function AudioButton({ onUnlock }: { onUnlock: () => void }) {
  return (
    <button onClick={onUnlock}
      className="fixed bottom-4 right-4 bg-black/50 backdrop-blur border border-white/10 text-white/50 hover:text-white text-xs px-3 py-2 rounded-xl transition-all">
      🔇 Sesi Aç
    </button>
  )
}
