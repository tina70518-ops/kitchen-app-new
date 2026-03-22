import { NextResponse } from 'next/server';
import { orders } from '@/lib/data';

export async function GET() {
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newOrder = {
    ...body,
    id: Math.random().toString(36).substr(2, 9),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.unshift(newOrder);
  return NextResponse.json(newOrder);
}
