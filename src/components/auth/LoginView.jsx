import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

export const LoginView = ({ onLogin, onGoToCustomer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !password) {
      setErrorMsg('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLogin(data.role);
      } else {
        setErrorMsg(data.error || 'خطا در ورود به سیستم.');
      }
    } catch {
      setErrorMsg('ارتباط با سرور برقرار نشد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">S</div>
        <h1 className="text-xl font-black text-center text-slate-800 mb-2">ورود به سیستم همکاران</h1>
        <p className="text-xs text-center text-slate-500 font-bold mb-8">لطفاً مشخصات دسترسی خود را وارد کنید.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">نام کاربری</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 transition-colors"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 transition-colors"
              dir="ltr"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-500 font-bold text-center bg-red-50 p-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          <button
            disabled={isLoading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30 transition-all mt-6"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {isLoading ? 'در حال بررسی...' : 'ورود به پنل'}
          </button>
        </form>
      </div>
      <button onClick={onGoToCustomer} className="mt-8 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors">
        <ArrowRight size={14} /> بازگشت به فرم سفارش مشتری
      </button>
    </div>
  );
};
