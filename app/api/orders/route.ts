import { NextResponse } from 'next/server';
import { getOrders, saveOrders } from '@/lib/db';

export async function GET() {
  const orders = await getOrders();
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const orders = await getOrders();
    const body = await request.json();
    const newOrder = {
      ...body,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    await saveOrders(orders);
    return NextResponse.json(newOrder);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
