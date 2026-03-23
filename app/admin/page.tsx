'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowLeft, Plus, Trash2, ClipboardList, CheckCircle, Lock, ShoppingBag, Minus, BarChart3, User, Phone, Clock, Volume2, VolumeX, BellRing, Settings, Edit2, Save, X, Search, Filter, AlertTriangle, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { FinanceEntry, Order, PRODUCTS, Product, DailyClose } from '@/lib/data';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'boss' | 'staff' | null>(null);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'pos' | 'orders' | 'finance' | 'menu'>('pos');
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
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '炸物', isAvailable: true });
  const [posCart, setPosCart] = useState<{
    product: Product, 
    quantity: number, 
    spiciness?: '不辣' | '小辣' | '中辣' | '大辣',
    note?: string
  }[]>([]);
  const [showPosCart, setShowPosCart] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuActiveCategory, setMenuActiveCategory] = useState('全部');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const previousOrderCount = useRef(0);
const isInitialLoad = useRef(true);
  const audioObjRef = useRef<HTMLAudioElement | null>(null);
  const isSoundEnabledRef = useRef(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  const CRAYON_STYLE_URL = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';

  const unlockAndTestAudio = () => {
    setIsAudioLoading(true);
    
    try {
      if (!audioObjRef.current) {
        audioObjRef.current = new Audio(CRAYON_STYLE_URL);
      }
      
      const audio = audioObjRef.current;
      audio.volume = 0.8;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsSoundEnabled(true);
          isSoundEnabledRef.current = true;
          setIsAudioLoading(false);
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
          }, 2000);
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
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 2000);
      }).catch(e => console.warn('Auto-play blocked:', e));
    }
  };
  
  const [newEntry, setNewEntry] = useState<Partial<FinanceEntry>>({
    type: 'income',
    category: '食材',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

useEffect(() => {
    const fetchData = async () => {
      try {
        const orderRes = await fetch('/api/orders');
        if (!orderRes.ok) throw new Error('Failed to fetch orders');
        const orderData = await orderRes.json();
        
       if (Array.isArray(orderData)) {
  if (orderData.length > previousOrderCount.current && !isInitialLoad.current) {
            // 直接操作 ref，不透過 function
            if (isSoundEnabledRef.current && audioObjRef.current) {
              const audio = audioObjRef.current;
              audio.currentTime = 0;
              audio.play().then(() => {
                setTimeout(() => {
                  audio.pause();
                  audio.currentTime = 0;
                }, 2000);
              }).catch(e => console.warn('Auto-play blocked:', e));
            }
          }
         previousOrderCount.current = orderData.length;
          isInitialLoad.current = false;
          setOrders(orderData);
        }

        const productRes = await fetch('/api/products');
        const productData = await productRes.json();
        setProducts(productData);

        const financeRes = await fetch('/api/finance');
        if (!financeRes.ok) throw new Error('Failed to fetch finance');
        const financeData = await financeRes.json();
        
        if (Array.isArray(financeData)) {
          setEntries(financeData);
        }

        const closeRes = await fetch('/api/daily-close');
        if (closeRes.ok) {
          const closeData = await closeRes.json();
          setDailyCloses(closeData);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const profit = income - expense;

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
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const currentMonth = today.slice(0, 7);

    const incomeEntries = entries.filter(e => e.type === 'income');
    const allExpenseEntries = entries.filter(e => e.type === 'expense');
    
    const filteredIncome = useCustomDateRange 
      ? incomeEntries.filter(e => e.date >= reportStartDate && e.date <= reportEndDate)
      : incomeEntries;
    
    const filteredExpense = useCustomDateRange
      ? allExpenseEntries.filter(e => e.date >= reportStartDate && e.date <= reportEndDate)
      : allExpenseEntries;

    const dailyRevenue = incomeEntries.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    const dailyOrderCount = incomeEntries.filter(e => e.date === today).length;
    const weeklyRevenue = incomeEntries.filter(e => last7Days.includes(e.date)).reduce((s, e) => s + e.amount, 0);
    const monthlyRevenue = incomeEntries.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);

    const reportRevenue = filteredIncome.reduce((s, e) => s + e.amount, 0);
    const reportExpense = filteredExpense.reduce((s, e) => s + e.amount, 0);
    const reportOrderCount = filteredIncome.length;

    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    filteredIncome.forEach(e => {
      if (e.items) {
        e.items.forEach(item => {
          if (!productSales[item.product.id]) {
            productSales[item.product.id] = { name: item.product.name, quantity: 0, revenue: 0 };
          }
          productSales[item.product.id].quantity += item.quantity;
          productSales[item.product.id].revenue += item.product.price * item.quantity;
        });
      }
    });

    const ranking = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

    const aov = reportOrderCount > 0 ? Math.round(reportRevenue / reportOrderCount) : 0;
    const dailyAov = dailyOrderCount > 0 ? Math.round(dailyRevenue / dailyOrderCount) : 0;

    const expenseByCategory: Record<string, number> = {
      '食材': 0,
      '人事': 0,
      '固定成本': 0,
      '其他': 0
    };
    filteredExpense.forEach(e => {
      const cat = e.category || '其他';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    const expensePieData = Object.entries(expenseByCategory)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return {
      dailyRevenue,
      dailyOrderCount,
      weeklyRevenue,
      monthlyRevenue,
      reportRevenue,
      reportExpense,
      reportOrderCount,
      ranking,
      aov,
      dailyAov,
      orderCount: reportOrderCount,
      expensePieData
    };
  }, [entries, reportStartDate, reportEndDate, useCustomDateRange]);

  const filteredMenuProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
      const matchesCategory = menuActiveCategory === '全部' || p.category === menuActiveCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, menuSearchTerm, menuActiveCategory]);

  const handleAddEntry = async () => {
    try {
      if (newEntry.amount && newEntry.description) {
        const entry = {
          type: newEntry.type as 'income' | 'expense',
          category: newEntry.type === 'expense' ? newEntry.category : undefined,
          amount: Number(newEntry.amount),
          description: newEntry.description,
          date: newEntry.date
        };
        
        const res = await fetch('/api/finance', {
          method: 'POST',
          body: JSON.stringify(entry),
        });
        
        if (!res.ok) throw new Error('Finance creation failed');
        
        const savedEntry = await res.json();
        
        setEntries(prev => [savedEntry, ...prev]);
        setShowAddModal(false);
        setNewEntry({ type: 'income', amount: 0, description: '', date: new Date().toISOString().split('T')[0], category: '食材' });
      }
    } catch (error) {
      console.error('Add entry error:', error);
      alert('新增紀錄失敗，請稍後再試！');
    }
  };

  const handleDailyClose = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (dailyCloses.find(c => c.date === today)) {
      alert('今天已經關帳過了！');
      return;
    }

    const todayIncome = entries.filter(e => e.type === 'income' && e.date === today).reduce((s, e) => s + e.amount, 0);
    const todayExpense = entries.filter(e => e.type === 'expense' && e.date === today).reduce((s, e) => s + e.amount, 0);
    const profit = todayIncome - todayExpense;

    if (confirm(`確定要進行今日關帳嗎？\n日期：${today}\n總收入：$${todayIncome}\n總支出：$${todayExpense}\n今日盈餘：$${profit}`)) {
      try {
        const res = await fetch('/api/daily-close', {
          method: 'POST',
          body: JSON.stringify({
            date: today,
            totalIncome: todayIncome,
            totalExpense: todayExpense,
            profit: profit
          }),
        });
        
        if (!res.ok) throw new Error('Daily close failed');
        
        const savedClose = await res.json();
        setDailyCloses(prev => [...prev, savedClose]);
        alert('關帳成功！');
      } catch (error) {
        console.error('Daily close error:', error);
        alert('關帳失敗，請稍後再試！');
      }
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ 警告：這將會清空所有的訂單、收支紀錄與關帳紀錄（保留菜單）！\n此操作無法復原，確定要執行嗎？')) return;
    
    try {
      const res = await fetch('/api/admin/clear-db', {
        method: 'POST',
        body: JSON.stringify({ password: '8888' }),
      });
      
      if (res.ok) {
        alert('數據已成功清空！頁面即將重新整理。');
        window.location.reload();
      } else {
        alert('清空失敗，請確認您的權限。');
      }
    } catch (error) {
      console.error('Clear DB error:', error);
      alert('發生錯誤，請稍後再試。');
    }
  };

  const completeOrder = async (order: Order) => {
    try {
      const financeRes = await fetch('/api/finance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'income',
          amount: order.total || 0,
          description: `訂單收入 #${(order.id || '').slice(-4)}`,
          items: order.items,
        }),
      });
      
      if (!financeRes.ok) throw new Error('Finance update failed');
      
      const savedEntry = await financeRes.json();
      setEntries(prev => [savedEntry, ...prev]);

      const orderRes = await fetch('/api/orders', {
        method: 'DELETE',
        body: JSON.stringify({ id: order.id }),
      });

      if (orderRes.ok) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      }
    } catch (error) {
      console.error('Complete order error:', error);
      alert('處理訂單失敗，請稍後再試！');
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
      }
    } catch (error) {
      console.error('Update order status error:', error);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('確定要刪除這筆訂單嗎？')) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== id));
      }
    } catch (error) {
      console.error('Delete order error:', error);
    }
  };

  const handlePosCheckout = async () => {
    try {
      const total = posCart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      if (total === 0) return;

      const res = await fetch('/api/finance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'income',
          amount: total,
          description: `現場點餐收入`,
          items: posCart.map(i => ({ product: i.product, quantity: i.quantity })),
        }),
      });
      
      if (!res.ok) throw new Error('Finance update failed');
      
      const savedEntry = await res.json();
      setEntries(prev => [savedEntry, ...prev]);
      setPosCart([]);
      setShowPosCart(false);
    } catch (error) {
      console.error('POS Checkout error:', error);
      alert('結帳失敗，請稍後再試！');
    }
  };

  const updatePosCart = (product: Product, delta: number) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id 
          ? { ...i, quantity: Math.max(0, i.quantity + delta) } 
          : i).filter(i => i.quantity > 0);
      }
      if (delta > 0) return [...prev, { product, quantity: 1, spiciness: '不辣', note: '' }];
      return prev;
    });
  };

  const updatePosCartItemOptions = (index: number, spiciness: '不辣' | '小辣' | '中辣' | '大辣', note: string) => {
    setPosCart(prev => prev.map((item, i) => i === index ? { ...item, spiciness, note } : item));
  };

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch('/api/finance', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setEntries(entries.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Delete entry error:', error);
    }
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.price) {
      const res = await fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({ ...newProduct, isAvailable: true }),
      });
      const saved = await res.json();
      setProducts([...products, saved]);
      setShowAddProductModal(false);
      setNewProduct({ name: '', price: 0, category: '炸物', isAvailable: true });
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    const updatedProduct = { ...product, isAvailable: !product.isAvailable };
    const res = await fetch('/api/products', {
      method: 'PUT',
      body: JSON.stringify(updatedProduct),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts(products.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleUpdateProduct = async () => {
    if (editingProduct) {
      const res = await fetch('/api/products', {
        method: 'PUT',
        body: JSON.stringify(editingProduct),
      });
      const updated = await res.json();
      setProducts(products.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch('/api/products', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setProducts(products.filter(p => p.id !== id));
      setDeleteConfirmId(null);
    }
  };

  const handleLogin = () => {
    if (password === '8888') {
      setUserRole('boss');
      setIsAuthenticated(true);
    } else if (password === '0000') {
      setUserRole('staff');
      setIsAuthenticated(true);
    } else {
      alert('密碼錯誤！');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
          <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">九丰管理中心</h2>
          <p className="text-gray-400 text-sm mb-8">請輸入管理密碼以繼續</p>
          <input
            type="password"
            placeholder="請輸入密碼"
            className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl mb-4 text-center text-lg font-bold tracking-widest focus:ring-2 focus:ring-red-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-100 hover:bg-red-600 transition-all"
          >
            登入系統
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-white rounded-full text-gray-600 shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-800 leading-none">九丰管理中心</h1>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${userRole === 'boss' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
              {userRole === 'boss' ? '老闆模式' : '員工模式'}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-500 rounded-full font-bold text-xs shadow-sm border border-gray-100 hover:bg-gray-50 hover:text-red-500 transition-all"
            title="切換使用者"
          >
            <UserCircle size={18} />
            切換
          </button>
          {!isSoundEnabled ? (
            <button 
              onClick={unlockAndTestAudio}
              disabled={isAudioLoading}
              className={`flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full font-bold shadow-lg ${isAudioLoading ? 'opacity-50' : 'animate-bounce'}`}
            >
              <Volume2 size={18} />
              {isAudioLoading ? '載入中...' : '啟動音效'}
            </button>
          ) : (
            <>
              <button 
                onClick={playNotificationSound}
                className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
                title="測試音效"
              >
                <BellRing size={20} />
              </button>
              <button 
                onClick={() => { setIsSoundEnabled(false); isSoundEnabledRef.current = false; }}
                className="p-2 rounded-full shadow-sm bg-green-500 text-white transition-all"
                title="音效已開啟"
              >
                <Volume2 size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex bg-white p-1 rounded-xl mb-6 shadow-sm border border-gray-100">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pos' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}
        >
          <ShoppingBag size={16} />
          現場點餐
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}
        >
          <ClipboardList size={16} />
          接單 ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'finance' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}
        >
          <DollarSign size={16} />
          財務
        </button>
        {userRole === 'boss' && (
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'menu' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}
          >
            <Settings size={16} />
            菜單
          </button>
        )}
        {userRole === 'staff' && (
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'menu' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}
          >
            <Settings size={16} />
            庫存
          </button>
        )}
      </div>

      {activeTab === 'pos' ? (
        <div className="space-y-6 pb-32">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const count = posCart.find(i => i.product.id === product.id)?.quantity || 0;
              const isAvailable = product.isAvailable !== false;
              return (
                <button
                  key={product.id}
                  onClick={() => isAvailable && updatePosCart(product, 1)}
                  disabled={!isAvailable}
                  className={`p-4 rounded-2xl border text-left transition-all active:scale-95 ${
                    count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
                  } ${!isAvailable ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
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
              <button
                onClick={() => setShowPosCart(true)}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 hover:bg-black transition-all animate-in slide-in-from-bottom duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag size={24} />
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">
                      {posCart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
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
              <div className="bg-white rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" onClick={() => setShowPosCart(false)} />
                
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <ShoppingBag size={24} className="text-red-500" />
                    現場結帳
                  </h3>
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
                            <button onClick={(e) => { e.stopPropagation(); updatePosCart(item.product, -1); }} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400">
                              <Minus size={18}/>
                            </button>
                            <span className="font-black text-gray-800 w-6 text-center">{item.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); updatePosCart(item.product, 1); }} className="p-1.5 hover:bg-gray-50 rounded-lg text-red-500">
                              <Plus size={18}/>
                            </button>
                          </div>
                          <span className="font-black text-gray-800 w-20 text-right">${item.product.price * item.quantity}</span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                        {(['不辣', '小辣', '中辣', '大辣'] as const).map((level) => (
                          <button
                            key={level}
                            onClick={() => updatePosCartItemOptions(index, level, item.note || '')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                              item.spiciness === level ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-gray-100">
                        <Settings size={16} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="品項備註 (如：不加胡椒)"
                          className="bg-transparent w-full outline-none text-sm font-medium"
                          value={item.note || ''}
                          onChange={(e) => updatePosCartItemOptions(index, (item.spiciness as any) || '不辣', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-red-50 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">應收金額</span>
                    <span className="text-3xl font-black text-red-500">
                      ${posCart.reduce((s, i) => s + i.product.price * i.quantity, 0)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePosCheckout}
                  className="w-full bg-green-500 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-600 active:scale-95 transition-all mb-4"
                >
                  <DollarSign size={24} />
                  確認收款並結帳
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'orders' ? (
        <div className="space-y-4 pb-20">
          <h2 className="font-bold text-gray-800 px-1">待處理訂單</h2>
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <ClipboardList className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-400">目前沒有新訂單</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id || Math.random().toString()} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                      # {(order.id || '').slice(-4)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : '時間不詳'}
                    </p>
                    {order.customerName && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          {order.customerName}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          {order.customerPhone}
                        </p>
                        <p className="text-xs font-black text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md inline-block mt-1">
                          <Clock size={12} />
                          預計取餐：{order.pickupTime}
                        </p>
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
                        {item.spiciness && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            item.spiciness === '不辣' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {item.spiciness}
                          </span>
                        )}
                        {item.note && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                            備註：{item.note}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.orderNote && (
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                      <p className="text-xs font-bold text-yellow-700 mb-1 flex items-center gap-1">
                        <Settings size={12} /> 全單備註
                      </p>
                      <p className="text-sm text-yellow-800">{order.orderNote}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600"
                    >
                      <Clock size={18} />
                      開始製作
                    </button>
                  ) : (
                    <button
                      onClick={() => completeOrder(order)}
                      className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600"
                    >
                      <CheckCircle size={18} />
                      出餐並結帳
                    </button>
                  )}
                  {userRole === 'boss' && (
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="p-2.5 bg-gray-100 text-gray-400 rounded-xl hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'menu' ? (
        <div className="space-y-6 pb-20">
          <div className="flex flex-col gap-4 px-1">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-lg">
                {userRole === 'boss' ? '菜單品項管理' : '品項庫存管理'}
              </h2>
              {userRole === 'boss' && (
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-red-100 font-bold text-sm"
                >
                  <Plus size={18} />
                  新增品項
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="搜尋品項名稱..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                  value={menuSearchTerm}
                  onChange={(e) => setMenuSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {['全部', '炸物', '優惠組合', '飲料', '其他'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMenuActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      menuActiveCategory === cat ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredMenuProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <Search className="mx-auto text-gray-200 mb-2" size={48} />
                <p className="text-gray-400 text-sm">找不到符合的品項</p>
              </div>
            ) : (
              filteredMenuProducts.map((product) => (
                <div key={product.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${product.isAvailable === false ? 'opacity-60 grayscale-[0.5]' : 'border-gray-100'}`}>
                  {editingProduct?.id === product.id ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Edit2 size={12} /> 編輯中
                        </span>
                        <button onClick={() => setEditingProduct(null)} className="text-gray-400 p-1">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">品項名稱</label>
                          <input
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">價格</label>
                            <input
                              type="number"
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-red-500 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={editingProduct.price}
                              onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block">類別</label>
                            <select
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                              value={editingProduct.category}
                              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                            >
                              <option value="炸物">炸物</option>
                              <option value="優惠組合">優惠組合</option>
                              <option value="飲料">飲料</option>
                              <option value="其他">其他</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdateProduct} 
                        className="w-full bg-blue-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-600"
                      >
                        <Save size={18} /> 儲存變更
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {product.category}
                          </span>
                          {product.isAvailable === false && (
                            <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              已售完
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-800 text-lg">{product.name}</h4>
                        <p className="text-base font-black text-red-500">${product.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleProductAvailability(product)}
                          className={`p-2 rounded-xl transition-all ${product.isAvailable === false ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'}`}
                          title={product.isAvailable === false ? '設為供貨中' : '設為已售完'}
                        >
                          <CheckCircle size={20} />
                        </button>
                        {userRole === 'boss' && (
                          <>
                            <button 
                              onClick={() => setEditingProduct(product)}
                              className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-xl transition-colors"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(product.id)}
                              className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
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
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">確定要刪除嗎？</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  刪除品項「<span className="font-bold text-gray-700">{products.find(p => p.id === deleteConfirmId)?.name}</span>」後將無法復原。
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all">取消</button>
                  <button onClick={() => handleDeleteProduct(deleteConfirmId)} className="py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all">確定刪除</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {userRole === 'boss' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <TrendingUp size={16} />
                  <span className="text-xs font-medium">總收入</span>
                </div>
                <p className="text-2xl font-bold text-green-700">${income}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <TrendingDown size={16} />
                  <span className="text-xs font-medium">總支出</span>
                </div>
                <p className="text-2xl font-bold text-red-700">${expense}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-gray-800">
              {userRole === 'boss' ? '收支明細' : '今日收支'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleDailyClose}
                className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg shadow-lg transition-all ${
                  dailyCloses.find(c => c.date === new Date().toISOString().split('T')[0])
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
                }`}
                disabled={!!dailyCloses.find(c => c.date === new Date().toISOString().split('T')[0])}
              >
                <CheckCircle size={16} />
                {dailyCloses.find(c => c.date === new Date().toISOString().split('T')[0]) ? '今日已關帳' : '每日關帳'}
              </button>
              {userRole === 'boss' && (
                <>
                  <button onClick={() => setShowSummaryModal(true)} className="flex items-center gap-1 text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-lg">
                    <ClipboardList size={16} />
                    營收結報
                  </button>
                  <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-red-100">
                    <Plus size={16} />
                    新增紀錄
                  </button>
                  <button onClick={handleClearDatabase} className="flex items-center gap-1 text-sm bg-white text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg hover:text-red-500 transition-colors" title="清空所有數據">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">暫無收支紀錄</div>
            ) : (
              entries
                .filter(e => userRole === 'boss' || e.date === new Date().toISOString().split('T')[0])
                .map((entry) => (
                  <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${entry.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {entry.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">
                          {entry.description}
                          {entry.type === 'expense' && entry.category && (
                            <span className="ml-2 text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {entry.category}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-gray-400">{entry.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold text-sm ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'income' ? '+' : '-'}${entry.amount}
                      </span>
                      {userRole === 'boss' && (
                        <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>

          {userRole === 'boss' && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 size={18} className="text-red-500" />
                  收支趨勢
                </h2>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setChartType('line')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartType === 'line' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>曲線</button>
                    <button onClick={() => setChartType('bar')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>直條</button>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as const).map((view) => (
                      <button key={view} onClick={() => setChartView(view)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartView === view ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>
                        {view === 'day' ? '日' : view === 'week' ? '周' : '月'}
                      </button>
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
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
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
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-gray-400 font-medium">收入</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] text-gray-400 font-medium">支出</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">新增品項</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">品名</label>
                <input type="text" placeholder="例如：雞排、可樂" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">價格</label>
                  <input type="number" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">類別</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}>
                    <option value="炸物">炸物</option>
                    <option value="優惠組合">優惠組合</option>
                    <option value="飲料">飲料</option>
                    <option value="其他">其他</option>
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
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">支出分類</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newEntry.category} onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value as any })}>
                    <option value="食材">食材</option>
                    <option value="人事">人事</option>
                    <option value="固定成本">固定成本</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">說明</label>
                <input type="text" placeholder="例如：採買食材、午餐營收" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">金額</label>
                <input type="number" placeholder="請輸入金額" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">日期</label>
                <input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">取消</button>
              <button onClick={handleAddEntry} className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-100">確認新增</button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md max-h-[85vh] overflow-y-auto p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <BarChart3 size={28} className="text-red-500" />
                營業數據報表
              </h2>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">報表區段</h3>
                  <button onClick={() => setUseCustomDateRange(!useCustomDateRange)} className={`text-[10px] font-black px-2 py-1 rounded-md transition-all ${useCustomDateRange ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {useCustomDateRange ? '自定義區段' : '預設 (全期)'}
                  </button>
                </div>
                {useCustomDateRange && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">開始日期</label>
                      <input type="date" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-500" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">結束日期</label>
                      <input type="date" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-red-500" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                  <p className="text-[10px] font-bold text-red-400 mb-1">{useCustomDateRange ? '區段營收' : '今日營收'}</p>
                  <p className="text-lg font-black text-red-600">${useCustomDateRange ? stats.reportRevenue : stats.dailyRevenue}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                  <p className="text-[10px] font-bold text-orange-400 mb-1">{useCustomDateRange ? '區段支出' : '本週營收'}</p>
                  <p className="text-lg font-black text-orange-600">${useCustomDateRange ? stats.reportExpense : stats.weeklyRevenue}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                  <p className="text-[10px] font-bold text-blue-400 mb-1">{useCustomDateRange ? '區段盈餘' : '本月營收'}</p>
                  <p className="text-lg font-black text-blue-600">${useCustomDateRange ? (stats.reportRevenue - stats.reportExpense) : stats.monthlyRevenue}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <User size={16} />
                    <span className="text-xs font-bold">{useCustomDateRange ? '區段客單價' : '今日客單價'}</span>
                  </div>
                  <p className="text-2xl font-black text-gray-800">${useCustomDateRange ? stats.aov : stats.dailyAov}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{useCustomDateRange ? '區段' : '今日'}共 {useCustomDateRange ? stats.reportOrderCount : stats.dailyOrderCount} 筆訂單</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <ShoppingBag size={16} />
                    <span className="text-xs font-bold">{useCustomDateRange ? '區段訂單' : '全月累計訂單'}</span>
                  </div>
                  <p className="text-2xl font-black text-gray-800">{useCustomDateRange ? stats.reportOrderCount : stats.orderCount}</p>
                  <p className="text-[10px] text-gray-400 mt-1">平均客單價 ${stats.aov}</p>
                </div>
              </div>

              {stats.expensePieData.length > 0 && (
                <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 px-1">
                    <TrendingDown size={18} className="text-red-500" />
                    支出結構分析
                  </h3>
                  <div className="flex flex-col items-center">
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.expensePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                            {stats.expensePieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#8b5cf6', '#6b7280'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                      {stats.expensePieData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#8b5cf6', '#6b7280'][index % 4] }} />
                          <span className="text-[10px] font-bold text-gray-600">{item.name}</span>
                          <span className="text-[10px] font-black text-gray-400">${item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 px-1">
                  <TrendingUp size={18} className="text-green-500" />
                  本月銷售排行 (依營收)
                </h3>
                <div className="space-y-2">
                  {stats.ranking.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400">尚無銷售數據</p>
                    </div>
                  ) : (
                    stats.ranking.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-600' : 
                            index === 1 ? 'bg-gray-100 text-gray-600' : 
                            index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <p className="text-[10px] text-gray-400">售出 {item.quantity} 份</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-red-500">${item.revenue}</p>
                          <p className="text-[10px] text-gray-400">營收佔比 {Math.round((item.revenue / (stats.monthlyRevenue || 1)) * 100)}%</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button onClick={() => setShowSummaryModal(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-black transition-all">
                完成檢閱
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
