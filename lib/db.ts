import { neon } from '@neondatabase/serverless';
import {
  Product, Order, FinanceEntry, DailyClose,
  SupplierProduct, PurchaseOrder, PriceHistory,
  PRODUCTS as MOCK_PRODUCTS,
  financeEntries as MOCK_FINANCE,
  dailyCloses as MOCK_CLOSES,
} from './data';

function getDb() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('No database URL found');
  return neon(url);
}

let initPromise: Promise<void> | null = null;

async function ensureDb() {
  if (!initPromise) {
    initPromise = initDb().catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
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
      is_available BOOLEAN DEFAULT true,
      cost INTEGER DEFAULT 0
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
  await sql`
    CREATE TABLE IF NOT EXISTS supplier_products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS price_histories (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      date TEXT NOT NULL
    )
  `;

  const existing = await sql`SELECT id FROM products LIMIT 1`;
  if (existing.length === 0) {
    await saveProducts(MOCK_PRODUCTS);
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
      cost: r.cost ?? 0,
    }));
  } catch (e) {
    console.error('getProducts error:', e);
    return MOCK_PRODUCTS;
  }
}

export async function saveProducts(products: Product[]) {
  if (products.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const ids = products.map((p) => p.id);
    const names = products.map((p) => p.name);
    const prices = products.map((p) => p.price);
    const categories = products.map((p) => p.category);
    const images = products.map((p) => p.image ?? null);
    const isAvailables = products.map((p) => p.isAvailable ?? true);
    const costs = products.map((p) => p.cost ?? 0);

    await sql`
      INSERT INTO products (id, name, price, category, image, is_available, cost)
      SELECT * FROM unnest(
        ${ids}::text[],
        ${names}::text[],
        ${prices}::int[],
        ${categories}::text[],
        ${images}::text[],
        ${isAvailables}::boolean[],
        ${costs}::int[]
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        category = EXCLUDED.category,
        image = EXCLUDED.image,
        is_available = EXCLUDED.is_available,
        cost = EXCLUDED.cost
    `;
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

export async function saveOrder(order: Order) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`
      INSERT INTO orders (id, data, status, created_at)
      VALUES (${order.id}, ${JSON.stringify(order)}, ${order.status}, ${order.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        status = EXCLUDED.status
    `;
  } catch (e) {
    console.error('saveOrder error:', e);
  }
}

export async function saveOrders(orders: Order[]) {
  if (orders.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const ids = orders.map((o) => o.id);
    const datas = orders.map((o) => JSON.stringify(o));
    const statuses = orders.map((o) => o.status);
    const createdAts = orders.map((o) => o.createdAt);

    await sql`
      INSERT INTO orders (id, data, status, created_at)
      SELECT * FROM unnest(
        ${ids}::text[],
        ${datas}::jsonb[],
        ${statuses}::text[],
        ${createdAts}::timestamptz[]
      )
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        status = EXCLUDED.status
    `;
  } catch (e) {
    console.error('saveOrders error:', e);
  }
}

export async function updateOrderStatus(id: string, status: string) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`
      UPDATE orders
      SET status = ${status},
          data = data || jsonb_build_object('status', ${status})
      WHERE id = ${id}
    `;
  } catch (e) {
    console.error('updateOrderStatus error:', e);
  }
}

export async function deleteOrder(id: string) {
  try {
    const sql = getDb();
    await ensureDb();
    await sql`DELETE FROM orders WHERE id = ${id}`;
  } catch (e) {
    console.error('deleteOrder error:', e);
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
  if (entries.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const ids = entries.map((e) => e.id);
    const datas = entries.map((e) => JSON.stringify(e));
    const dates = entries.map((e) => e.date);

    await sql`
      INSERT INTO finance_entries (id, data, date)
      SELECT * FROM unnest(
        ${ids}::text[],
        ${datas}::jsonb[],
        ${dates}::text[]
      )
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
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
  if (closes.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const dates = closes.map((c) => c.date);
    const datas = closes.map((c) => JSON.stringify(c));

    await sql`
      INSERT INTO daily_closes (date, data)
      SELECT * FROM unnest(
        ${dates}::text[],
        ${datas}::jsonb[]
      )
      ON CONFLICT (date) DO UPDATE SET data = EXCLUDED.data
    `;
  } catch (e) {
    console.error('saveDailyCloses error:', e);
  }
}

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
  if (products.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const ids = products.map((p) => p.id);
    const datas = products.map((p) => JSON.stringify(p));

    await sql`
      INSERT INTO supplier_products (id, data)
      SELECT * FROM unnest(
        ${ids}::text[],
        ${datas}::jsonb[]
      )
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } catch (e) {
    console.error('saveSupplierProducts error:', e);
  }
}

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
  if (orders.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const ids = orders.map((o) => o.id);
    const datas = orders.map((o) => JSON.stringify(o));
    const statuses = orders.map((o) => o.status);
    const createdAts = orders.map((o) => o.createdAt);

    await sql`
      INSERT INTO purchase_orders (id, data, status, created_at)
      SELECT * FROM unnest(
        ${ids}::text[],
        ${datas}::jsonb[],
        ${statuses}::text[],
        ${createdAts}::timestamptz[]
      )
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status
    `;
  } catch (e) {
    console.error('savePurchaseOrders error:', e);
  }
}

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
  if (histories.length === 0) return;
  try {
    const sql = getDb();
    await ensureDb();

    const ids = histories.map((h) => h.id);
    const datas = histories.map((h) => JSON.stringify(h));
    const dates = histories.map((h) => h.date);

    await sql`
      INSERT INTO price_histories (id, data, date)
      SELECT * FROM unnest(
        ${ids}::text[],
        ${datas}::jsonb[],
        ${dates}::text[]
      )
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } catch (e) {
    console.error('savePriceHistories error:', e);
  }
}
