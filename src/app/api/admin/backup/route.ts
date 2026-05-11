import { NextRequest, NextResponse } from 'next/server'
import { loadDB, saveDB } from '@/lib/db'
import { checkAdminAuth } from '../../auth/admin/route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = await loadDB()
  return new NextResponse(JSON.stringify(db, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="utopya-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json"`,
    },
  })
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const data = await req.json()
    if (!data?.competition || !Array.isArray(data?.groups) || !Array.isArray(data?.juries) || !Array.isArray(data?.votes)) {
      return NextResponse.json({ error: 'Geçersiz yedek dosyası' }, { status: 400 })
    }
    await saveDB(data)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Yükleme hatası: ' + e.message }, { status: 400 })
  }
}
