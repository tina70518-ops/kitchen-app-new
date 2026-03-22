'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, CheckCircle2, User, Phone, Clock, Settings } from 'lucide-react';
import { PRODUCTS, Product } from '@/lib/data';

interface CartItem {
  product: Product;
  quantity: number;
  spiciness?: '不辣' | '小辣' | '中辣' | '大辣';
  note?: string;
}

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  
  // 顧客資訊
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // 當前正在編輯選項的品項
  const [editingItem, setEditingItem] = useState<{product: Product, index: number} | null>(null);

  // Fetch products
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to fetch products:', err));
  }, []);

  // 產生取餐時間選項 (14:30 - 18:30, 15分鐘為單位)
  const timeOptions = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  let startHour = 14;
  let startMin = 30;

  while (startHour < 18 || (startHour === 18 && startMin <= 30)) {
    // 檢查時間是否已經過去
    const isPast = startHour < currentHour || (startHour === currentHour && startMin < currentMin);
    
    if (!isPast) {
      const timeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }

    startMin += 15;
    if (startMin >= 60) {
      startHour += 1;
      startMin = 0;
    }
  }

  const categories = ['全部', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = activeCategory === '全部' 
    ? products 
    : products.filter((p) => p.category === activeCategory);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, spiciness: '不辣', note: '' }];
    });
  };

  const updateCartItemOptions = (index: number, spiciness: CartItem['spiciness'], note: string) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, spiciness, note } : item));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <main className="flex-1 overflow-y-auto p-4 pb-24">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">九丰炸物專門店</h1>
          <p className="text-sm text-gray-500">歡迎光臨，請選擇您的餐點</p>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-red-500 text-white shadow-lg shadow-red-100'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4">
        {filteredProducts.map((product) => {
          const isAvailable = product.isAvailable !== false;
          return (
            <div key={product.id} className={`flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border transition-all ${!isAvailable ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:border-red-100'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-1 bg-red-50 text-red-500 rounded-md inline-block">
                    {product.category}
                  </span>
                  {!isAvailable && (
                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-md inline-block">
                      售完
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800">{product.name}</h3>
                <p className="text-red-500 font-bold">${product.price}</p>
              </div>
              <button
                onClick={() => isAvailable && addToCart(product)}
                disabled={!isAvailable}
                className={`p-2 rounded-lg transition-colors ${
                  isAvailable 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus size={20} />
              </button>
            </div>
          );
        })}
      </section>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-red-500 text-white py-4 rounded-2xl shadow-xl flex items-center justify-between px-6 hover:bg-red-600 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-white text-red-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-red-500">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <span className="font-semibold">查看購物車</span>
            </div>
            <span className="text-lg font-bold">${total}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">購物車</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">
                關閉
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <User size={18} className="text-red-500" />
                填寫取餐資訊
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <User size={18} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="請輸入您的姓名"
                    className="bg-transparent w-full outline-none text-sm"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Phone size={18} className="text-gray-400" />
                  <input
                    type="tel"
                    placeholder="請輸入您的電話"
                    className="bg-transparent w-full outline-none text-sm"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Clock size={18} className="text-gray-400" />
                  <select
                    className="bg-transparent w-full outline-none text-sm"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  >
                    <option value="">請選擇取餐時間</option>
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-4">
              <ShoppingCart size={18} className="text-red-500" />
              確認餐點
            </h3>
            <div className="space-y-4 mb-8">
              {cart.map((item, index) => (
                <div key={item.product.id + index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800">{item.product.name}</h4>
                      <p className="text-sm text-gray-500">${item.product.price} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 border border-gray-200 rounded-md text-gray-500"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 border border-gray-200 rounded-md text-gray-500"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Spiciness Selection */}
                  <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                    {(['不辣', '小辣', '中辣', '大辣'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateCartItemOptions(index, level, item.note || '')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          item.spiciness === level
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-400 border border-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  {/* Item Note */}
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100">
                    <Settings size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="品項備註 (如：不加胡椒)"
                      className="bg-transparent w-full outline-none text-xs"
                      value={item.note || ''}
                      onChange={(e) => updateCartItemOptions(index, item.spiciness, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Settings size={18} className="text-red-500" />
                全單備註
              </h3>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <textarea
                  placeholder="有什麼其他想告訴老闆的嗎？"
                  className="bg-transparent w-full outline-none text-sm min-h-[60px] resize-none"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center text-lg font-bold text-gray-800">
                <span>總計</span>
                <span className="text-red-500">${total}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!customerName || !customerPhone || !pickupTime) {
                  alert('請填寫完整的取餐資訊！');
                  return;
                }

                const orderData = {
                  items: cart.map(item => ({ 
                    product: item.product, 
                    quantity: item.quantity,
                    spiciness: item.spiciness,
                    note: item.note
                  })),
                  total: total,
                  customerName,
                  customerPhone,
                  pickupTime,
                  orderNote,
                };
                
                try {
                  const response = await fetch('/api/orders', {
                    method: 'POST',
                    body: JSON.stringify(orderData),
                  });
                  if (response.ok) {
                    setOrderSuccess(true);
                    setCart([]);
                    setShowCart(false);
                    // Hide success modal after 3 seconds
                    setTimeout(() => setOrderSuccess(false), 3000);
                  }
                } catch (error) {
                  alert('送單失敗，請檢查網路！');
                }
              }}
              className="w-full bg-red-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <CreditCard size={20} />
              確認下單
            </button>
          </div>
        </div>
      )}

      {/* Order Success Toast/Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">下單成功！</h2>
            <p className="text-gray-500">訂單已送達櫃檯<br />請等候現點現炸的美味</p>
          </div>
        </div>
      )}
    </main>
  );
}
