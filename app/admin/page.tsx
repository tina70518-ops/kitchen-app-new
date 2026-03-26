'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowLeft, Plus, Trash2, ClipboardList, CheckCircle, Lock, ShoppingBag, Minus, BarChart3, User, Phone, Clock, Volume2, BellRing, Settings, Edit2, Save, X, Search, AlertTriangle, UserCircle, Package, History, FileText } from 'lucide-react';
import Link from 'next/link';
import { FinanceEntry, Order, PRODUCTS, Product, DailyClose, SupplierProduct, PurchaseOrder } from '@/lib/data';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'boss' | 'staff' | null>(null);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'pos' | 'orders' | 'finance' | 'menu' | 'purchase' | 'report'>('pos');
  const [chartView, setChartView] = useState<'day' | 'week' | 'month'>('day');
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [dailyCloses, setDailyCloses] = useState<DailyClose[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '炸物', isAvailable: true, cost: 0 });
  const [posCart, setPosCart] = useState<{ product: Product, quantity: number, spiciness?: '不辣' | '小辣' | '中辣' | '大辣', note?: string }[]>([]);
  const [showPosCart, setShowPosCart] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [detailEntry, setDetailEntry] = useState<FinanceEntry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuActiveCategory, setMenuActiveCategory] = useState('全部');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  // 進貨相關 state
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showAddSupplierProductModal, setShowAddSupplierProductModal] = useState(false);
  const [showAddPurchaseOrderModal, setShowAddPurchaseOrderModal] = useState(false);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [priceHistories, setPriceHistories] = useState<any[]>([]);
  const [newSupplierProduct, setNewSupplierProduct] = useState<Partial<SupplierProduct>>({ name: '', supplier: '', unit: 'kg', defaultPrice: 0, category: '食材' });
  const [newPurchaseOrder, setNewPurchaseOrder] = useState<{ supplier: string, items: { supplierProduct: SupplierProduct, quantity: number, unitPrice: number, subtotal: number }[], note: string }>({ supplier: '', items: [], note: '' });
  const [activeSupplierTab, setActiveSupplierTab] = useState<'orders' | 'products'>('orders');

  const previousOrderCount = useRef(0);
  const isInitialLoad = useRef(true);
  const processingOrderIds = useRef<Set<string>>(new Set());
  const audioObjRef = useRef<HTMLAudioElement | null>(null);
  const isSoundEnabledRef = useRef(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const CRAYON_STYLE_URL = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';

  const unlockAndTestAudio = () => {
    setIsAudioLoading(true);
    try {
      if (!audioObjRef.current) audioObjRef.current = new Audio(CRAYON_STYLE_URL);
      const audio = audioObjRef.current;
      audio.volume = 0.8;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsSoundEnabled(true);
          isSoundEnabledRef.current = true;
          setIsAudioLoading(false);
          setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 2000);
        }).catch(e => {
          console.error('Playback failed:', e);
          setIsAudioLoading(false);
          alert('啟動失敗：請確認手機未開啟靜音模式，並確保網路連線正常後再試一次。');
        });
      }
    } catch (err) {
      console.error('Audio init error:', err);
      setIsAudioLoading(false);
      alert('系統錯誤：無法初始化音效元件。');
    }
  };

  const playNotificationSound = () => {
    if (isSoundEnabledRef.current && audioObjRef.current) {
      const audio = audioObjRef.current;
      audio.currentTime = 0;
      audio.play().then(() => {
        setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 2000);
      }).catch(e => console.warn('Auto-play blocked:', e));
    }
  };

  const [newEntry, setNewEntry] = useState<Partial<FinanceEntry>>({
    type: 'income', category: '食材', amount: 0, description: '', date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
   const fetchOrders = async () => {
      try {
        const orderRes = await fetch('/api/orders');
        if (!orderRes.ok) throw new Error('Failed to fetch orders');
        const orderData = await orderRes.json();
        if (Array.isArray(orderData)) {
          // 過濾掉正在處理中的訂單
          const filteredOrders = orderData.filter((o: Order) => !processingOrderIds.current.has(o.id));
          
          // 只有在非初始載入，且訂單數量增加時才通知
          if (filteredOrders.length > previousOrderCount.current && !isInitialLoad.current) {
            if (isSoundEnabledRef.current && audioObjRef.current) {
              const audio = audioObjRef.current;
              audio.currentTime = 0;
              audio.play().then(() => {
                setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 2000);
              }).catch(e => console.warn('Auto-play blocked:', e));
            }
            setNewOrderCount(filteredOrders.length);
            setShowNewOrderAlert(true);
            setTimeout(() => setShowNewOrderAlert(false), 5000);
          }
          
          previousOrderCount.current = filteredOrders.length;
          isInitialLoad.current = false;
          
          // 效能優化：只有當訂單資料真的有變動時，才更新 state 避免每 3 秒全畫面重新渲染
          setOrders(prev => {
            if (JSON.stringify(prev) === JSON.stringify(filteredOrders)) return prev;
            return filteredOrders;
          });
        }
      } catch (error) { console.error('Polling error:', error); }
    };

    const fetchAllData = async () => {
      try {
        const productRes = await fetch('/api/products');
        const productData = await productRes.json();
        setProducts(prev => JSON.stringify(prev) === JSON.stringify(productData) ? prev : productData);

        const financeRes = await fetch('/api/finance');
        if (!financeRes.ok) throw new Error('Failed to fetch finance');
        const financeData = await financeRes.json();
        if (Array.isArray(financeData)) setEntries(prev => JSON.stringify(prev) === JSON.stringify(financeData) ? prev : financeData);

        const closeRes = await fetch('/api/daily-close');
        if (closeRes.ok) { 
          const closeData = await closeRes.json(); 
          setDailyCloses(prev => JSON.stringify(prev) === JSON.stringify(closeData) ? prev : closeData); 
        }

        const supplierProductRes = await fetch('/api/supplier-products');
        if (supplierProductRes.ok) { 
          const data = await supplierProductRes.json(); 
          setSupplierProducts(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data); 
        }

        const purchaseOrderRes = await fetch('/api/purchase-orders');
        if (purchaseOrderRes.ok) { 
          const data = await purchaseOrderRes.json(); 
          setPurchaseOrders(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data); 
        }
      } catch (error) { console.error('Fetch all data error:', error); }
    };

    fetchOrders();
    fetchAllData();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  const chartData = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) acc[date] = { date, income: 0, expense: 0 };
      if (entry.type === 'income') acc[date].income += entry.amount;
      else acc[date].expense += entry.amount;
      return acc;
    }, {} as Record<string, any>);
    const data = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    if (chartView === 'day') return data.slice(-7);
    if (chartView === 'week') return data.slice(-14);
    return data;
  }, [entries, chartView]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; });
    const currentMonth = today.slice(0, 7);
    const incomeEntries = entries.filter(e => e.type === 'income');
    const allExpenseEntries = entries.filter(e => e.type === 'expense');
    const filteredIncome = useCustomDateRange ? incomeEntries.filter(e => e.date >= reportStartDate && e.date <= reportEndDate) : incomeEntries;
    const filteredExpense = useCustomDateRange ? allExpenseEntries.filter(e => e.date >= reportStartDate && e.date <= reportEndDate) : allExpenseEntries;
    const dailyRevenue = incomeEntries.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    const dailyOrderCount = incomeEntries.filter(e => e.date === today).length;
    const weeklyRevenue = incomeEntries.filter(e => last7Days.includes(e.date)).reduce((s, e) => s + e.amount, 0);
    const monthlyRevenue = incomeEntries.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
    const reportRevenue = filteredIncome.reduce((s, e) => s + e.amount, 0);
    const reportExpense = filteredExpense.reduce((s, e) => s + e.amount, 0);
    const reportOrderCount = filteredIncome.length;
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    filteredIncome.forEach(e => { if (e.items) { e.items.forEach(item => { if (!productSales[item.product.id]) productSales[item.product.id] = { name: item.product.name, quantity: 0, revenue: 0 }; productSales[item.product.id].quantity += item.quantity; productSales[item.product.id].revenue += item.product.price * item.quantity; }); } });
    const ranking = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
    const aov = reportOrderCount > 0 ? Math.round(reportRevenue / reportOrderCount) : 0;
    const dailyAov = dailyOrderCount > 0 ? Math.round(dailyRevenue / dailyOrderCount) : 0;
    const expenseByCategory: Record<string, number> = { '食材': 0, '人事': 0, '固定成本': 0, '其他': 0 };
    filteredExpense.forEach(e => { const cat = e.category || '其他'; expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount; });
    const expensePieData = Object.entries(expenseByCategory).filter(([_, value]) => value > 0).map(([name, value]) => ({ name, value }));
    return { dailyRevenue, dailyOrderCount, weeklyRevenue, monthlyRevenue, reportRevenue, reportExpense, reportOrderCount, ranking, aov, dailyAov, orderCount: reportOrderCount, expensePieData };
  }, [entries, reportStartDate, reportEndDate, useCustomDateRange]);

  // 月結報表數據
  const reportStats = useMemo(() => {
    const monthIncome = entries.filter(e => e.type === 'income' && e.date.startsWith(reportMonth));
    const monthExpense = entries.filter(e => e.type === 'expense' && e.date.startsWith(reportMonth));
    const totalIncome = monthIncome.reduce((s, e) => s + e.amount, 0);
    const totalExpense = monthExpense.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalIncome - totalExpense;

    // 上個月
    const prevMonth = new Date(reportMonth + '-01');
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().slice(0, 7);
    const prevIncome = entries.filter(e => e.type === 'income' && e.date.startsWith(prevMonthStr)).reduce((s, e) => s + e.amount, 0);
    const prevExpense = entries.filter(e => e.type === 'expense' && e.date.startsWith(prevMonthStr)).reduce((s, e) => s + e.amount, 0);
    const prevProfit = prevIncome - prevExpense;

    const incomeGrowth = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0;
    const expenseGrowth = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0;
    const profitGrowth = prevProfit !== 0 ? Math.round(((netProfit - prevProfit) / Math.abs(prevProfit)) * 100) : 0;

    // 每日收支趨勢
    const dailyData: Record<string, { date: string, income: number, expense: number }> = {};
    entries.filter(e => e.date.startsWith(reportMonth)).forEach(e => {
      if (!dailyData[e.date]) dailyData[e.date] = { date: e.date, income: 0, expense: 0 };
      if (e.type === 'income') dailyData[e.date].income += e.amount;
      else dailyData[e.date].expense += e.amount;
    });
    const dailyChartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // 支出分類
    const expenseByCategory: Record<string, number> = { '食材': 0, '人事': 0, '固定成本': 0, '其他': 0 };
    monthExpense.forEach(e => { const cat = e.category || '其他'; expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount; });
    const expensePieData = Object.entries(expenseByCategory).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));

    // 成本分析
    const productSales: Record<string, { name: string, quantity: number, revenue: number, cost: number }> = {};
    monthIncome.forEach(e => {
      if (e.items) {
        e.items.forEach(item => {
          const prod = products.find(p => p.id === item.product.id);
          const cost = prod?.cost || 0;
          if (!productSales[item.product.id]) productSales[item.product.id] = { name: item.product.name, quantity: 0, revenue: 0, cost: 0 };
          productSales[item.product.id].quantity += item.quantity;
          productSales[item.product.id].revenue += item.product.price * item.quantity;
          productSales[item.product.id].cost += cost * item.quantity;
        });
      }
    });
    const costAnalysis = Object.values(productSales).map(p => ({
      ...p,
      profit: p.revenue - p.cost,
      margin: p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0,
    })).sort((a, b) => b.margin - a.margin);

    return { totalIncome, totalExpense, netProfit, incomeGrowth, expenseGrowth, profitGrowth, prevIncome, prevExpense, prevProfit, dailyChartData, expensePieData, costAnalysis };
  }, [entries, reportMonth, products]);

  const filteredMenuProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
      const matchesCategory = menuActiveCategory === '全部' || p.category === menuActiveCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, menuSearchTerm, menuActiveCategory]);

  const handleAddEntry = async () => {
    if (!newEntry.amount || !newEntry.description) return;
    
    // 先立即關閉 Modal 並清空表單
    const entry = { type: newEntry.type as 'income' | 'expense', category: newEntry.type === 'expense' ? newEntry.category : undefined, amount: Number(newEntry.amount), description: newEntry.description, date: newEntry.date };
    const tempEntry = { ...entry, id: 'temp_' + Date.now() };
    setEntries(prev => [tempEntry as any, ...prev]);
    setShowAddModal(false);
    setNewEntry({ type: 'income', amount: 0, description: '', date: new Date().toISOString().split('T')[0], category: '食材' });

    try {
      const res = await fetch('/api/finance', { method: 'POST', body: JSON.stringify(entry) });
      if (!res.ok) throw new Error('Finance creation failed');
      const savedEntry = await res.json();
      // 用真實資料替換暫時資料
      setEntries(prev => prev.map(e => (e as any).id === tempEntry.id ? savedEntry : e));
    } catch (error) {
      console.error('Add entry error:', error);
      // 失敗時移除暫時資料
      setEntries(prev => prev.filter(e => (e as any).id !== tempEntry.id));
      alert('新增紀錄失敗，請稍後再試！');
    }
  };

  const handleDailyClose = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (dailyCloses.find(c => c.date === today)) { alert('今天已經關帳過了！'); return; }
    const todayIncome = entries.filter(e => e.type === 'income' && e.date === today).reduce((s, e) => s + e.amount, 0);
    const todayExpense = entries.filter(e => e.type === 'expense' && e.date === today).reduce((s, e) => s + e.amount, 0);
    const profit = todayIncome - todayExpense;
    if (confirm(`確定要進行今日關帳嗎？\n日期：${today}\n總收入：$${todayIncome}\n總支出：$${todayExpense}\n今日盈餘：$${profit}`)) {
      try {
        const res = await fetch('/api/daily-close', { method: 'POST', body: JSON.stringify({ date: today, totalIncome: todayIncome, totalExpense: todayExpense, profit }) });
        if (!res.ok) throw new Error('Daily close failed');
        const savedClose = await res.json();
        setDailyCloses(prev => [...prev, savedClose]);
        alert('關帳成功！');
      } catch (error) { console.error('Daily close error:', error); alert('關帳失敗，請稍後再試！'); }
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ 警告：這將會清空所有的訂單、收支紀錄與關帳紀錄（保留菜單）！\n此操作無法復原，確定要執行嗎？')) return;
    try {
      const res = await fetch('/api/admin/clear-db', { method: 'POST', body: JSON.stringify({ password: '8888' }) });
      if (res.ok) { alert('數據已成功清空！頁面即將重新整理。'); window.location.reload(); }
      else alert('清空失敗，請確認您的權限。');
    } catch (error) { console.error('Clear DB error:', error); alert('發生錯誤，請稍後再試。'); }
  };

  const completeOrder = async (order: Order) => {
   // 標記為處理中，防止輪詢重新拉回
  processingOrderIds.current.add(order.id);
    previousOrderCount.current = Math.max(0, previousOrderCount.current - 1);
    setOrders(prev => prev.filter(o => o.id !== order.id));
    // 出餐後關閉通知視窗，避免誤觸發
    setShowNewOrderAlert(false);
    
    try {
      const financeRes = await fetch('/api/finance', { method: 'POST', body: JSON.stringify({ type: 'income', amount: order.total || 0, description: `訂單收入 #${(order.id || '').slice(-4)}`, items: order.items }) });
      if (!financeRes.ok) throw new Error('Finance update failed');
      const savedEntry = await financeRes.json();
      setEntries(prev => [savedEntry, ...prev]);
      await fetch('/api/orders', { method: 'DELETE', body: JSON.stringify({ id: order.id }) });
    } catch (error) {
      console.error('Complete order error:', error);
      processingOrderIds.current.delete(order.id);
      setOrders(prev => [order, ...prev]);
      alert('處理訂單失敗，請稍後再試！');
   } finally {
      // 延遲10秒再清除，確保資料庫已刪除
      setTimeout(() => {
        processingOrderIds.current.delete(order.id);
      }, 10000);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/orders', { method: 'PUT', body: JSON.stringify({ id, status }) });
      if (res.ok) { const updated = await res.json(); setOrders(prev => prev.map(o => o.id === id ? updated : o)); }
    } catch (error) { console.error('Update order status error:', error); }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('確定要刪除這筆訂單嗎？')) return;
    try {
      const res = await fetch('/api/orders', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) setOrders(prev => prev.filter(o => o.id !== id));
    } catch (error) { console.error('Delete order error:', error); }
  };

  const handlePosCheckout = async () => {
    try {
      const total = posCart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      if (total === 0) return;
      const received = receivedAmount ? parseInt(receivedAmount) : total;
      const changeDue = Math.max(0, received - total);
      const checkoutTime = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const payload = {
        type: 'income',
        amount: total,
        description: `現場點餐收入`,
        items: posCart.map(i => ({ product: i.product, quantity: i.quantity })),
        receivedAmount: received,
        changeDue,
        time: checkoutTime,
      } as any;
      const res = await fetch('/api/finance', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Finance update failed');
      const savedEntry = await res.json();
      const localEntry = { ...savedEntry, receivedAmount: received, changeDue, time: checkoutTime } as any;
      setEntries(prev => [localEntry, ...prev]);
      setPosCart([]);
      setShowPosCart(false);
      setReceivedAmount('');
    } catch (error) { console.error('POS Checkout error:', error); alert('結帳失敗，請稍後再試！'); }
  };

  // ✅ 優化：使用 useCallback 避免每次渲染都產生新的函式參考
  const updatePosCart = useCallback((product: Product, delta: number) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0);
      }
      if (delta > 0) return [...prev, { product, quantity: 1, spiciness: '不辣', note: '' }];
      return prev;
    });
  }, []);

  const updatePosCartItemOptions = useCallback((index: number, spiciness: '不辣' | '小辣' | '中辣' | '大辣', note: string) => {
    setPosCart(prev => prev.map((item, i) => i === index ? { ...item, spiciness, note } : item));
  }, []);

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch('/api/finance', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) setEntries(entries.filter(e => e.id !== id));
    } catch (error) { console.error('Delete entry error:', error); }
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.price) {
      const res = await fetch('/api/products', { method: 'POST', body: JSON.stringify({ ...newProduct, isAvailable: true }) });
      const saved = await res.json();
      setProducts([...products, saved]);
      setShowAddProductModal(false);
      setNewProduct({ name: '', price: 0, category: '炸物', isAvailable: true, cost: 0 });
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    const updatedProduct = { ...product, isAvailable: !product.isAvailable };
    const res = await fetch('/api/products', { method: 'PUT', body: JSON.stringify(updatedProduct) });
    if (res.ok) { const updated = await res.json(); setProducts(products.map(p => p.id === updated.id ? updated : p)); }
  };

  const handleUpdateProduct = async () => {
    if (editingProduct) {
      const res = await fetch('/api/products', { method: 'PUT', body: JSON.stringify(editingProduct) });
      const updated = await res.json();
      setProducts(products.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch('/api/products', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (res.ok) { setProducts(products.filter(p => p.id !== id)); setDeleteConfirmId(null); }
  };

  const handleAddSupplierProduct = async () => {
    if (!newSupplierProduct.name || !newSupplierProduct.supplier) return;
    const res = await fetch('/api/supplier-products', { method: 'POST', body: JSON.stringify(newSupplierProduct) });
    if (res.ok) {
      const saved = await res.json();
      setSupplierProducts(prev => [...prev, saved]);
      setShowAddSupplierProductModal(false);
      setNewSupplierProduct({ name: '', supplier: '', unit: 'kg', defaultPrice: 0, category: '食材' });
    }
  };

  const handleDeleteSupplierProduct = async (id: string) => {
    if (!confirm('確定要刪除這個商品嗎？')) return;
    const res = await fetch('/api/supplier-products', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (res.ok) setSupplierProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddPurchaseOrder = async () => {
    if (!newPurchaseOrder.supplier || newPurchaseOrder.items.length === 0) return;
    const total = newPurchaseOrder.items.reduce((s, i) => s + i.subtotal, 0);
    const res = await fetch('/api/purchase-orders', { method: 'POST', body: JSON.stringify({ ...newPurchaseOrder, total, date: new Date().toISOString().split('T')[0] }) });
    if (res.ok) {
      const saved = await res.json();
      setPurchaseOrders(prev => [saved, ...prev]);
      setShowAddPurchaseOrderModal(false);
      setNewPurchaseOrder({ supplier: '', items: [], note: '' });
    }
  };

  const handleCompletePurchaseOrder = async (order: PurchaseOrder) => {
    if (!confirm(`確定完成這筆進貨單？\n將自動新增支出 $${order.total}`)) return;
    const res = await fetch('/api/purchase-orders', { method: 'PUT', body: JSON.stringify({ ...order, status: 'completed' }) });
    if (res.ok) {
      const updated = await res.json();
      setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      const financeRes = await fetch('/api/finance');
      if (financeRes.ok) { const financeData = await financeRes.json(); if (Array.isArray(financeData)) setEntries(financeData); }
      alert('進貨完成！已自動新增支出紀錄。');
    }
  };

  const handleDeletePurchaseOrder = async (id: string) => {
    if (!confirm('確定要刪除這筆進貨單嗎？')) return;
    const res = await fetch('/api/purchase-orders', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (res.ok) setPurchaseOrders(prev => prev.filter(o => o.id !== id));
  };

  const addItemToPurchaseOrder = (product: SupplierProduct) => {
    const existing = newPurchaseOrder.items.find(i => i.supplierProduct.id === product.id);
    if (existing) return;
    setNewPurchaseOrder(prev => ({
      ...prev,
      supplier: prev.supplier || product.supplier,
      items: [...prev.items, { supplierProduct: product, quantity: 1, unitPrice: product.defaultPrice, subtotal: product.defaultPrice }],
    }));
  };

  const updatePurchaseOrderItem = (index: number, quantity: number, unitPrice: number) => {
    setNewPurchaseOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, quantity, unitPrice, subtotal: quantity * unitPrice } : item),
    }));
  };

  const removePurchaseOrderItem = (index: number) => {
    setNewPurchaseOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleViewPriceHistory = async (productId: string) => {
    const res = await fetch('/api/purchase-orders');
    if (res.ok) {
      const orders = await res.json();
      const histories: any[] = [];
      orders.forEach((o: PurchaseOrder) => {
        if (o.status === 'completed') {
          o.items.forEach(item => {
            if (item.supplierProduct.id === productId) histories.push({ date: o.date, unitPrice: item.unitPrice, orderId: o.id });
          });
        }
      });
      setPriceHistories(histories.sort((a, b) => b.date.localeCompare(a.date)));
      setShowPriceHistoryModal(true);
    }
  };
const handleExportReport = () => {
    const rows: string[][] = [];

    // 標題
    rows.push([`九丰炸物專門店 ${reportMonth} 月結報表`]);
    rows.push([]);

    // 月度總覽
    rows.push(['=== 月度總覽 ===']);
    rows.push(['項目', '本月', '上月', '差異']);
    rows.push(['總收入', `$${reportStats.totalIncome}`, `$${reportStats.prevIncome}`, `$${reportStats.totalIncome - reportStats.prevIncome}`]);
    rows.push(['總支出', `$${reportStats.totalExpense}`, `$${reportStats.prevExpense}`, `$${reportStats.totalExpense - reportStats.prevExpense}`]);
    rows.push(['淨利', `$${reportStats.netProfit}`, `$${reportStats.prevProfit}`, `$${reportStats.netProfit - reportStats.prevProfit}`]);
    rows.push([]);

    // 支出分類
    rows.push(['=== 支出分類 ===']);
    rows.push(['分類', '金額']);
    reportStats.expensePieData.forEach(item => {
      rows.push([item.name, `$${item.value}`]);
    });
    rows.push([]);

    // 菜品毛利分析
    rows.push(['=== 菜品毛利分析 ===']);
    rows.push(['品項', '售出數量', '營收', '成本', '毛利', '毛利率']);
    reportStats.costAnalysis.forEach(item => {
      rows.push([
        item.name,
        String(item.quantity),
        `$${item.revenue}`,
        item.cost > 0 ? `$${item.cost}` : '未設定',
        item.cost > 0 ? `$${item.profit}` : '-',
        item.cost > 0 ? `${item.margin}%` : '-',
      ]);
    });
    rows.push([]);

    // 每日收支
    rows.push(['=== 每日收支明細 ===']);
    rows.push(['日期', '收入', '支出', '淨利']);
    reportStats.dailyChartData.forEach(day => {
      rows.push([day.date, `$${day.income}`, `$${day.expense}`, `$${day.income - day.expense}`]);
    });

    // 轉成 CSV
    const csvContent = '\uFEFF' + rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `九丰_${reportMonth}_月結報表.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleLogin = () => {
    if (password === '8888') { setUserRole('boss'); setIsAuthenticated(true); }
    else if (password === '0000') { setUserRole('staff'); setIsAuthenticated(true); }
    else alert('密碼錯誤！');
  };

  const handleLogout = () => { setIsAuthenticated(false); setUserRole(null); setPassword(''); };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
          <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500"><Lock size={32} /></div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">九丰管理中心</h2>
          <p className="text-gray-400 text-sm mb-8">請輸入管理密碼以繼續</p>
          <input type="password" placeholder="請輸入密碼" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl mb-4 text-center text-lg font-bold tracking-widest focus:ring-2 focus:ring-red-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-100 hover:bg-red-600 transition-all">登入系統</button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-white rounded-full text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-lg font-black text-gray-800 leading-none">九丰管理中心</h1>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${userRole === 'boss' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
              {userRole === 'boss' ? '老闆模式' : '員工模式'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-500 rounded-full font-bold text-xs shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-red-500 transition-all"><UserCircle size={18} />切換</button>
          {!isSoundEnabled ? (
            <button onClick={unlockAndTestAudio} disabled={isAudioLoading} className={`flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full font-bold shadow-lg ${isAudioLoading ? 'opacity-50' : 'animate-bounce'}`}>
              <Volume2 size={18} />{isAudioLoading ? '載入中...' : '啟動音效'}
            </button>
          ) : (
            <>
              <button onClick={playNotificationSound} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200" title="測試音效"><BellRing size={20} /></button>
              <button onClick={() => { setIsSoundEnabled(false); isSoundEnabledRef.current = false; }} className="p-2 rounded-full shadow-sm bg-green-500 text-white transition-all" title="音效已開啟"><Volume2 size={20} /></button>
            </>
          )}
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex bg-white p-1 rounded-xl mb-6 shadow-sm border border-gray-100 overflow-x-auto gap-1">
        <button onClick={() => setActiveTab('pos')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'pos' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><ShoppingBag size={14} />點餐</button>
        <button onClick={() => setActiveTab('orders')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><ClipboardList size={14} />接單({orders.length})</button>
        <button onClick={() => setActiveTab('finance')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'finance' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><DollarSign size={14} />財務</button>
        <button onClick={() => setActiveTab('menu')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'menu' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><Settings size={14} />{userRole === 'boss' ? '菜單' : '庫存'}</button>
        {userRole === 'boss' && (
          <>
            <button onClick={() => setActiveTab('purchase')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'purchase' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><Package size={14} />進貨</button>
            <button onClick={() => setActiveTab('report')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'report' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}><FileText size={14} />報表</button>
          </>
        )}
      </div>

      {activeTab === 'pos' ? (
        <div className="space-y-6 pb-32">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const count = posCart.find(i => i.product.id === product.id)?.quantity || 0;
              const isAvailable = product.isAvailable !== false;
              return (
                <button key={product.id} onClick={() => isAvailable && updatePosCart(product, 1)} disabled={!isAvailable}
                  className={`p-4 rounded-2xl border text-left transition-all active:scale-95 ${count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} ${!isAvailable ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-gray-800 leading-tight">{product.name}</span>
                    {count > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-in zoom-in">{count}</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-red-500 font-bold">${product.price}</span>
                    {!isAvailable && <span className="text-[8px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">售完</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {posCart.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
              <button onClick={() => setShowPosCart(true)} className="w-full bg-gray-900 text-white py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 hover:bg-black transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag size={24} />
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">{posCart.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  <span className="font-bold">結帳清單</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-red-400">${posCart.reduce((s, i) => s + i.product.price * i.quantity, 0)}</span>
                  <CheckCircle size={20} className="text-gray-400" />
                </div>
              </button>
            </div>
          )}
          {showPosCart && (
            <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-in fade-in duration-300">
              <div className="absolute inset-0" onClick={() => setShowPosCart(false)} />
              <div className="bg-white rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto z-10 shadow-2xl">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" onClick={() => setShowPosCart(false)} />
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><ShoppingBag size={24} className="text-red-500" />現場結帳</h3>
                  <button onClick={() => setShowPosCart(false)} className="text-gray-400 font-medium text-sm">關閉</button>
                </div>
                <div className="space-y-6 mb-8">
                  {posCart.map((item, index) => (
                    <div key={item.product.id + index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-lg">{item.product.name}</p>
                          <p className="text-sm text-gray-400 font-bold">${item.product.price} / 單位</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-100">
                            <button onClick={(e) => { e.stopPropagation(); updatePosCart(item.product, -1); }} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><Minus size={18}/></button>
                            <span className="font-black text-gray-800 w-6 text-center">{item.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); updatePosCart(item.product, 1); }} className="p-1.5 hover:bg-gray-50 rounded-lg text-red-500"><Plus size={18}/></button>
                          </div>
                          <span className="font-black text-gray-800 w-20 text-right">${item.product.price * item.quantity}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                        {(['不辣', '小辣', '中辣', '大辣'] as const).map((level) => (
                          <button key={level} onClick={() => updatePosCartItemOptions(index, level, item.note || '')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${item.spiciness === level ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>
                            {level}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-gray-100">
                        <Settings size={16} className="text-gray-400" />
                        <input type="text" placeholder="品項備註 (如：不加胡椒)" className="bg-transparent w-full outline-none text-sm font-medium" value={item.note || ''} onChange={(e) => updatePosCartItemOptions(index, (item.spiciness as any) || '不辣', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-red-50 rounded-2xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-gray-600">應收金額</span>
                    <span className="text-3xl font-black text-red-500">${posCart.reduce((s, i) => s + i.product.price * i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 border-t border-red-100 pt-3">
                    <span className="font-bold text-gray-600">實收金額</span>
                    <span className="text-2xl font-black text-blue-500">${receivedAmount || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-red-100 pt-3">
                    <span className="font-bold text-gray-600">找零</span>
                    <span className={`text-2xl font-black ${(receivedAmount ? parseInt(receivedAmount) : 0) - posCart.reduce((s, i) => s + i.product.price * i.quantity, 0) >= 0 ? 'text-green-500' : 'text-gray-400'}`}>
                      ${Math.max(0, (receivedAmount ? parseInt(receivedAmount) : 0) - posCart.reduce((s, i) => s + i.product.price * i.quantity, 0))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === 'C') setReceivedAmount('');
                        else if (key === '←') setReceivedAmount(prev => prev.slice(0, -1));
                        else setReceivedAmount(prev => prev === '0' ? String(key) : prev + String(key));
                      }}
                      className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 py-3 rounded-xl text-xl font-black text-gray-800 transition-colors shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const total = posCart.reduce((s, i) => s + i.product.price * i.quantity, 0);
                      setReceivedAmount(String(total));
                    }}
                    className="col-span-3 bg-blue-50 hover:bg-blue-100 text-blue-600 py-3 rounded-xl font-bold border border-blue-200 shadow-sm transition-colors"
                  >
                    剛好 (實收 = 應收)
                  </button>
                </div>

                <button onClick={handlePosCheckout} className="w-full bg-green-500 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-600 active:scale-95 transition-all mb-4">
                  <DollarSign size={24} />確認收款並結帳
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'orders' ? (
        <div className="space-y-4 pb-20">
          <h2 className="font-bold text-gray-800 px-1">待處理訂單</h2>
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200"><ClipboardList className="mx-auto text-gray-300 mb-2" size={48} /><p className="text-gray-400">目前沒有新訂單</p></div>
          ) : (
            orders.map((order) => (
              <div key={order.id || Math.random().toString()} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded"># {(order.id || '').slice(-4)}</span>
                    <p className="text-xs text-gray-400 mt-1">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : '時間不詳'}</p>
                    {order.customerName && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-1"><User size={14} className="text-gray-400" />{order.customerName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12} className="text-gray-400" />{order.customerPhone}</p>
                        <p className="text-xs font-black text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md inline-block mt-1"><Clock size={12} />預計取餐：{order.pickupTime}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-black text-gray-800">${order.total || 0}</span>
                </div>
                <div className="space-y-3 mb-4">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-gray-800">{item.product?.name || '未知品項'} x {item.quantity}</span>
                        <span className="font-bold text-gray-600">${(item.product?.price || 0) * item.quantity}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.spiciness && <span className={`text-[10px] font-black px-2 py-0.5 rounded ${item.spiciness === '不辣' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'}`}>{item.spiciness}</span>}
                        {item.note && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">備註：{item.note}</span>}
                      </div>
                    </div>
                  ))}
                  {order.orderNote && (
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                      <p className="text-xs font-bold text-yellow-700 mb-1 flex items-center gap-1"><Settings size={12} /> 全單備註</p>
                      <p className="text-sm text-yellow-800">{order.orderNote}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => completeOrder(order)} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600"><CheckCircle size={18} />出餐並結帳</button>
                  {userRole === 'boss' && <button onClick={() => deleteOrder(order.id)} className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:text-red-500 transition-colors"><Trash2 size={20} /></button>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'menu' ? (
        <div className="space-y-6 pb-20">
          <div className="flex flex-col gap-4 px-1">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-lg">{userRole === 'boss' ? '菜單品項管理' : '品項庫存管理'}</h2>
              {userRole === 'boss' && <button onClick={() => setShowAddProductModal(true)} className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-red-100 font-bold text-sm"><Plus size={18} />新增品項</button>}
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="搜尋品項名稱..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none shadow-sm" value={menuSearchTerm} onChange={(e) => setMenuSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {['全部', '炸物', '優惠組合', '飲料', '其他'].map((cat) => (
                  <button key={cat} onClick={() => setMenuActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${menuActiveCategory === cat ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}>{cat}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {filteredMenuProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100"><Search className="mx-auto text-gray-200 mb-2" size={48} /><p className="text-gray-400 text-sm">找不到符合的品項</p></div>
            ) : (
              filteredMenuProducts.map((product) => (
                <div key={product.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${product.isAvailable === false ? 'opacity-60 grayscale-[0.5]' : 'border-gray-100'}`}>
                  {editingProduct?.id === product.id ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1"><Edit2 size={12} /> 編輯中</span>
                        <button onClick={() => setEditingProduct(null)} className="text-gray-400 p-1"><X size={20} /></button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">品項名稱</label>
                          <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">售價</label>
                            <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-red-500 focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">成本</label>
                            <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-orange-500 focus:ring-2 focus:ring-blue-500 outline-none" value={editingProduct.cost || 0} onChange={(e) => setEditingProduct({ ...editingProduct, cost: Number(e.target.value) })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">類別</label>
                            <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={editingProduct.category} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}>
                              <option value="炸物">炸物</option><option value="優惠組合">優惠組合</option><option value="飲料">飲料</option><option value="其他">其他</option>
                            </select>
                          </div>
                        </div>
                        {editingProduct.price > 0 && editingProduct.cost !== undefined && editingProduct.cost > 0 && (
                          <div className="bg-green-50 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-bold text-green-600">預估毛利率</span>
                            <span className="text-lg font-black text-green-600">{Math.round(((editingProduct.price - editingProduct.cost) / editingProduct.price) * 100)}%</span>
                          </div>
                        )}
                      </div>
                      <button onClick={handleUpdateProduct} className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-600"><Save size={18} /> 儲存變更</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{product.category}</span>
                          {product.isAvailable === false && <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">已售完</span>}
                          {product.cost && product.cost > 0 && (
                            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              毛利 {Math.round(((product.price - product.cost) / product.price) * 100)}%
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-800 text-lg">{product.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black text-red-500">${product.price}</p>
                          {product.cost && product.cost > 0 && <p className="text-xs text-gray-400">成本 ${product.cost}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleProductAvailability(product)} className={`p-2 rounded-xl transition-all ${product.isAvailable === false ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'}`} title={product.isAvailable === false ? '設為供貨中' : '設為已售完'}><CheckCircle size={20} /></button>
                        {userRole === 'boss' && (
                          <>
                            <button onClick={() => setEditingProduct(product)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-xl transition-colors"><Edit2 size={20} /></button>
                            <button onClick={() => setDeleteConfirmId(product.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-colors"><Trash2 size={20} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {deleteConfirmId && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center shadow-2xl animate-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black text-gray-800 mb-2">確定要刪除嗎？</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">刪除品項「<span className="font-bold text-gray-700">{products.find(p => p.id === deleteConfirmId)?.name}</span>」後將無法復原。</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all">取消</button>
                  <button onClick={() => handleDeleteProduct(deleteConfirmId)} className="py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all">確定刪除</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'purchase' ? (
        <div className="space-y-6 pb-20">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => setActiveSupplierTab('orders')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeSupplierTab === 'orders' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500'}`}>進貨單</button>
            <button onClick={() => setActiveSupplierTab('products')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeSupplierTab === 'products' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500'}`}>供應商商品</button>
          </div>
          {activeSupplierTab === 'products' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="font-bold text-gray-800">供應商商品</h2>
                <button onClick={() => setShowAddSupplierProductModal(true)} className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-100"><Plus size={16} />新增商品</button>
              </div>
              {supplierProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200"><Package className="mx-auto text-gray-300 mb-2" size={48} /><p className="text-gray-400 text-sm">尚無供應商商品</p></div>
              ) : (
                supplierProducts.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{product.category}</span>
                          <span className="text-[10px] font-bold text-gray-400">{product.unit}</span>
                        </div>
                        <h4 className="font-bold text-gray-800">{product.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">供應商：{product.supplier}</p>
                        <p className="text-sm font-black text-red-500 mt-1">預設單價：${product.defaultPrice}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleViewPriceHistory(product.id)} className="p-2 bg-blue-50 text-blue-500 rounded-xl"><History size={16} /></button>
                        <button onClick={() => handleDeleteSupplierProduct(product.id)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="font-bold text-gray-800">進貨單</h2>
                <button onClick={() => setShowAddPurchaseOrderModal(true)} className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-100"><Plus size={16} />建立進貨單</button>
              </div>
              {purchaseOrders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200"><ClipboardList className="mx-auto text-gray-300 mb-2" size={48} /><p className="text-gray-400 text-sm">尚無進貨單</p></div>
              ) : (
                purchaseOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>{order.status === 'completed' ? '已完成' : '草稿'}</span>
                          <span className="text-[10px] text-gray-400">{order.date}</span>
                        </div>
                        <h4 className="font-bold text-gray-800">{order.supplier}</h4>
                        {order.note && <p className="text-xs text-gray-500 mt-0.5">{order.note}</p>}
                      </div>
                      <span className="text-lg font-black text-red-500">${order.total}</span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded-xl">
                          <span className="font-bold text-gray-700">{item.supplierProduct.name} x{item.quantity} {item.supplierProduct.unit}</span>
                          <span className="font-bold text-gray-600">${item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'draft' && (
                        <button onClick={() => handleCompletePurchaseOrder(order)} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600"><CheckCircle size={16} />確認完成進貨</button>
                      )}
                      <button onClick={() => handleDeletePurchaseOrder(order.id)} className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'report' ? (
        <div className="space-y-6 pb-20">
          {/* 月份選擇 */}
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <FileText size={20} className="text-red-500" />
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 block mb-1">選擇月份</label>
              <input type="month" className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            </div>
          </div>

         {/* 匯出按鈕 */}
          <button onClick={handleExportReport} className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-black transition-all">
            <FileText size={18} />
            匯出 {reportMonth} 月報表 (CSV)
          </button>

          {/* 月度總覽 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
              <p className="text-[10px] font-bold text-green-400 mb-1">總收入</p>
              <p className="text-lg font-black text-green-600">${reportStats.totalIncome}</p>
              <p className={`text-[10px] font-bold mt-1 ${reportStats.incomeGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {reportStats.incomeGrowth >= 0 ? '↑' : '↓'} {Math.abs(reportStats.incomeGrowth)}%
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
              <p className="text-[10px] font-bold text-red-400 mb-1">總支出</p>
              <p className="text-lg font-black text-red-600">${reportStats.totalExpense}</p>
              <p className={`text-[10px] font-bold mt-1 ${reportStats.expenseGrowth <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {reportStats.expenseGrowth >= 0 ? '↑' : '↓'} {Math.abs(reportStats.expenseGrowth)}%
              </p>
            </div>
            <div className={`p-4 rounded-2xl border text-center ${reportStats.netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className={`text-[10px] font-bold mb-1 ${reportStats.netProfit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>淨利</p>
              <p className={`text-lg font-black ${reportStats.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>${reportStats.netProfit}</p>
              <p className={`text-[10px] font-bold mt-1 ${reportStats.profitGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {reportStats.profitGrowth >= 0 ? '↑' : '↓'} {Math.abs(reportStats.profitGrowth)}%
              </p>
            </div>
          </div>

          {/* 每日趨勢圖 */}
          {reportStats.dailyChartData.length > 0 && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-red-500" />每日收支趨勢</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportStats.dailyChartData}>
                    <defs>
                      <linearGradient id="reportIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                      <linearGradient id="reportExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9ca3af'}} tickFormatter={(val) => val.split('-')[2]} />
                    <YAxis hide />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#reportIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#reportExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-gray-400">收入</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-gray-400">支出</span></div>
              </div>
            </div>
          )}

          {/* 支出分類圓餅圖 */}
          {reportStats.expensePieData.length > 0 && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingDown size={18} className="text-red-500" />支出分類分析</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportStats.expensePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {reportStats.expensePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#8b5cf6', '#6b7280'][index % 4]} />))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                {reportStats.expensePieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#8b5cf6', '#6b7280'][index % 4] }} />
                    <span className="text-[10px] font-bold text-gray-600">{item.name}</span>
                    <span className="text-[10px] font-black text-gray-400">${item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 成本分析 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-500" />菜品毛利分析</h3>
            {reportStats.costAnalysis.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">本月無銷售數據</p>
                <p className="text-xs text-gray-300 mt-1">請先在菜單管理中設定各品項的成本</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportStats.costAnalysis.map((item, index) => (
                  <div key={item.name} className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400">售出 {item.quantity} 份 · 營收 ${item.revenue}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black px-2 py-1 rounded-lg ${item.margin >= 60 ? 'bg-green-100 text-green-600' : item.margin >= 40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                          {item.cost > 0 ? `毛利 ${item.margin}%` : '未設成本'}
                        </span>
                      </div>
                    </div>
                    {item.cost > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className={`h-2 rounded-full ${item.margin >= 60 ? 'bg-green-500' : item.margin >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(item.margin, 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 上月比較 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">與上月比較</h3>
            <div className="space-y-3">
              {[
                { label: '收入', current: reportStats.totalIncome, prev: reportStats.prevIncome, color: 'green' },
                { label: '支出', current: reportStats.totalExpense, prev: reportStats.prevExpense, color: 'red' },
                { label: '淨利', current: reportStats.netProfit, prev: reportStats.prevProfit, color: 'blue' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-600">{item.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">上月 ${item.prev}</span>
                    <span className="text-sm font-black text-gray-800">本月 ${item.current}</span>
                    <span className={`text-xs font-black ${item.current >= item.prev ? 'text-green-500' : 'text-red-500'}`}>
                      {item.current >= item.prev ? '↑' : '↓'} ${Math.abs(item.current - item.prev)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {userRole === 'boss' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                <div className="flex items-center gap-2 text-green-600 mb-1"><TrendingUp size={16} /><span className="text-xs font-medium">總收入</span></div>
                <p className="text-2xl font-bold text-green-700">${income}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2 text-red-600 mb-1"><TrendingDown size={16} /><span className="text-xs font-medium">總支出</span></div>
                <p className="text-2xl font-bold text-red-700">${expense}</p>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-gray-800">{userRole === 'boss' ? '收支明細' : '今日收支'}</h2>
            <div className="flex gap-2">
              <button onClick={handleDailyClose} className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg shadow-lg transition-all ${dailyCloses.find(c => c.date === new Date().toISOString().split('T')[0]) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'}`} disabled={!!dailyCloses.find(c => c.date === new Date().toISOString().split('T')[0])}>
                <CheckCircle size={16} />{dailyCloses.find(c => c.date === new Date().toISOString().split('T')[0]) ? '今日已關帳' : '每日關帳'}
              </button>
              {userRole === 'boss' && (
                <>
                  <button onClick={() => setShowSummaryModal(true)} className="flex items-center gap-1 text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-lg"><ClipboardList size={16} />結報</button>
                  <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-red-100"><Plus size={16} />新增</button>
                  
                </>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">暫無收支紀錄</div>
            ) : (
              entries
                .filter(e => e.type === 'income' && e.date === new Date().toISOString().split('T')[0])
                .map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setDetailEntry(entry)}
                    className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{entry.description}</h4>
                        <p className="text-[10px] text-gray-400">
                          {entry.date} {((entry as any).time || '') && <span>· {(entry as any).time}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-sm text-green-600">+${entry.amount}</span>
                      {userRole === 'boss' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </button>
                ))
            )}
          </div>
          
          {detailEntry && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    <FileText size={20} className="text-red-500" /> 結帳明細
                  </h2>
                  <button onClick={() => setDetailEntry(null)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Clock size={14} />日期時間</span>
                    <span className="text-sm font-bold text-gray-800">
                      {detailEntry.date} {(detailEntry as any).time ? ` ${ (detailEntry as any).time }` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-100">
                    <span className="text-xs text-green-600 font-medium">應收</span>
                    <span className="text-lg font-black text-green-600">${detailEntry.amount}</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-600 font-medium">實收</span>
                    <span className="text-lg font-black text-blue-600">
                      ${(detailEntry as any).receivedAmount ?? detailEntry.amount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <span className="text-xs text-emerald-600 font-medium">找零</span>
                    <span className="text-lg font-black text-emerald-600">
                      ${(detailEntry as any).changeDue ?? 0}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">品項明細</p>
                    {detailEntry.items && detailEntry.items.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {detailEntry.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Package size={14} className="text-gray-400" />
                              <span className="font-medium">{it.product.name}</span>
                              <span className="text-xs text-gray-400">x {it.quantity}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-800">${it.product.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-400 bg-gray-50 p-4 rounded-xl">無品項資料</div>
                    )}
                  </div>
                </div>
                <button onClick={() => setDetailEntry(null)} className="w-full mt-4 bg-gray-900 text-white py-3 rounded-2xl font-bold">
                  關閉
                </button>
              </div>
            </div>
          )}
          {userRole === 'boss' && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={18} className="text-red-500" />收支趨勢</h2>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setChartType('line')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartType === 'line' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>曲線</button>
                    <button onClick={() => setChartType('bar')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>直條</button>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as const).map((view) => (
                      <button key={view} onClick={() => setChartView(view)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartView === view ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>{view === 'day' ? '日' : view === 'week' ? '周' : '月'}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="income" radius={[4, 4, 0, 0]} fill="#22c55e" barSize={20} />
                      <Bar dataKey="expense" radius={[4, 4, 0, 0]} fill="#ef4444" barSize={20} />
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis hide />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-gray-400 font-medium">收入</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-gray-400 font-medium">支出</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 新增供應商商品 Modal */}
      {showAddSupplierProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">新增供應商商品</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-400 mb-1">商品名稱</label><input type="text" placeholder="例如：雞肉、炸油" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newSupplierProduct.name} onChange={(e) => setNewSupplierProduct({ ...newSupplierProduct, name: e.target.value })} /></div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">供應商</label><input type="text" placeholder="例如：台灣肉品行" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newSupplierProduct.supplier} onChange={(e) => setNewSupplierProduct({ ...newSupplierProduct, supplier: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-gray-400 mb-1">單位</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newSupplierProduct.unit} onChange={(e) => setNewSupplierProduct({ ...newSupplierProduct, unit: e.target.value as any })}>
                    <option value="kg">kg</option><option value="桶">桶</option><option value="包">包</option><option value="個">個</option><option value="箱">箱</option><option value="其他">其他</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">預設單價</label><input type="number" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newSupplierProduct.defaultPrice} onChange={(e) => setNewSupplierProduct({ ...newSupplierProduct, defaultPrice: Number(e.target.value) })} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">分類</label>
                <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newSupplierProduct.category} onChange={(e) => setNewSupplierProduct({ ...newSupplierProduct, category: e.target.value as any })}>
                  <option value="食材">食材</option><option value="包材">包材</option><option value="其他">其他</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddSupplierProductModal(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">取消</button>
              <button onClick={handleAddSupplierProduct} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-100">確認新增</button>
            </div>
          </div>
        </div>
      )}

      {/* 建立進貨單 Modal */}
      {showAddPurchaseOrderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">建立進貨單</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-400 mb-1">供應商</label><input type="text" placeholder="供應商名稱" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newPurchaseOrder.supplier} onChange={(e) => setNewPurchaseOrder({ ...newPurchaseOrder, supplier: e.target.value })} /></div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">選擇商品</label>
                {supplierProducts.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl">請先在「供應商商品」新增商品</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {supplierProducts.map(p => (
                      <button key={p.id} onClick={() => addItemToPurchaseOrder(p)} className={`p-2 rounded-xl text-xs font-bold border text-left transition-all ${newPurchaseOrder.items.find(i => i.supplierProduct.id === p.id) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        {p.name}<br/><span className="font-normal text-gray-400">${p.defaultPrice}/{p.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {newPurchaseOrder.items.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-400">商品明細</label>
                  {newPurchaseOrder.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-700">{item.supplierProduct.name}</span>
                        <button onClick={() => removePurchaseOrderItem(index)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-gray-400">數量({item.supplierProduct.unit})</label><input type="number" className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold" value={item.quantity} onChange={(e) => updatePurchaseOrderItem(index, Number(e.target.value), item.unitPrice)} /></div>
                        <div><label className="text-[10px] text-gray-400">單價</label><input type="number" className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold" value={item.unitPrice} onChange={(e) => updatePurchaseOrderItem(index, item.quantity, Number(e.target.value))} /></div>
                      </div>
                      <p className="text-xs font-black text-red-500 mt-1 text-right">小計：${item.subtotal}</p>
                    </div>
                  ))}
                  <div className="bg-red-50 p-3 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-gray-600">總金額</span>
                    <span className="text-xl font-black text-red-500">${newPurchaseOrder.items.reduce((s, i) => s + i.subtotal, 0)}</span>
                  </div>
                </div>
              )}
              <div><label className="block text-xs font-medium text-gray-400 mb-1">備註</label><input type="text" placeholder="選填" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newPurchaseOrder.note} onChange={(e) => setNewPurchaseOrder({ ...newPurchaseOrder, note: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddPurchaseOrderModal(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">取消</button>
              <button onClick={handleAddPurchaseOrder} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-100">建立進貨單</button>
            </div>
          </div>
        </div>
      )}

      {/* 價格歷史 Modal */}
      {showPriceHistoryModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><History size={20} className="text-blue-500" />價格歷史</h2>
              <button onClick={() => setShowPriceHistoryModal(false)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            {priceHistories.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">尚無價格歷史</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {priceHistories.map((h, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">{h.date}</span>
                    <span className="font-black text-gray-800">${h.unitPrice}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowPriceHistoryModal(false)} className="w-full mt-4 bg-gray-900 text-white py-3 rounded-2xl font-bold">關閉</button>
          </div>
        </div>
      )}

      {/* 新增菜單品項 Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">新增品項</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-400 mb-1">品名</label><input type="text" placeholder="例如：雞排、可樂" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-xs font-medium text-gray-400 mb-1">售價</label><input type="number" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })} /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">成本</label><input type="number" placeholder="0" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newProduct.cost || 0} onChange={(e) => setNewProduct({ ...newProduct, cost: Number(e.target.value) })} /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">類別</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}>
                    <option value="炸物">炸物</option><option value="優惠組合">優惠組合</option><option value="飲料">飲料</option><option value="其他">其他</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddProductModal(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">取消</button>
              <button onClick={handleAddProduct} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-100">確認新增</button>
            </div>
          </div>
        </div>
      )}

      {/* 新增收支紀錄 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">新增紀錄</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setNewEntry({ ...newEntry, type: 'income' })} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${newEntry.type === 'income' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200'}`}>收入</button>
                <button onClick={() => setNewEntry({ ...newEntry, type: 'expense' })} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${newEntry.type === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'}`}>支出</button>
              </div>
              {newEntry.type === 'expense' && (
                <div><label className="block text-xs font-medium text-gray-400 mb-1">支出分類</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newEntry.category} onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value as any })}>
                    <option value="食材">食材</option><option value="人事">人事</option><option value="固定成本">固定成本</option><option value="其他">其他</option>
                  </select>
                </div>
              )}
              <div><label className="block text-xs font-medium text-gray-400 mb-1">說明</label><input type="text" placeholder="例如：採買食材、午餐營收" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} /></div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">金額</label><input type="number" placeholder="請輸入金額" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: Number(e.target.value) })} /></div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">日期</label><input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">取消</button>
              <button onClick={handleAddEntry} className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-100">確認新增</button>
            </div>
          </div>
        </div>
      )}

      {/* 營收報表 Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md max-h-[85vh] overflow-y-auto p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><BarChart3 size={28} className="text-red-500" />營業數據報表</h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">報表區段</h3>
                  <button onClick={() => setUseCustomDateRange(!useCustomDateRange)} className={`text-[10px] font-black px-2 py-1 rounded-md transition-all ${useCustomDateRange ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{useCustomDateRange ? '自定義區段' : '預設 (全期)'}</button>
                </div>
                {useCustomDateRange && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-[10px] font-bold text-gray-400 mb-1">開始日期</label><input type="date" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-500" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 mb-1">結束日期</label><input type="date" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-500" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} /></div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center"><p className="text-[10px] font-bold text-red-400 mb-1">{useCustomDateRange ? '區段營收' : '今日營收'}</p><p className="text-lg font-black text-red-600">${useCustomDateRange ? stats.reportRevenue : stats.dailyRevenue}</p></div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center"><p className="text-[10px] font-bold text-orange-400 mb-1">{useCustomDateRange ? '區段支出' : '本週營收'}</p><p className="text-lg font-black text-orange-600">${useCustomDateRange ? stats.reportExpense : stats.weeklyRevenue}</p></div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center"><p className="text-[10px] font-bold text-blue-400 mb-1">{useCustomDateRange ? '區段盈餘' : '本月營收'}</p><p className="text-lg font-black text-blue-600">${useCustomDateRange ? (stats.reportRevenue - stats.reportExpense) : stats.monthlyRevenue}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><div className="flex items-center gap-2 text-gray-500 mb-2"><User size={16} /><span className="text-xs font-bold">{useCustomDateRange ? '區段客單價' : '今日客單價'}</span></div><p className="text-2xl font-black text-gray-800">${useCustomDateRange ? stats.aov : stats.dailyAov}</p><p className="text-[10px] text-gray-400 mt-1">{useCustomDateRange ? '區段' : '今日'}共 {useCustomDateRange ? stats.reportOrderCount : stats.dailyOrderCount} 筆訂單</p></div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><div className="flex items-center gap-2 text-gray-500 mb-2"><ShoppingBag size={16} /><span className="text-xs font-bold">{useCustomDateRange ? '區段訂單' : '全月累計訂單'}</span></div><p className="text-2xl font-black text-gray-800">{useCustomDateRange ? stats.reportOrderCount : stats.orderCount}</p><p className="text-[10px] text-gray-400 mt-1">平均客單價 ${stats.aov}</p></div>
              </div>
              {stats.expensePieData.length > 0 && (
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 px-1"><TrendingDown size={18} className="text-red-500" />支出結構分析</h3>
                  <div className="flex flex-col items-center">
                    <div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.expensePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">{stats.expensePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#8b5cf6', '#6b7280'][index % 4]} />))}</Pie><Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} /></PieChart></ResponsiveContainer></div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">{stats.expensePieData.map((item, index) => (<div key={item.name} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#8b5cf6', '#6b7280'][index % 4] }} /><span className="text-[10px] font-bold text-gray-600">{item.name}</span><span className="text-[10px] font-black text-gray-400">${item.value}</span></div>))}</div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 px-1"><TrendingUp size={18} className="text-green-500" />本月銷售排行 (依營收)</h3>
                <div className="space-y-2">
                  {stats.ranking.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><p className="text-sm text-gray-400">尚無銷售數據</p></div>
                  ) : (
                    stats.ranking.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>{index + 1}</div>
                          <div><p className="font-bold text-gray-800">{item.name}</p><p className="text-[10px] text-gray-400">售出 {item.quantity} 份</p></div>
                        </div>
                        <div className="text-right"><p className="font-black text-red-500">${item.revenue}</p><p className="text-[10px] text-gray-400">營收佔比 {Math.round((item.revenue / (stats.monthlyRevenue || 1)) * 100)}%</p></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-black transition-all">完成檢閱</button>
            </div>
          </div>
        </div>
      )}
   {/* 新訂單懸浮通知 */}
      {showNewOrderAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[280px]">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-bounce flex-shrink-0">
              <BellRing size={20} />
            </div>
            <div className="flex-1">
              <p className="font-black text-base">新訂單來了！🍗</p>
              <p className="text-gray-400 text-xs mt-0.5">目前共 {newOrderCount} 筆待處理訂單</p>
            </div>
            <button onClick={() => { setShowNewOrderAlert(false); setActiveTab('orders'); }} className="bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap">
              查看
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
