import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { MongoClient, type Collection } from 'mongodb'
import type { DBState, Group, Jury } from '@/types'

const MONGODB_URI = process.env.MONGODB_URI
const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'competition.json')
const STATE_DOC_ID = 'competition_state'

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

// MongoDB client singleton (HMR safe)
const globalForMongo = global as unknown as { _mongoClient?: MongoClient; _mongoCol?: Collection }

async function getCollection(): Promise<Collection | null> {
  if (!MONGODB_URI) return null
  if (globalForMongo._mongoCol) return globalForMongo._mongoCol
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(MONGODB_URI)
    await globalForMongo._mongoClient.connect()
  }
  globalForMongo._mongoCol = globalForMongo._mongoClient.db('utopya').collection('state')
  return globalForMongo._mongoCol
}

function migrateInline(db: DBState): DBState {
  if (db.competition && (db.competition as any).show_leaderboard === undefined) {
    (db.competition as any).show_leaderboard = false
  }
  return db
}

// MongoDB hata sayacı — corruption önlemek için "kaç ardışık hata" takip ediyor
let mongoErrorStreak = 0

export async function loadDB(): Promise<DBState> {
  const col = await getCollection()
  if (col) {
    try {
      const doc = await col.findOne<any>({ _id: STATE_DOC_ID as any })
      if (!doc) {
        // Doc yok: ilk kez kurulum → sadece tek seferlik defaults yaz
        const fresh = defaultDB()
        await col.insertOne({ _id: STATE_DOC_ID, ...fresh } as any)
        mongoErrorStreak = 0
        return fresh
      }
      const { _id, ...rest } = doc
      mongoErrorStreak = 0
      return migrateInline(rest as DBState)
    } catch (e) {
      mongoErrorStreak++
      console.error('[db] MongoDB load error, fallback to file (streak=' + mongoErrorStreak + '):', e)
    }
  }
  // Dosya fallback (hata yedek planı veya MONGODB_URI yoksa)
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_PATH)) {
    const db = defaultDB()
    saveDBSync(db)
    return db
  }
  try {
    return migrateInline(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')))
  } catch {
    const db = defaultDB()
    saveDBSync(db)
    return db
  }
}

export async function saveDB(db: DBState): Promise<void> {
  const col = await getCollection()
  if (col && mongoErrorStreak === 0) {
    // MongoDB sağlıklı görünüyorsa yaz. Aksi halde dosyaya yaz, MongoDB'yi corrupte etme.
    try {
      await col.replaceOne({ _id: STATE_DOC_ID as any }, { _id: STATE_DOC_ID, ...db } as any, { upsert: true })
      return
    } catch (e) {
      mongoErrorStreak++
      console.error('[db] MongoDB save error, fallback to file:', e)
    }
  }
  // MongoDB güvenilmez ya da yapılandırılmamış → dosyaya yaz
  saveDBSync(db)
}

function saveDBSync(db: DBState): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

export async function updateDB(fn: (db: DBState) => void): Promise<DBState> {
  const db = await loadDB()
  fn(db)
  await saveDB(db)
  return db
}

export function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function publicState(db: DBState): DBState {
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
