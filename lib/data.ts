export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  isAvailable?: boolean;
  cost?: number;
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
export let financeEntries: FinanceEntry[] = [];
export let dailyCloses: DailyClose[] = [];
// 供應商商品
export interface SupplierProduct {
  id: string;
  name: string;
  supplier: string;
  unit: 'kg' | '桶' | '包' | '個' | '箱' | '其他';
  defaultPrice: number;
  category: '食材' | '包材' | '其他';
}

// 進貨單商品項目
export interface PurchaseOrderItem {
  supplierProduct: SupplierProduct;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// 進貨單
export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: PurchaseOrderItem[];
  total: number;
  status: 'draft' | 'completed';
  date: string;
  createdAt: string;
  note?: string;
}

// 價格歷史
export interface PriceHistory {
  id: string;
  supplierProductId: string;
  supplierProductName: string;
  unitPrice: number;
  date: string;
  purchaseOrderId: string;
}

export let supplierProducts: SupplierProduct[] = [];
export let purchaseOrders: PurchaseOrder[] = [];
export let priceHistories: PriceHistory[] = [];
