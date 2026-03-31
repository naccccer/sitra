import React, { useState } from 'react';
import { ArrowRight, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { api } from '@/services/api';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile';
import { Badge, Button, Card, InlineAlert, Input } from '@/components/shared/ui';

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
    <div className="app-shell auth-entry-shell flex items-center justify-center px-4 py-8 font-sans sm:px-6 lg:px-8" dir="rtl">
      <div className="auth-entry-orb auth-entry-orb-primary" aria-hidden="true" />
      <div className="auth-entry-orb auth-entry-orb-secondary" aria-hidden="true" />

      <div className="auth-entry-grid app-content-area relative grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,420px)] lg:items-center">
        <Card
          tone="glass"
          padding="lg"
          className="auth-entry-brand-panel order-2 animate-in fade-in slide-in-from-right-4 lg:order-1 lg:min-h-[540px]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">ورود کارکنان</Badge>
            <Badge tone="neutral">هم راستا با پنل اصلی</Badge>
          </div>

          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/70 bg-[rgb(var(--ui-primary))] text-3xl font-black text-white shadow-[var(--shadow-strong)]">
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

            <div className="min-w-0">
              <div className="section-kicker">Sitra ERP</div>
              <h1 className="mt-2 text-balance text-3xl font-black tracking-tight text-[rgb(var(--ui-text))] sm:text-4xl">
                {normalizedProfile.brandName}
              </h1>
              <p className="mt-3 max-w-xl text-sm font-bold leading-7 text-[rgb(var(--ui-text-muted))] sm:text-[15px]">
                {normalizedProfile.panelSubtitle}
              </p>
            </div>
          </div>

          <div className="auth-entry-highlight mt-8 rounded-[28px] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[rgb(var(--ui-text))]">
              <ShieldCheck size={18} className="text-[rgb(var(--ui-accent-strong))]" />
              <span className="text-sm font-black">ورود امن به فضای عملیاتی سیستم</span>
            </div>
            <p className="mt-3 max-w-xl text-sm font-bold leading-7 text-[rgb(var(--ui-text-muted))]">
              همان زبان بصری shell، همان اولویت روی خوانایی و سرعت. تاکید بصری فقط روی سطوح ورودی و highlight باقی می ماند تا فرم ورود خلوت و حرفه ای بماند.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="auth-entry-mini-panel px-4 py-4">
                <div className="text-xs font-black text-[rgb(var(--ui-text))]">ورود متمرکز</div>
                <p className="mt-1 text-xs font-bold leading-6 text-[rgb(var(--ui-text-muted))]">
                  دسترسی به ماژول ها و نشست کاربری بدون تغییر در flow فعلی احراز هویت.
                </p>
              </div>
              <div className="auth-entry-mini-panel px-4 py-4">
                <div className="text-xs font-black text-[rgb(var(--ui-text))]">سازگار با RTL</div>
                <p className="mt-1 text-xs font-bold leading-6 text-[rgb(var(--ui-text-muted))]">
                  فرم، تایپوگرافی و ترتیب تعامل ها برای تجربه فارسی و استفاده روزمره بهینه شده اند.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card
          className="auth-entry-form-card order-1 animate-in fade-in zoom-in-95 lg:order-2"
          padding="lg"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <div className="section-kicker">احراز هویت</div>
              <h2 className="mt-1 text-xl font-black text-[rgb(var(--ui-text))]">ورود به پنل</h2>
              <p className="mt-2 text-xs font-bold leading-6 text-[rgb(var(--ui-text-muted))]">
                با نام کاربری و رمز عبور سازمانی وارد شوید.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))] shadow-[var(--shadow-soft)]">
              <KeyRound size={18} />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[rgb(var(--ui-text-muted))]">نام کاربری</label>
              <Input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="bg-white/90"
                autoComplete="username"
                dir="ltr"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[rgb(var(--ui-text-muted))]">رمز عبور</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-white/90"
                autoComplete="current-password"
                dir="ltr"
              />
            </div>

            {errorMsg ? (
              <InlineAlert tone="danger" title="ورود انجام نشد" aria-live="polite">
                {errorMsg}
              </InlineAlert>
            ) : null}

            <Button disabled={isLoading} type="submit" variant="primary" size="lg" className="mt-2 w-full">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {isLoading ? 'در حال بررسی...' : 'ورود به پنل'}
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-3 border-t border-[rgb(var(--ui-border-soft))] pt-4">
            <div className="text-center text-[11px] font-bold leading-6 text-[rgb(var(--ui-text-muted))]">
              اگر وارد پنل نمی شوید، مسیر سفارش مشتری همچنان بدون تغییر در دسترس است.
            </div>
            <Button onClick={onGoToCustomer} variant="ghost" className="w-full justify-center">
              <ArrowRight size={14} />
              بازگشت به فرم سفارش مشتری
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
