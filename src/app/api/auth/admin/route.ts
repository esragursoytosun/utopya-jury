import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadDB, updateDB } from '@/lib/db'

const DEFAULT_PW = 'admin'

// Doğru şifre: önce DB'deki, yoksa env var, yoksa varsayılan
export function getAdminPassword(): string {
  try {
    const db = loadDB()
    if (db.competition.admin_password) return db.competition.admin_password
  } catch {}
  return process.env.ADMIN_PASSWORD || DEFAULT_PW
}

// Auth: header'daki session_id sunucudaki ile eşleşmeli (tek-oturum zorlaması)
export function checkAdminAuth(req: NextRequest): boolean {
  const sessionHeader = req.headers.get('x-admin-session') || ''
  if (!sessionHeader) {
    // Geriye dönük uyumluluk: eski client'lar şifre header'ı gönderiyordu
    const pwHeader = req.headers.get('x-admin-password') || ''
    return pwHeader !== '' && pwHeader === getAdminPassword()
  }
  try {
    const db = loadDB()
    return db.competition.admin_session_id === sessionHeader
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== getAdminPassword()) {
    return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 })
  }
  // Yeni oturum kodu üret — eski oturumlar otomatik iptal olur
  const newSessionId = crypto.randomBytes(24).toString('hex')
  updateDB(db => { db.competition.admin_session_id = newSessionId })
  return NextResponse.json({ ok: true, sessionId: newSessionId })
}
