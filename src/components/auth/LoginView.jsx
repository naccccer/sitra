import React, { useState } from 'react';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { api } from '@/services/api';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile';
import { Button, Card, InlineAlert, Input } from '@/components/shared/ui';

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

      <div className="auth-entry-grid app-content-area relative w-full max-w-5xl">
        <Card padding="none" className="auth-entry-card animate-in fade-in zoom-in-95 overflow-hidden">
          <div className="grid min-h-[620px] lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
            <div className="auth-entry-form-panel order-1 flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-[rgb(var(--ui-primary))] text-2xl font-black text-white shadow-[var(--shadow-strong)]">
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
                  <h1 className="text-3xl font-black tracking-tight text-[rgb(var(--ui-text))]">ورود</h1>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[rgb(var(--ui-text-muted))]">نام کاربری</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="bg-white/95"
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
                    className="bg-white/95"
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

              <Button onClick={onGoToCustomer} variant="ghost" className="mt-4 w-full justify-center">
                <ArrowRight size={14} />
                بازگشت به فرم سفارش مشتری
              </Button>
            </div>

            <div className="auth-entry-brand-panel order-2 hidden min-h-full lg:flex">
              <div className="auth-entry-art-panel m-4 flex flex-1 overflow-hidden rounded-[28px]" aria-hidden="true">
                <div className="auth-entry-art-column auth-entry-art-column-one" />
                <div className="auth-entry-art-column auth-entry-art-column-two" />
                <div className="auth-entry-art-column auth-entry-art-column-three" />
                <div className="auth-entry-art-column auth-entry-art-column-four" />
                <div className="auth-entry-art-flare" />
                <div className="auth-entry-art-mist" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
