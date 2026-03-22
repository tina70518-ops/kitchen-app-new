import { NextResponse } from 'next/server';
import { dailyCloses } from '@/lib/data';

export async function GET() {
  return NextResponse.json(dailyCloses);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newClose = {
      ...data,
      closedAt: new Date().toISOString(),
    };
    dailyCloses.push(newClose);
    return NextResponse.json(newClose);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to close day' }, { status: 500 });
  }
}
