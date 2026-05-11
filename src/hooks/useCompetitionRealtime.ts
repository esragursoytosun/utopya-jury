'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DBState, GroupWithScore } from '@/types'

const POLL_INTERVAL_MS = 1000
const FETCH_TIMEOUT_MS = 15000  // Mobil/yavaş ağda hızlı fail için

export function useCompetitionRealtime(opts?: { admin?: boolean }) {
  const [state, setState] = useState<DBState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const url = opts?.admin ? '/api/admin/state' : '/api/state'

  const fetchState = useCallback(async () => {
    try {
      const headers: HeadersInit = {}
      if (opts?.admin) {
        const pw = sessionStorage.getItem('admin_pw')
        if (pw) headers['X-Admin-Password'] = pw
      }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(url, {
          headers,
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          const data = await res.json()
          setState(data)
          setError(null)
        } else {
          setError(`Sunucu hatası (${res.status})`)
        }
      } catch (e: any) {
        clearTimeout(timeoutId)
        if (e?.name === 'AbortError') {
          setError('Sunucu yanıt vermiyor (timeout). Tekrar deniyor...')
        } else {
          setError('Bağlantı hatası: ' + (e?.message || 'bilinmiyor'))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [url, opts?.admin])

  useEffect(() => {
    fetchState()
    intervalRef.current = setInterval(fetchState, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchState])

  // Türetilmiş veri
  const competition = state?.competition ?? null
  const groups = state?.groups ?? []
  const juries = state?.juries ?? []
  const votes = state?.votes ?? []

  const groupsWithScores: GroupWithScore[] = groups.map(g => {
    const groupVotes = votes.filter(v => v.group_id === g.id)
    const totalScore = groupVotes.reduce((s, v) => s + v.total, 0)
    return {
      ...g,
      total_score: totalScore,
      vote_count: groupVotes.length,
      average_score: groupVotes.length > 0 ? totalScore / groupVotes.length : 0,
    }
  })

  const currentGroup = groupsWithScores.find(g => g.id === competition?.current_group_id) ?? null
  const currentGroupVotes = votes.filter(v => v.group_id === competition?.current_group_id)
  const hasJuryVoted = (juryId: string) => currentGroupVotes.some(v => v.jury_id === juryId)
  const allVotesIn = juries.length > 0 && currentGroupVotes.length >= juries.length

  return {
    competition,
    groups: groupsWithScores,
    juries,
    votes,
    currentGroup,
    currentGroupVotes,
    hasJuryVoted,
    allVotesIn,
    loading,
    error,
    refresh: fetchState,
  }
}

/* ───── Admin aksiyon yardımcıları ───── */
export async function adminAction(type: string, payload?: any) {
  const pw = typeof window !== 'undefined' ? sessionStorage.getItem('admin_pw') : null
  const res = await fetch('/api/admin/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(pw ? { 'X-Admin-Password': pw } : {}),
    },
    body: JSON.stringify({ type, payload }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'İşlem başarısız')
  }
  return res.json()
}
