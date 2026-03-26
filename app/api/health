import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    const url =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL
    if (!url) throw new Error('No database URL found')
    const sql = neon(url)
    const r = await sql`SELECT 1 as ok`
    return NextResponse.json({ db: 'ok', result: r[0] })
  } catch (e: any) {
    return NextResponse.json({ db: 'error', message: e.message }, { status: 500 })
  }
}
