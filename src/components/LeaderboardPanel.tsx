'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { GroupWithScore } from '@/types'
import { MAX_SCORE_PER_JURY } from '@/lib/constants'

interface Props {
  groups: GroupWithScore[]
  currentGroupId: string | null
  juryCount: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPanel({ groups, currentGroupId, juryCount }: Props) {
  const maxTotal = juryCount * MAX_SCORE_PER_JURY
  // Sadece sonucu açıklanmış grupları sırala, geri kalanları sona ekle
  const revealed = [...groups]
    .filter((g) => g.score_revealed)
    .sort((a, b) => b.total_score - a.total_score)

  const pending = groups
    .filter((g) => !g.score_revealed)
    .sort((a, b) => a.order_index - b.order_index)

  const sorted = [...revealed, ...pending]

  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-white/50 text-xs uppercase tracking-widest mb-1 text-center">
        Sıralama
      </p>
      <AnimatePresence>
        {sorted.map((group, idx) => {
          const isRevealed = group.score_revealed
          const isCurrent = group.id === currentGroupId
          const rank = isRevealed ? revealed.findIndex((g) => g.id === group.id) + 1 : null

          return (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                isCurrent && !isRevealed
                  ? 'bg-blue-500/30 border border-blue-400/40'
                  : isRevealed
                  ? 'bg-white/10 border border-white/10'
                  : 'bg-white/5 border border-white/5',
              ].join(' ')}
            >
              {/* Sıra */}
              <span className="w-6 text-center text-base">
                {rank && rank <= 3 ? MEDALS[rank - 1] : rank ? `${rank}.` : '—'}
              </span>

              {/* Grup adı */}
              <span
                className={[
                  'flex-1 font-medium truncate',
                  isRevealed ? 'text-white' : isCurrent ? 'text-blue-200' : 'text-white/40',
                ].join(' ')}
              >
                {group.name}
              </span>

              {/* Puan */}
              {isRevealed ? (
                <motion.span
                  key={group.total_score}
                  initial={{ scale: 1.4, color: '#FCD34D' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="font-bold tabular-nums text-right min-w-[3rem]"
                >
                  {group.total_score}
                </motion.span>
              ) : isCurrent ? (
                <span className="text-blue-300/60 text-xs">oylama</span>
              ) : (
                <span className="text-white/20 text-xs">—</span>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      <p className="text-white/30 text-xs text-center mt-1">Maks. {maxTotal} puan</p>
    </div>
  )
}
