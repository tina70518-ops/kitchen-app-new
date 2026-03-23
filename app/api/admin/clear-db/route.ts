import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('No database URL found');
  return neon(url);
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (password !== '8888') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    
    // 清空訂單、收支、關帳（保留菜單）
    await sql`DELETE FROM orders`;
    await sql`DELETE FROM finance_entries`;
    await sql`DELETE FROM daily_closes`;

    return NextResponse.json({ success: true, message: 'Database cleared (except products)' });
  } catch (error) {
    console.error('Clear DB error:', error);
    return NextResponse.json({ error: 'Failed to clear database' }, { status: 500 });
  }
}
