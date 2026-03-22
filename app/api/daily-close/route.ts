import { NextResponse } from 'next/server';
import { getDailyCloses, saveDailyCloses } from '@/lib/db';

export async function GET() {
  const closes = await getDailyCloses();
  return NextResponse.json(closes);
}

export async function POST(request: Request) {
  try {
    const closes = await getDailyCloses();
    const data = await request.json();
    const newClose = {
      ...data,
      closedAt: new Date().toISOString(),
    };
    closes.push(newClose);
    await saveDailyCloses(closes);
    return NextResponse.json(newClose);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to close day' }, { status: 500 });
  }
}
