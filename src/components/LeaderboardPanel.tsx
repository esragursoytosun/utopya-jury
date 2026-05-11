'use client'

import { motion } from 'framer-motion'
import type { GroupWithScore } from '@/types'

interface Props {
  groups: GroupWithScore[]
  currentGroupId: string | null
  juryCount: number
}

export default function LeaderboardPanel({ groups, currentGroupId }: Props) {
  // Orijinal sıralamayla göster (puan/sıralama göstermeden — sadece liste)
  const sorted = [...groups].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-white/50 text-xs uppercase tracking-widest mb-1 text-center">
        Gruplar
      </p>
      {sorted.map((group, idx) => {
        const isCurrent = group.id === currentGroupId
        const isLocked = group.status === 'locked'
        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
            className={[
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
              isCurrent
                ? 'bg-blue-500/30 border border-blue-400/40'
                : isLocked
                ? 'bg-white/10 border border-white/10'
                : 'bg-white/5 border border-white/5',
            ].join(' ')}
          >
            <span className="w-6 text-center text-white/40 text-xs">{group.order_index}.</span>
            <span className={[
              'flex-1 font-medium truncate',
              isCurrent ? 'text-blue-200' : isLocked ? 'text-white/70' : 'text-white/50',
            ].join(' ')}>
              {group.name}
            </span>
            <span className="text-xs">
              {isCurrent ? (
                <span className="text-blue-300/80">oylanıyor</span>
              ) : isLocked ? (
                <span className="text-emerald-400/70">✓</span>
              ) : (
                <span className="text-white/30">—</span>
              )}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
