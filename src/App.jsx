import React, { useState } from 'react';
import { LogOut } from 'lucide-react';

// Data
import { initialCatalog, initialOrders } from './data/mockData';

// Components
import { OrderForm } from './components/customer/OrderForm';
import { LoginView } from './components/auth/LoginView';
import { AdminPanel } from './components/admin/AdminPanel';

export default function App() {
  const [view, setView] = useState('customer'); // 'customer' | 'login' | 'admin' | 'admin_order_edit'
  const [userRole, setUserRole] = useState(null); // 'manager' | 'admin'
  
  const [catalog, setCatalog] = useState(initialCatalog);
  const [orders, setOrders] = useState(initialOrders);
  const [editingOrder, setEditingOrder] = useState(null);

  const handleLogin = (role) => {
    setUserRole(role);
    setView('admin');
  };

  const handleLogout = async () => {
    try {
      // درخواست به بک‌اند برای نابود کردن سشن
      await fetch('/api/logout.php', {
        method: 'POST',
        credentials: 'include' // حتماً باشه تا کوکی سشن رو بفرسته
      });
    } catch (error) {
      console.error('خطا در ارتباط با سرور هنگام خروج', error);
    } finally {
      // در هر صورت (چه سرور جواب داد چه نداد) کاربر رو از فرانت‌اند میندازیم بیرون
      setUserRole(null);
      setView('login');
    }
  };

  const startEditingOrder = (order) => {
    setEditingOrder(order);
    setView('admin_order_edit');
  };

  const cancelEditOrder = () => {
    setEditingOrder(null);
    setView('admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap');
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; font-family: 'Vazirmatn', sans-serif !important; }
          .print-hide { display: none !important; }
          .printable-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; min-height: 100vh; background: white; z-index: 9999; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      
      {/* Top Bar For Admin (Only when logged in) */}
      {(view === 'admin' || view === 'admin_order_edit') && (
        <div className="bg-slate-900 text-white p-3 shadow-lg mb-6 sticky top-0 z-40 flex justify-between items-center print-hide">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black">S</div>
             <span className="font-black text-sm hidden sm:inline">گلس دیزاین | پنل پرسنل</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${view === 'admin' ? 'bg-blue-600 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
              پنل مدیریت
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs text-red-400 hover:bg-red-500 hover:text-white transition-all">
              <LogOut size={14}/> <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Views Routing */}
      {view === 'customer' && (
        <OrderForm catalog={catalog} orders={orders} setOrders={setOrders} onGoToLogin={() => setView('login')} />
      )}

      {view === 'login' && (
        <LoginView onLogin={handleLogin} onGoToCustomer={() => setView('customer')} />
      )}

      {view === 'admin' && (
        <div className="p-4 lg:px-8">
          <AdminPanel catalog={catalog} setCatalog={setCatalog} orders={orders} setOrders={setOrders} onEditOrder={startEditingOrder} userRole={userRole} />
        </div>
      )}

      {view === 'admin_order_edit' && (
        <div className="p-4 lg:px-8">
          <OrderForm catalog={catalog} orders={orders} setOrders={setOrders} editingOrder={editingOrder} onCancelEdit={cancelEditOrder} />
        </div>
      )}
    </div>
  );
}

