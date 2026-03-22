import { NextResponse } from 'next/server';
import { financeEntries } from '@/lib/data';

export async function GET() {
  return NextResponse.json(financeEntries);
}

export async function POST(request: Request) {
  const entry = await request.json();
  const newEntry = {
    ...entry,
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString().split('T')[0],
  };
  financeEntries.unshift(newEntry);
  return NextResponse.json(newEntry);
}
