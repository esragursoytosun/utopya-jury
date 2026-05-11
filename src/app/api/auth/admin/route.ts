import { NextRequest, NextResponse } from 'next/server'
import { loadDB } from '@/lib/db'

const DEFAULT_PW = 'admin'

// Doğru şifre: önce DB'deki, yoksa env var, yoksa varsayılan
export function getAdminPassword(): string {
  try {
    const db = loadDB()
    if (db.competition.admin_password) return db.competition.admin_password
  } catch {}
  return process.env.ADMIN_PASSWORD || DEFAULT_PW
}

export function checkAdminAuth(req: NextRequest): boolean {
  const header = req.headers.get('x-admin-password') || ''
  return header === getAdminPassword()
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password === getAdminPassword()) return NextResponse.json({ ok: true })
  return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 })
}
