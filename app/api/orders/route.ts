import { NextResponse } from 'next/server';
import { getOrders, saveOrder, saveOrders } from '@/lib/db';

// ✅ 新增這個函數到 db.ts（單筆更新 status，不動其他資料）
// 下面我也會給你 db.ts 要補的函數

export async function GET() {
  const orders = await getOrders();
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newOrder = {
      ...body,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // ✅ 只寫這一筆，不再讀取所有舊訂單
    await saveOrder(newOrder);
    return NextResponse.json(newOrder);
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status } = await request.json();

    // ✅ 直接用 SQL 更新單筆，不再撈全部
    await updateOrderStatus(id, status);
    return NextResponse.json({ id, status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    // ✅ 直接刪單筆
    await deleteOrder(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
