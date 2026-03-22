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
    
    const updatedOrders = [newOrder, ...orders];
    await saveOrders(updatedOrders);
    return NextResponse.json(newOrder);
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const orders = await getOrders();
    const { id, status } = await request.json();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index].status = status;
      await saveOrders(orders);
      return NextResponse.json(orders[index]);
    }
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const orders = await getOrders();
    const { id } = await request.json();
    const filtered = orders.filter(o => o.id !== id);
    await saveOrders(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
