import { NextResponse } from 'next/server';
import { getPurchaseOrders, savePurchaseOrders, getFinanceEntries, saveFinanceEntries, getPriceHistories, savePriceHistories } from '@/lib/db';

export async function GET() {
  const orders = await getPurchaseOrders();
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const orders = await getPurchaseOrders();
    const body = await request.json();
    const newOrder = {
      ...body,
      id: Math.random().toString(36).substr(2, 9),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    await savePurchaseOrders([newOrder, ...orders]);
    return NextResponse.json(newOrder);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const orders = await getPurchaseOrders();
    const body = await request.json();

    // 如果是完成進貨單，自動產生支出和價格歷史
    if (body.status === 'completed') {
      const today = new Date().toISOString().split('T')[0];

      // 自動產生支出
      const financeEntries = await getFinanceEntries();
      const summary = body.items.map((i: any) => i.supplierProduct.name).join(' + ');
      const newExpense = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'expense' as const,
        category: '食材' as const,
        amount: body.total,
        description: `進貨：${summary}`,
        date: today,
      };
      await saveFinanceEntries([newExpense, ...financeEntries]);

      // 自動記錄價格歷史
      const histories = await getPriceHistories();
      const newHistories = body.items.map((i: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        supplierProductId: i.supplierProduct.id,
        supplierProductName: i.supplierProduct.name,
        unitPrice: i.unitPrice,
        date: today,
        purchaseOrderId: body.id,
      }));
      await savePriceHistories([...newHistories, ...histories]);
    }

    const updated = orders.map(o => o.id === body.id ? { ...body } : o);
    await savePurchaseOrders(updated);
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const orders = await getPurchaseOrders();
    const { id } = await request.json();
    await savePurchaseOrders(orders.filter(o => o.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
