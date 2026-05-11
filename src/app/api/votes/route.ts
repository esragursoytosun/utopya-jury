import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { updateDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { group_id, jury_id, criteria_1, criteria_2, criteria_3, criteria_4, criteria_5 } = body

  // Doğrulama
  const scores = [criteria_1, criteria_2, criteria_3, criteria_4, criteria_5]
  if (!group_id || !jury_id) {
    return NextResponse.json({ error: 'group_id ve jury_id gerekli' }, { status: 400 })
  }
  if (scores.some(s => typeof s !== 'number' || s < 1 || s > 5)) {
    return NextResponse.json({ error: 'Tüm puanlar 1-5 arası olmalı' }, { status: 400 })
  }

  try {
    const db = updateDB(db => {
      // Aktif grup mu?
      if (db.competition.current_group_id !== group_id) {
        throw new Error('Bu grup şu anda aktif değil')
      }
      if (!db.competition.voting_open) {
        throw new Error('Oylama açık değil')
      }
      // Jüri var mı?
      if (!db.juries.find(j => j.id === jury_id)) {
        throw new Error('Jüri bulunamadı')
      }
      // Çift oy önleme
      if (db.votes.find(v => v.group_id === group_id && v.jury_id === jury_id)) {
        throw new Error('Bu jüri zaten oy vermiş')
      }
      const total = scores.reduce((a, b) => a + b, 0)
      db.votes.push({
        id: crypto.randomUUID(),
        group_id,
        jury_id,
        criteria_1, criteria_2, criteria_3, criteria_4, criteria_5,
        total,
        submitted_at: new Date().toISOString(),
      })
      // Tüm jüriler oy verdiyse oylamayı otomatik kapat
      const groupVoteCount = db.votes.filter(v => v.group_id === group_id).length
      if (db.juries.length > 0 && groupVoteCount >= db.juries.length) {
        db.competition.voting_open = false
      }
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
