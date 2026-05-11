import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { DBState, Group, Jury } from '@/types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'competition.json')

const DEFAULT_GROUPS = [
  'Sağlık Yönetimi',
  'Hemşirelik',
  'Fizyoterapi ve Rehabilitasyon',
  'Çocuk Gelişimi',
  'Dil ve Konuşma Terapisi',
  'Perfüzyon',
  'Ergoterapi',
  'Beslenme ve Diyetetik',
  'Odyoloji',
  'Sosyal Hizmet',
]

function defaultDB(): DBState {
  const groups: Group[] = DEFAULT_GROUPS.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    order_index: i + 1,
    status: 'pending',
    score_revealed: false,
  }))

  const juries: Jury[] = Array.from({ length: 20 }, (_, i) => ({
    id: crypto.randomUUID(),
    name: `Jüri ${i + 1}`,
    display_order: i + 1,
    access_code: String(1001 + i),
  }))

  return {
    competition: {
      name: 'Ütopya Yarışması 2026',
      status: 'waiting',
      voting_open: false,
      show_podium: false,
      show_leaderboard: false,
      current_group_id: null,
    },
    groups,
    juries,
    votes: [],
  }
}

export function loadDB(): DBState {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_PATH)) {
    const db = defaultDB()
    saveDB(db)
    return db
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
    return migrateInline(parsed)
  } catch {
    const db = defaultDB()
    saveDB(db)
    return db
  }
}

function migrateInline(db: DBState): DBState {
  if (db.competition && (db.competition as any).show_leaderboard === undefined) {
    (db.competition as any).show_leaderboard = false
  }
  return db
}

export function saveDB(db: DBState) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

export function updateDB(fn: (db: DBState) => void): DBState {
  const db = loadDB()
  fn(db)
  saveDB(db)
  return db
}

export function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function publicState(db: DBState): DBState {
  // Erişim kodlarını gizle (admin dışında)
  return {
    ...db,
    juries: db.juries.map(j => ({ ...j, access_code: null })),
  }
}

export function resetCompetition(db: DBState) {
  db.competition.status = 'waiting'
  db.competition.voting_open = false
  db.competition.show_podium = false
  db.competition.show_leaderboard = false
  db.competition.current_group_id = null
  db.groups.forEach(g => { g.status = 'pending'; g.score_revealed = false })
  db.votes = []
}

// Eski kayıtlarda show_leaderboard alanı yoksa, varsayılan ekle
export function migrate(db: DBState): DBState {
  if (db.competition && (db.competition as any).show_leaderboard === undefined) {
    (db.competition as any).show_leaderboard = false
  }
  return db
}
