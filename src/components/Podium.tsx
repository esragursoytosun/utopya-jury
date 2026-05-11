'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { audioManager } from '@/lib/audio'
import type { GroupWithScore } from '@/types'
import { MAX_SCORE_PER_JURY } from '@/lib/constants'

interface Props {
  groups: GroupWithScore[]
  juryCount: number
}

export default function Podium({ groups, juryCount }: Props) {
  const maxTotal = juryCount * MAX_SCORE_PER_JURY
  const allRanked = [...groups]
    .filter((g) => g.score_revealed)
    .sort((a, b) => b.total_score - a.total_score)
  const top3 = allRanked.slice(0, 3)
  const others = allRanked.slice(3)
  const hasResults = top3.length > 0

  useEffect(() => {
    if (!hasResults) return
    const t1 = setTimeout(() => audioManager?.podiumReveal(3), 800)
    const t2 = setTimeout(() => audioManager?.podiumReveal(2), 2200)
    const t3 = setTimeout(() => {
      audioManager?.podiumReveal(1)
      setTimeout(() => audioManager?.fanfare(), 800)
    }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [hasResults])

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-7xl">⏳</div>
        <h2 className="text-4xl font-bold text-white">Sonuçlar henüz açıklanmadı</h2>
        <p className="text-white/40 text-lg">En az bir grubun skoru açıklanınca podyum gösterilecek.</p>
      </div>
    )
  }

  // Görsel sıralama: 2 - 1 - 3 (orta en yüksek)
  const slots = [
    { group: top3[1], rank: 2, height: 'h-64 md:h-80', delay: 1.4, gradient: 'from-slate-300 via-slate-100 to-slate-300', border: 'border-slate-300/40', textColor: 'text-slate-100', glow: 'shadow-[0_0_50px_rgba(203,213,225,0.5)]', medal: '🥈' },
    { group: top3[0], rank: 1, height: 'h-80 md:h-[26rem]', delay: 3.2, gradient: 'from-amber-400 via-yellow-300 to-amber-400', border: 'border-amber-300/60', textColor: 'text-white', glow: 'shadow-[0_0_80px_rgba(251,191,36,0.7)]', medal: '🥇' },
    { group: top3[2], rank: 3, height: 'h-48 md:h-60', delay: 0.4, gradient: 'from-amber-700 via-orange-600 to-amber-700', border: 'border-amber-600/40', textColor: 'text-white', glow: 'shadow-[0_0_40px_rgba(180,83,9,0.5)]', medal: '🥉' },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-5xl">
      {/* Başlık */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-amber-400/70 text-sm md:text-base uppercase tracking-[0.5em] mb-3">
          Final Sonuçları
        </p>
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
          🏆 Kazananlar
        </h1>
      </motion.div>

      {/* Podyum kutuları */}
      <div className="flex items-end justify-center gap-3 md:gap-6 w-full px-4 mt-4">
        {slots.map((slot, i) => {
          const g = slot.group
          if (!g) return <div key={i} className="flex-1 max-w-xs" />
          return (
            <motion.div
              key={g.id}
              className="flex-1 max-w-xs flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: slot.delay, type: 'spring', stiffness: 100, damping: 15 }}
            >
              {/* Madalya + grup adı + puan */}
              <motion.div
                className="text-center px-2"
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ delay: slot.delay + 0.2, type: 'spring', stiffness: 200 }}
              >
                <div className="text-5xl md:text-6xl mb-2">{slot.medal}</div>
                <p className="text-white font-black text-lg md:text-xl leading-tight mb-2 text-balance">
                  {g.name}
                </p>
                <p className="text-amber-400 font-black text-3xl md:text-4xl tabular-nums">
                  {g.total_score}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  / {maxTotal} · ort {juryCount > 0 ? (g.total_score / juryCount).toFixed(1) : '0'}/25
                </p>
              </motion.div>

              {/* Podyum bloğu */}
              <motion.div
                className={`${slot.height} w-full rounded-t-3xl flex items-center justify-center bg-gradient-to-b ${slot.gradient} ${slot.glow} border-2 ${slot.border} relative overflow-hidden`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ originY: 1 }}
                transition={{ delay: slot.delay + 0.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {/* parıltı efekti */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/10 to-transparent"
                  initial={{ y: '100%' }}
                  animate={{ y: '-100%' }}
                  transition={{ delay: slot.delay + 0.8, duration: 1.2, ease: 'easeOut' }}
                />
                <span className={`text-7xl md:text-8xl font-black ${slot.textColor} drop-shadow-2xl relative z-10`}>
                  {slot.rank}
                </span>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* 4. ve sonrası — sade liste */}
      {others.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5, duration: 0.6 }}
          className="w-full max-w-xl mt-6"
        >
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-3 text-center">
            Diğer Sıralama
          </p>
          <div className="flex flex-col gap-1.5">
            {others.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 5.2 + i * 0.08 }}
                className="flex items-center gap-4 px-5 py-2.5 bg-white/5 rounded-xl border border-white/5"
              >
                <span className="text-white/40 w-8 text-base font-bold">{i + 4}.</span>
                <span className="flex-1 text-white/80 text-base">{g.name}</span>
                <span className="text-amber-400/80 text-base font-mono font-bold tabular-nums">{g.total_score}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
