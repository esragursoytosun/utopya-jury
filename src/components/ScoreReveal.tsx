'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { audioManager } from '@/lib/audio'

interface Props {
  groupName: string
  totalScore: number
  maxScore: number
  juryCount: number
  onDone?: () => void
}

export default function ScoreReveal({ groupName, totalScore, maxScore, juryCount, onDone }: Props) {
  const [displayScore, setDisplayScore] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'counting' | 'done'>('intro')

  useEffect(() => {
    audioManager?.scoreReveal()
    const introTimer = setTimeout(() => {
      setPhase('counting')
      let current = 0
      const step = Math.max(1, Math.floor(totalScore / 80))
      const interval = setInterval(() => {
        current = Math.min(current + step, totalScore)
        setDisplayScore(current)
        if (current < totalScore) audioManager?.countTick()
        if (current >= totalScore) {
          clearInterval(interval)
          setPhase('done')
          audioManager?.fanfare()
          setTimeout(() => onDone?.(), 2500)
        }
      }, 25)
      return () => clearInterval(interval)
    }, 1400)
    return () => clearTimeout(introTimer)
  }, [totalScore, onDone])

  const percent = maxScore > 0 ? (displayScore / maxScore) * 100 : 0
  const average = juryCount > 0 ? (totalScore / juryCount).toFixed(1) : '0'

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-12 w-full">
      {/* Üst başlık */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-white/40 text-sm md:text-base uppercase tracking-[0.4em] mb-4">
          Değerlendirme Sonucu
        </p>
        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none text-balance px-6">
          {groupName}
        </h2>
      </motion.div>

      {/* Puan dairesi — büyük ve gösterişli */}
      <motion.div
        className="relative flex items-center justify-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 180, damping: 18 }}
      >
        {/* Dış halo */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: phase === 'done'
              ? ['0 0 60px rgba(245,158,11,0.4)', '0 0 100px rgba(245,158,11,0.7)', '0 0 60px rgba(245,158,11,0.4)']
              : '0 0 30px rgba(245,158,11,0.2)',
          }}
          transition={{ duration: 2, repeat: phase === 'done' ? Infinity : 0 }}
        />

        <svg width="340" height="340" className="rotate-[-90deg]">
          <circle cx="170" cy="170" r="150" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
          <motion.circle
            cx="170" cy="170" r="150"
            fill="none" stroke="url(#scoreGrad)" strokeWidth="18" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 150}
            animate={{ strokeDashoffset: 2 * Math.PI * 150 * (1 - percent / 100) }}
            transition={{ duration: 0.1 }}
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute flex flex-col items-center">
          <motion.span
            className="text-8xl md:text-9xl font-black text-white tabular-nums leading-none drop-shadow-lg"
            animate={phase === 'done' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {displayScore}
          </motion.span>
          <span className="text-white/50 text-xl mt-2">/ {maxScore}</span>
        </div>
      </motion.div>

      {/* Alt bilgi — ortalama, jüri sayısı */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-6 md:gap-12"
          >
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Jüri Ortalaması</p>
              <p className="text-3xl font-bold text-amber-400 tabular-nums">{average}<span className="text-white/30 text-xl">/25</span></p>
            </div>
            <div className="hidden md:block w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Jüri Sayısı</p>
              <p className="text-3xl font-bold text-white tabular-nums">{juryCount}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
