import { neon } from '@neondatabase/serverless';
import {
  Product, Order, FinanceEntry, DailyClose,
  PRODUCTS as MOCK_PRODUCTS,
  financeEntries as MOCK_FINANCE,
  dailyCloses as MOCK_CLOSES,
} from './data';

function getDb() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('No database URL found');
  return neon(url);
}

// 初始化資料表（第一次執行時建立）
export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      image TEXT,
      is_available BOOLEAN DEFAULT true
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS finance_entries (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      date TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS daily_closes (
      date TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `;

  // 如果 products 是空的，填入預設資料
  const existing = await sql`SELECT id FROM products LIMIT 1`;
  if (existing.length === 0) {
    for (const p of MOCK_PRODUCTS) {
      await sql`
        INSERT INTO products (id, name, price, category, image, is_available)
        VALUES (${p.id}, ${p.name}, ${p.price}, ${p.category}, ${p.image ?? null}, ${p.isAvailable ?? true})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }
}

// Products
export async function getProducts(): Promise<Product[]> {
  try {
    const sql = getDb();
    await initDb();
    const rows = await sql`SELECT * FROM products ORDER BY id`;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      category: r.category,
      image: r.image ?? undefined,
      isAvailable: r.is_available,
    }));
  } catch (e) {
    console.error('getProducts error:', e);
    return MOCK_PRODUCTS;
  }
}

export async function saveProducts(products: Product[]) {
  try {
    const sql = getDb();
    await initDb();
    for (const p of products) {
      await sql`
        INSERT INTO products (id, name, price, category, image, is_available)
        VALUES (${p.id}, ${p.name}, ${p.price}, ${p.category}, ${p.image ?? null}, ${p.isAvailable ?? true})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          category = EXCLUDED.category,
          image = EXCLUDED.image,
          is_available = EXCLUDED.is_available
      `;
    }
  } catch (e) {
    console.error('saveProducts error:', e);
  }
}

// Orders
export async function getOrders(): Promise<Order[]> {
  try {
    const sql = getDb();
    await initDb();
    const rows = await sql`SELECT data FROM orders ORDER BY created_at DESC`;
    return rows.map((r) => r.data as Order);
  } catch (e) {
    console.error('getOrders error:', e);
    return [];
  }
}

export async function saveOrders(orders: Order[]) {
  try {
    const sql = getDb();
    await initDb();
    // 清空並重新寫入
    await sql`DELETE FROM orders`;
    for (const o of orders) {
      await sql`
        INSERT INTO orders (id, data, status, created_at)
        VALUES (${o.id}, ${JSON.stringify(o)}, ${o.status}, ${o.createdAt})
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          status = EXCLUDED.status
      `;
    }
} catch (e) {
    console.error('saveOrders error:', e);
  }
}
