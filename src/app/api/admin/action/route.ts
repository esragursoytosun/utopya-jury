import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { updateDB, genCode, resetCompetition } from '@/lib/db'
import { checkAdminAuth } from '../../auth/admin/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { type, payload } = await req.json()

  try {
    const newDB = updateDB(db => {
      switch (type) {
        /* ---------- Yarışma ---------- */
        case 'callNextGroup': {
          if (db.competition.current_group_id) {
            const cur = db.groups.find(g => g.id === db.competition.current_group_id)
            if (cur) {
              // Skor henüz açıklanmadıysa otomatik açıkla (podyumda görünmesi için)
              if (!cur.score_revealed) {
                cur.score_revealed = true
                cur.score_revealed_at = new Date().toISOString()
              }
              cur.status = 'locked'
            }
          }
          const next = db.groups
            .filter(g => g.status === 'pending')
            .sort((a, b) => a.order_index - b.order_index)[0]
          if (!next) {
            // Pending kalmadı → yarışma bitti. Otomatik podyum açılır.
            db.competition.status = 'finished'
            db.competition.voting_open = false
            db.competition.current_group_id = null
            db.competition.show_podium = db.groups.some(g => g.score_revealed)
            db.competition.show_leaderboard = false
            return
          }
          next.status = 'active'
          db.competition.status = 'active'
          db.competition.current_group_id = next.id
          db.competition.voting_open = false
          db.competition.show_podium = false
          break
        }

        case 'toggleVoting':
          db.competition.voting_open = !db.competition.voting_open
          break

        case 'revealScore': {
          const cur = db.groups.find(g => g.id === db.competition.current_group_id)
          if (cur) {
            cur.score_revealed = true
            cur.score_revealed_at = new Date().toISOString()  // her açıklamada bump (animasyon yeniden tetiklensin)
          }
          db.competition.voting_open = false
          break
        }

        case 'hideScore': {
          const cur = db.groups.find(g => g.id === db.competition.current_group_id)
          if (cur) cur.score_revealed = false
          break
        }

        case 'showPodium':
          db.competition.show_podium = true
          db.competition.show_leaderboard = false
          db.competition.voting_open = false
          break

        case 'hidePodium':
          db.competition.show_podium = false
          break

        case 'toggleLeaderboard':
          db.competition.show_leaderboard = !db.competition.show_leaderboard
          // Sıralama gösterilirken podyum kapalı kalsın
          if (db.competition.show_leaderboard) db.competition.show_podium = false
          break

        case 'finishCompetition': {
          // Aktif grubun skorunu otomatik açıkla (yoksa) ve yarışmayı bitir
          if (db.competition.current_group_id) {
            const cur = db.groups.find(g => g.id === db.competition.current_group_id)
            if (cur) {
              if (!cur.score_revealed) {
                cur.score_revealed = true
                cur.score_revealed_at = new Date().toISOString()
              }
              cur.status = 'locked'
            }
          }
          // Güvence: kilitli ama açıklanmamış tüm grupları otomatik aç
          db.groups.forEach(g => {
            if (g.status === 'locked' && !g.score_revealed) {
              g.score_revealed = true
              g.score_revealed_at = new Date().toISOString()
            }
          })
          db.competition.status = 'finished'
          db.competition.voting_open = false
          db.competition.current_group_id = null
          db.competition.show_podium = db.groups.some(g => g.score_revealed)
          db.competition.show_leaderboard = false
          break
        }

        case 'revealAllLocked': {
          // Mevcut data için: tüm kilitli ama açıklanmamış grupları aç
          db.groups.forEach(g => {
            if (g.status === 'locked' && !g.score_revealed) {
              g.score_revealed = true
              g.score_revealed_at = new Date().toISOString()
            }
          })
          break
        }

        case 'unfinishCompetition': {
          // Yarışmayı "bitti" durumundan çıkar ve son kilitli grubu yeniden aktif yap
          // (skoru korunur — display ek animasyon oynatmaz)
          db.competition.show_podium = false
          db.competition.show_leaderboard = false
          db.competition.voting_open = false
          db.competition.status = 'active'

          const lastLocked = [...db.groups]
            .filter(g => g.status === 'locked')
            .sort((a, b) => b.order_index - a.order_index)[0]

          if (lastLocked) {
            lastLocked.status = 'active'
            db.competition.current_group_id = lastLocked.id
          } else {
            db.competition.current_group_id = null
          }
          break
        }

        case 'previousGroup': {
          // Mevcut grubu kilitle (varsa) ve bir önceki kilitli gruba geri dön
          const sortedGroups = [...db.groups].sort((a, b) => a.order_index - b.order_index)
          let currentIdx = -1
          if (db.competition.current_group_id) {
            currentIdx = sortedGroups.findIndex(g => g.id === db.competition.current_group_id)
          }

          // Önceki kilitli grubu bul
          const searchUpTo = currentIdx === -1 ? sortedGroups.length : currentIdx
          const prev = sortedGroups.slice(0, searchUpTo).reverse().find(g => g.status === 'locked')
          if (!prev) throw new Error('Geri dönülecek önceki grup yok')

          // Mevcut aktif grubu pending'e çevir (yeniden çağrılabilir)
          if (currentIdx !== -1) {
            sortedGroups[currentIdx].status = 'pending'
          }

          prev.status = 'active'
          db.competition.current_group_id = prev.id
          db.competition.status = 'active'
          db.competition.show_podium = false
          db.competition.voting_open = false
          break
        }

        case 'resetJuryVote':
          db.votes = db.votes.filter(v =>
            !(v.group_id === db.competition.current_group_id && v.jury_id === payload.juryId))
          break

        case 'resetCurrentGroupVotes':
          db.votes = db.votes.filter(v => v.group_id !== db.competition.current_group_id)
          break

        case 'resetCompetition':
          resetCompetition(db)
          break

        case 'updateCompName':
          db.competition.name = String(payload.name).trim() || db.competition.name
          break

        case 'changePassword': {
          const newPw = String(payload.newPassword ?? '').trim()
          if (newPw.length < 4) throw new Error('Yeni şifre en az 4 karakter olmalı')
          db.competition.admin_password = newPw
          break
        }

        /* ---------- Gruplar ---------- */
        case 'addGroup': {
          const max = db.groups.reduce((m, g) => Math.max(m, g.order_index), 0)
          db.groups.push({
            id: crypto.randomUUID(),
            name: String(payload.name).trim(),
            order_index: max + 1,
            status: 'pending',
            score_revealed: false,
          })
          break
        }

        case 'editGroup': {
          const g = db.groups.find(g => g.id === payload.id)
          if (g) g.name = String(payload.name).trim()
          break
        }

        case 'deleteGroup':
          db.groups = db.groups.filter(g => g.id !== payload.id)
          db.votes = db.votes.filter(v => v.group_id !== payload.id)
          if (db.competition.current_group_id === payload.id) {
            db.competition.current_group_id = null
          }
          break

        case 'moveGroup': {
          const sorted = [...db.groups].sort((a, b) => a.order_index - b.order_index)
          const idx = sorted.findIndex(g => g.id === payload.id)
          const swap = payload.dir === 'up' ? idx - 1 : idx + 1
          if (swap >= 0 && swap < sorted.length) {
            const a = sorted[idx], b = sorted[swap]
            const tmp = a.order_index
            a.order_index = b.order_index
            b.order_index = tmp
          }
          break
        }

        case 'resetGroupScore': {
          const g = db.groups.find(g => g.id === payload.id)
          if (g) { g.score_revealed = false; g.status = 'pending' }
          db.votes = db.votes.filter(v => v.group_id !== payload.id)
          break
        }

        /* ---------- Jüriler ---------- */
        case 'addJury': {
          db.juries.push({
            id: crypto.randomUUID(),
            name: String(payload.name).trim(),
            display_order: db.juries.length + 1,
            access_code: payload.code ? String(payload.code).trim() : null,
          })
          break
        }

        case 'editJury': {
          const j = db.juries.find(j => j.id === payload.id)
          if (j) {
            j.name = String(payload.name).trim()
            j.access_code = payload.code ? String(payload.code).trim() : null
          }
          break
        }

        case 'deleteJury':
          db.juries = db.juries.filter(j => j.id !== payload.id)
          db.votes = db.votes.filter(v => v.jury_id !== payload.id)
          break

        case 'autoCodeJury': {
          const j = db.juries.find(j => j.id === payload.id)
          if (j) j.access_code = genCode()
          break
        }

        case 'bulkCreateJuries': {
          const count = parseInt(payload.count) || 10
          const start = db.juries.length
          for (let i = 0; i < count; i++) {
            db.juries.push({
              id: crypto.randomUUID(),
              name: `Jüri ${start + i + 1}`,
              display_order: start + i + 1,
              access_code: genCode(),
            })
          }
          break
        }

        case 'clearAllJuries':
          db.juries = []
          db.votes = []
          break

        case 'regenerateAllCodes':
          db.juries.forEach(j => { j.access_code = genCode() })
          break

        default:
          throw new Error('Bilinmeyen aksiyon: ' + type)
      }
    })

    return NextResponse.json({ ok: true, state: newDB })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
