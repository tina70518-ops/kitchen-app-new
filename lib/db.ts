import { createClient } from '@vercel/kv';
import { Product, Order, FinanceEntry, DailyClose, PRODUCTS as MOCK_PRODUCTS, financeEntries as MOCK_FINANCE, dailyCloses as MOCK_CLOSES } from './data';

// 支援 Vercel Redis 的各種環境變數名稱
const kvUrl = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REDIS_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// 只有在有環境變數時才建立 KV 客戶端
// 如果只有 KV_REDIS_URL (像圖片中那樣)，createClient 會自動處理
const kv = kvUrl ? createClient({ 
  url: kvUrl.startsWith('redis') ? kvUrl.replace('redis://', 'https://') : kvUrl, 
  token: kvToken || kvUrl.split('@')[0].split(':').slice(-1)[0] // 嘗試從 URL 解析 token
}) : null;

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
    if (!kv) return memoryProducts;
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
  if (kv) await kv.set(KEYS.PRODUCTS, products);
}

// Orders
export async function getOrders(): Promise<Order[]> {
  try {
    if (!kv) return memoryOrders;
    const orders = await kv.get<Order[]>(KEYS.ORDERS);
    return orders || [];
  } catch (e) {
    console.error('KV getOrders error, falling back to memory:', e);
    return memoryOrders;
  }
}

export async function saveOrders(orders: Order[]) {
  memoryOrders = orders;
  if (kv) await kv.set(KEYS.ORDERS, orders);
}

// Finance
export async function getFinanceEntries(): Promise<FinanceEntry[]> {
  try {
    if (!kv) return memoryFinance;
    const entries = await kv.get<FinanceEntry[]>(KEYS.FINANCE);
    return entries || MOCK_FINANCE;
  } catch (e) {
    console.error('KV getFinanceEntries error, falling back to memory:', e);
    return memoryFinance;
  }
}

export async function saveFinanceEntries(entries: FinanceEntry[]) {
  memoryFinance = entries;
  if (kv) await kv.set(KEYS.FINANCE, entries);
}

// Daily Closes
export async function getDailyCloses(): Promise<DailyClose[]> {
  try {
    if (!kv) return memoryCloses;
    const closes = await kv.get<DailyClose[]>(KEYS.CLOSES);
    return closes || MOCK_CLOSES;
  } catch (e) {
    console.error('KV getDailyCloses error, falling back to memory:', e);
    return memoryCloses;
  }
}

export async function saveDailyCloses(closes: DailyClose[]) {
  memoryCloses = closes;
  if (kv) await kv.set(KEYS.CLOSES, closes);
}

