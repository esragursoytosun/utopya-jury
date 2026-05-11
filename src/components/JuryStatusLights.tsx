'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Jury } from '@/types'

interface Props {
  juries: Jury[]
  votedJuryIds: Set<string>
  showNames?: boolean
}

export default function JuryStatusLights({ juries, votedJuryIds, showNames = false }: Props) {
  const voted = votedJuryIds.size
  const total = juries.length

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/60 text-sm uppercase tracking-widest">
        {voted} / {total} Jüri Oy Verdi
      </p>

      <div className="flex flex-wrap justify-center gap-3 max-w-lg">
        {juries.map((jury) => {
          const hasVoted = votedJuryIds.has(jury.id)
          return (
            <motion.div
              key={jury.id}
              className="flex flex-col items-center gap-1"
              title={jury.name}
            >
              <AnimatePresence mode="wait">
                {hasVoted ? (
                  <motion.div
                    key="voted"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className="w-8 h-8 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-8 h-8 rounded-full bg-white/20 border border-white/20"
                  />
                )}
              </AnimatePresence>
              {showNames && (
                <span className="text-white/50 text-[9px] text-center w-12 truncate">
                  {jury.name}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full"
          animate={{ width: `${total > 0 ? (voted / total) * 100 : 0}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  )
}
