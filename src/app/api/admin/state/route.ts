import { NextRequest, NextResponse } from 'next/server'
import { loadDB } from '@/lib/db'
import { checkAdminAuth } from '../../auth/admin/route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await loadDB())
}
