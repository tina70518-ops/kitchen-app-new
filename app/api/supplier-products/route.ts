import { NextResponse } from 'next/server';
import { getSupplierProducts, saveSupplierProducts } from '@/lib/db';

export async function GET() {
  const products = await getSupplierProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const products = await getSupplierProducts();
    const body = await request.json();
    const newProduct = {
      ...body,
      id: Math.random().toString(36).substr(2, 9),
    };
    await saveSupplierProducts([...products, newProduct]);
    return NextResponse.json(newProduct);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const products = await getSupplierProducts();
    const body = await request.json();
    const updated = products.map(p => p.id === body.id ? body : p);
    await saveSupplierProducts(updated);
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const products = await getSupplierProducts();
    const { id } = await request.json();
    await saveSupplierProducts(products.filter(p => p.id !== id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
