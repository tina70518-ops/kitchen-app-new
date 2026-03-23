import { kv } from '@vercel/kv';
import { Product, Order, FinanceEntry, DailyClose, PRODUCTS as MOCK_PRODUCTS, financeEntries as MOCK_FINANCE, dailyCloses as MOCK_CLOSES } from './data';

// 記憶體備援 (如果資料庫沒接通時使用)
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

// Products
export async function getProducts(): Promise<Product[]> {
  try {
    const products = await kv.get<Product[]>(KEYS.PRODUCTS);
    if (!products || products.length === 0) {
      await kv.set(KEYS.PRODUCTS, MOCK_PRODUCTS);
      return MOCK_PRODUCTS;
    }
    return products;
  } catch (e) {
    console.error('KV getProducts error, falling back to memory:', e);
    return memoryProducts;
  }
}

export async function saveProducts(products: Product[]) {
  memoryProducts = products;
  try {
    await kv.set(KEYS.PRODUCTS, products);
  } catch (e) {
    console.error('KV saveProducts error:', e);
  }
}

// Orders
export async function getOrders(): Promise<Order[]> {
  try {
    const orders = await kv.get<Order[]>(KEYS.ORDERS);
    return orders || [];
  } catch (e) {
    console.error('KV getOrders error, falling back to memory:', e);
    return memoryOrders;
  }
}

export async function saveOrders(orders: Order[]) {
  memoryOrders = orders;
  try {
    await kv.set(KEYS.ORDERS, orders);
  } catch (e) {
    console.error('KV saveOrders error:', e);
  }
}

// Finance
export async function getFinanceEntries(): Promise<FinanceEntry[]> {
  try {
    const entries = await kv.get<FinanceEntry[]>(KEYS.FINANCE);
    return entries || MOCK_FINANCE;
  } catch (e) {
    console.error('KV getFinanceEntries error, falling back to memory:', e);
    return memoryFinance;
  }
}

export async function saveFinanceEntries(entries: FinanceEntry[]) {
  memoryFinance = entries;
  try {
    await kv.set(KEYS.FINANCE, entries);
  } catch (e) {
    console.error('KV saveFinanceEntries error:', e);
  }
}

// Daily Closes
export async function getDailyCloses(): Promise<DailyClose[]> {
  try {
    const closes = await kv.get<DailyClose[]>(KEYS.CLOSES);
    return closes || MOCK_CLOSES;
  } catch (e) {
    console.error('KV getDailyCloses error, falling back to memory:', e);
    return memoryCloses;
  }
}

export async function saveDailyCloses(closes: DailyClose[]) {
  memoryCloses = closes;
  try {
    await kv.set(KEYS.CLOSES, closes);
  } catch (e) {
    console.error('KV saveDailyCloses error:', e);
  }
}
