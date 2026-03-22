import { kv } from '@vercel/kv';
import { Product, Order, FinanceEntry, DailyClose, PRODUCTS as MOCK_PRODUCTS, financeEntries as MOCK_FINANCE, dailyCloses as MOCK_CLOSES } from './data';

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
    console.error('KV getProducts error:', e);
    return MOCK_PRODUCTS;
  }
}

export async function saveProducts(products: Product[]) {
  await kv.set(KEYS.PRODUCTS, products);
}

// Orders
export async function getOrders(): Promise<Order[]> {
  try {
    const orders = await kv.get<Order[]>(KEYS.ORDERS);
    return orders || [];
  } catch (e) {
    return [];
  }
}

export async function saveOrders(orders: Order[]) {
  await kv.set(KEYS.ORDERS, orders);
}

// Finance
export async function getFinanceEntries(): Promise<FinanceEntry[]> {
  try {
    const entries = await kv.get<FinanceEntry[]>(KEYS.FINANCE);
    return entries || MOCK_FINANCE;
  } catch (e) {
    return MOCK_FINANCE;
  }
}

export async function saveFinanceEntries(entries: FinanceEntry[]) {
  await kv.set(KEYS.FINANCE, entries);
}

// Daily Closes
export async function getDailyCloses(): Promise<DailyClose[]> {
  try {
    const closes = await kv.get<DailyClose[]>(KEYS.CLOSES);
    return closes || MOCK_CLOSES;
  } catch (e) {
    return MOCK_CLOSES;
  }
}

export async function saveDailyCloses(closes: DailyClose[]) {
  await kv.set(KEYS.CLOSES, closes);
}
