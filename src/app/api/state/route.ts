import { NextResponse } from 'next/server'
import { loadDB, publicState } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await loadDB()
  return NextResponse.json(publicState(db))
}
