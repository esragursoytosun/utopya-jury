import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadDB, updateDB } from '@/lib/db'

const DEFAULT_PW = 'admin'

export async function getAdminPassword(): Promise<string> {
  try {
    const db = await loadDB()
    if (db.competition.admin_password) return db.competition.admin_password
  } catch {}
  return process.env.ADMIN_PASSWORD || DEFAULT_PW
}

export async function checkAdminAuth(req: NextRequest): Promise<boolean> {
  const sessionHeader = req.headers.get('x-admin-session') || ''
  if (!sessionHeader) {
    const pwHeader = req.headers.get('x-admin-password') || ''
    return pwHeader !== '' && pwHeader === (await getAdminPassword())
  }
  try {
    const db = await loadDB()
    return db.competition.admin_session_id === sessionHeader
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== (await getAdminPassword())) {
    return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 })
  }
  const newSessionId = crypto.randomBytes(24).toString('hex')
  await updateDB(db => { db.competition.admin_session_id = newSessionId })
  return NextResponse.json({ ok: true, sessionId: newSessionId })
}
