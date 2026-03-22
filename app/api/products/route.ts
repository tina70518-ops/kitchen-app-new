import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/lib/data';

export async function GET() {
  return NextResponse.json(PRODUCTS);
}

export async function POST(request: Request) {
  try {
    const product = await request.json();
    const newProduct = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
      isAvailable: product.isAvailable ?? true,
    };
    PRODUCTS.push(newProduct);
    return NextResponse.json(newProduct);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedProduct = await request.json();
    const index = PRODUCTS.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      PRODUCTS[index] = updatedProduct;
      return NextResponse.json(updatedProduct);
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const index = PRODUCTS.findIndex(p => p.id === id);
    if (index !== -1) {
      const deleted = PRODUCTS.splice(index, 1);
      return NextResponse.json(deleted[0]);
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
