import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

const kvUrl = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const kv = kvUrl && kvToken ? createClient({ url: kvUrl, token: kvToken }) : null;

const KEYS = {
  PRODUCTS: 'kitchen_products',
  ORDERS: 'kitchen_orders',
  FINANCE: 'kitchen_finance',
  CLOSES: 'kitchen_closes',
};

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    // 只有輸入老闆密碼才能清空
    if (password !== '8888') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (kv) {
      // 清空所有相關的 Key
      await Promise.all([
        kv.del(KEYS.ORDERS),
        kv.del(KEYS.FINANCE),
        kv.del(KEYS.CLOSES),
        // 注意：不刪除 PRODUCTS，保留菜單
      ]);
    }

    return NextResponse.json({ success: true, message: 'Database cleared (except products)' });
  } catch (error) {
    console.error('Clear DB error:', error);
    return NextResponse.json({ error: 'Failed to clear database' }, { status: 500 });
  }
}
