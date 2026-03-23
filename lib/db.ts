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

let dbInitialized = false;

async function ensureDb() {
  if (dbInitialized) return;
  await initDb();
  dbInitialized = true;
}

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

export async function getProducts(): Promise<Product[]> {
  try {
    const sql = getDb();
    await ensureDb();
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
    await ensureDb();
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

export async function getOrders(): Promise<Order[]> {
  try {
    const sql = getDb();
    await ensureDb();
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
    await ensureDb();
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

export async function getFinanceEntries(): Promise<FinanceEntry[]> {
  try {
    const sql = getDb();
    await ensureDb();
    const rows = await sql`SELECT data FROM finance_entries ORDER BY date DESC`;
    return rows.map((r) => r.data as FinanceEntry);
  } catch (e) {
    console.error('getFinanceEntries error:', e);
    return MOCK_FINANCE;
  }
}

export async function saveFinanceEntries(entries: FinanceEntry[]) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`DELETE FROM finance_entries`;
    for (const e of entries) {
      await sql`
        INSERT INTO finance_entries (id, data, date)
        VALUES (${e.id}, ${JSON.stringify(e)}, ${e.date})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `;
    }
  } catch (e) {
    console.error('saveFinanceEntries error:', e);
  }
}

export async function getDailyCloses(): Promise<DailyClose[]> {
  try {
    const sql = getDb();
    await ensureDb();
    const rows = await sql`SELECT data FROM daily_closes ORDER BY date DESC`;
    return rows.map((r) => r.data as DailyClose);
  } catch (e) {
    console.error('getDailyCloses error:', e);
    return MOCK_CLOSES;
  }
}

export async function saveDailyCloses(closes: DailyClose[]) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`DELETE FROM daily_closes`;
    for (const c of closes) {
      await sql`
        INSERT INTO daily_closes (date, data)
        VALUES (${c.date}, ${JSON.stringify(c)})
        ON CONFLICT (date) DO UPDATE SET data = EXCLUDED.data
      `;
    }
  } catch (e) {
    console.error('saveDailyCloses error:', e);
  }
}
// SupplierProducts
export async function getSupplierProducts(): Promise<SupplierProduct[]> {
  try {
    const sql = getDb();
    await ensureDb();
    const rows = await sql`SELECT data FROM supplier_products ORDER BY data->>'name'`;
    return rows.map((r) => r.data as SupplierProduct);
  } catch (e) {
    console.error('getSupplierProducts error:', e);
    return [];
  }
}

export async function saveSupplierProducts(products: SupplierProduct[]) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`DELETE FROM supplier_products`;
    for (const p of products) {
      await sql`
        INSERT INTO supplier_products (id, data)
        VALUES (${p.id}, ${JSON.stringify(p)})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `;
    }
  } catch (e) {
    console.error('saveSupplierProducts error:', e);
  }
}

// PurchaseOrders
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const sql = getDb();
    await ensureDb();
    const rows = await sql`SELECT data FROM purchase_orders ORDER BY created_at DESC`;
    return rows.map((r) => r.data as PurchaseOrder);
  } catch (e) {
    console.error('getPurchaseOrders error:', e);
    return [];
  }
}

export async function savePurchaseOrders(orders: PurchaseOrder[]) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`DELETE FROM purchase_orders`;
    for (const o of orders) {
      await sql`
        INSERT INTO purchase_orders (id, data, status, created_at)
        VALUES (${o.id}, ${JSON.stringify(o)}, ${o.status}, ${o.createdAt})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status
      `;
    }
  } catch (e) {
    console.error('savePurchaseOrders error:', e);
  }
}

// PriceHistory
export async function getPriceHistories(): Promise<PriceHistory[]> {
  try {
    const sql = getDb();
    await ensureDb();
    const rows = await sql`SELECT data FROM price_histories ORDER BY date DESC`;
    return rows.map((r) => r.data as PriceHistory);
  } catch (e) {
    console.error('getPriceHistories error:', e);
    return [];
  }
}

export async function savePriceHistories(histories: PriceHistory[]) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`DELETE FROM price_histories`;
    for (const h of histories) {
      await sql`
        INSERT INTO price_histories (id, data, date)
        VALUES (${h.id}, ${JSON.stringify(h)}, ${h.date})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `;
    }
  } catch (e) {
    console.error('savePriceHistories error:', e);
  }
}
