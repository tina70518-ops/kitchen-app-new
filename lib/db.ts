import Redis from 'ioredis';
import { Product, Order, FinanceEntry, DailyClose, PRODUCTS as MOCK_PRODUCTS, financeEntries as MOCK_FINANCE, dailyCloses as MOCK_CLOSES } from './data';

// 記憶體備援
let memoryOrders: Order[] = [];
let memoryFinance: FinanceEntry[] = [...MOCK_FINANCE];
let memoryCloses: DailyClose[] = [...MOCK_CLOSES];
let memoryProducts: Product[] = [...MOCK_PRODUCTS];

const KEYS = {
  PRODUCTS: 'kitchen_products',
  ORDERS: 'kitchen_orders',
  FINANCE: 'kitchen_finance',
  CLOSES: 'kitchen_closes',
};

// 建立 Redis 客戶端
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  try {
    redis = new Redis(url, {
      tls: url.includes('redislabs.com') ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    return redis;
  } catch (e) {
    console.error('Failed to create Redis client:', e);
    return null;
  }
}

async function kvGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.error(`Redis GET ${key} error:`, e);
    return null;
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Redis SET ${key} error:`, e);
  }
}

// Products
export async function getProducts(): Promise<Product[]> {
  const products = await kvGet<Product[]>(KEYS.PRODUCTS);
  if (!products || products.length === 0) {
    await kvSet(KEYS.PRODUCTS, MOCK_PRODUCTS);
    return MOCK_PRODUCTS;
  }
  return products;
}

export async function saveProducts(products: Product[]) {
  memoryProducts = products;
  await kvSet(KEYS.PRODUCTS, products);
}

// Orders
export async function getOrders(): Promise<Order[]> {
  const orders = await kvGet<Order[]>(KEYS.ORDERS);
  if (orders) return orders;
  return memoryOrders;
}

export async function saveOrders(orders: Order[]) {
  memoryOrders = orders;
  await kvSet(KEYS.ORDERS, orders);
}

// Finance
export async function getFinanceEntries(): Promise<FinanceEntry[]> {
  const entries = await kvGet<FinanceEntry[]>(KEYS.FINANCE);
  if (entries) return entries;
  return memoryFinance;
}

export async function saveFinanceEntries(entries: FinanceEntry[]) {
  memoryFinance = entries;
  await kvSet(KEYS.FINANCE, entries);
}

// Daily Closes
export async function getDailyCloses(): Promise<DailyClose[]> {
  const closes = await kvGet<DailyClose[]>(KEYS.CLOSES);
  if (closes) return closes;
  return memoryCloses;
}

export async function saveDailyCloses(closes: DailyClose[]) {
  memoryCloses = closes;
  await kvSet(KEYS.CLOSES, closes);
}
