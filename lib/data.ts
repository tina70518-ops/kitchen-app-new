export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  isAvailable?: boolean;
}

export interface Order {
  id: string;
  items: { 
    product: Product; 
    quantity: number;
    spiciness?: '不辣' | '小辣' | '中辣' | '大辣';
    note?: string;
  }[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  pickupTime?: string;
  orderNote?: string;
}

export interface FinanceEntry {
  id: string;
  type: 'income' | 'expense';
  category?: '食材' | '人事' | '固定成本' | '其他';
  amount: number;
  description: string;
  date: string;
  items?: { product: Product; quantity: number }[];
}

export interface DailyClose {
  date: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  closedAt: string;
}

// Mock Data
export let PRODUCTS: Product[] = [
  { id: '1', name: '雞排', price: 55, category: '炸物', isAvailable: true },
  { id: '2', name: '腿塊', price: 30, category: '炸物', isAvailable: true },
  { id: '3', name: '雞腿', price: 35, category: '炸物', isAvailable: true },
  { id: '4', name: '雞腿(3支)', price: 100, category: '優惠組合', isAvailable: true },
  { id: '5', name: '三角骨(小份)', price: 50, category: '炸物', isAvailable: true },
  { id: '6', name: '三角骨(大份)', price: 90, category: '炸物', isAvailable: true },
  { id: '7', name: '雞翅', price: 20, category: '炸物', isAvailable: true },
  { id: '8', name: '雞翅(3支)', price: 50, category: '優惠組合', isAvailable: true },
  { id: '9', name: '雞翅(7支)', price: 100, category: '優惠組合', isAvailable: true },
];

export let orders: Order[] = [];
export let financeEntries: FinanceEntry[] = [
  { id: 'f1', type: 'expense', category: '食材', amount: 500, description: '採買食材', date: '2026-03-20' },
  { id: 'f2', type: 'income', amount: 1200, description: '午餐時段營收', date: '2026-03-20' },
  { id: 'f3', type: 'expense', category: '人事', amount: 1500, description: '計時人員工資', date: '2026-03-21' },
  { id: 'f4', type: 'expense', category: '固定成本', amount: 3000, description: '店鋪租金', date: '2026-03-21' },
];

export let dailyCloses: DailyClose[] = [
  { date: '2026-03-20', totalIncome: 1200, totalExpense: 500, profit: 700, closedAt: '2026-03-20T21:00:00Z' }
];
