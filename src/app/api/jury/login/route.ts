import { NextRequest, NextResponse } from 'next/server'
import { loadDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { code, juryId } = await req.json()
  const db = loadDB()

  // Direct ID seçim (kod yoksa kullanılır)
  if (juryId) {
    const jury = db.juries.find(j => j.id === juryId)
    if (jury) return NextResponse.json({ ok: true, jury: { id: jury.id, name: jury.name } })
    return NextResponse.json({ error: 'Jüri bulunamadı' }, { status: 404 })
  }

  // Kod ile giriş
  if (!code) return NextResponse.json({ error: 'Kod gerekli' }, { status: 400 })
  const jury = db.juries.find(j => j.access_code === String(code).trim())
  if (jury) return NextResponse.json({ ok: true, jury: { id: jury.id, name: jury.name } })
  return NextResponse.json({ error: 'Geçersiz kod' }, { status: 401 })
}
