import React, { useState } from 'react';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { api } from '@/services/api';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile';
import { Button, Card, Input } from '@/components/shared/ui';

export const LoginView = ({ profile, onLogin, onGoToCustomer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedLogoSrc, setFailedLogoSrc] = useState('');

  const normalizedProfile = normalizeProfile(profile);
  const logoSrc = profileLogoSrc(normalizedProfile.logoPath);
  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc;
  const fallbackLetter = profileBrandInitial(normalizedProfile);

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!username || !password) {
      setErrorMsg('لطفا نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      await onLogin({
        role: data?.role || null,
        username: data?.username || username,
      });
    } catch (error) {
      setErrorMsg(error?.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
      <Card className="w-full max-w-sm animate-in fade-in zoom-in-95" padding="lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-2xl font-black text-white">
          {showLogo ? (
            <img
              src={logoSrc}
              alt={normalizedProfile.brandName}
              onError={() => setFailedLogoSrc(logoSrc)}
              className="h-full w-full object-cover"
            />
          ) : (
            fallbackLetter
          )}
        </div>

        <h1 className="mb-2 text-center text-xl font-black text-slate-800">{normalizedProfile.brandName}</h1>
        <p className="mb-8 text-center text-xs font-bold text-slate-500">{normalizedProfile.panelSubtitle}</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">نام کاربری</label>
            <Input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="bg-slate-50"
              autoComplete="username"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">رمز عبور</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-slate-50"
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-center text-xs font-bold text-rose-700" aria-live="polite">
              {errorMsg}
            </div>
          )}

          <Button disabled={isLoading} type="submit" variant="primary" size="lg" className="mt-6 w-full">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {isLoading ? 'در حال بررسی...' : 'ورود به پنل'}
          </Button>
        </form>
      </Card>

      <Button onClick={onGoToCustomer} variant="ghost" className="mt-6">
        <ArrowRight size={14} />
        بازگشت به فرم سفارش مشتری
      </Button>
    </div>
  );
};
