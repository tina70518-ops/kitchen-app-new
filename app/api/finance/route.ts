import { NextResponse } from 'next/server';
import { getFinanceEntries, saveFinanceEntries } from '@/lib/db';

export async function GET() {
  const entries = await getFinanceEntries();
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  try {
    const entries = await getFinanceEntries();
    const entry = await request.json();
    const newEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      date: entry.date || new Date().toISOString().split('T')[0],
    };
    entries.unshift(newEntry);
    await saveFinanceEntries(entries);
    return NextResponse.json(newEntry);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create finance entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const entries = await getFinanceEntries();
    const { id } = await request.json();
    const filtered = entries.filter(e => e.id !== id);
    await saveFinanceEntries(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete finance entry' }, { status: 500 });
  }
}
