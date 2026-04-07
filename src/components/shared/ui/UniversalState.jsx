import React from 'react';
import { Archive, Ban, CheckCircle2, Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/ui/EmptyState';
import { cn } from '@/components/shared/ui/cn';

const STATE_META = {
  loading: {
    icon: LoaderCircle,
    tone: 'accent',
    iconClassName: 'universal-state-icon--loading',
    title: 'در حال بارگذاری',
    description: 'اطلاعات این بخش در حال آماده سازی است.',
    loading: true,
  },
  empty: {
    icon: Inbox,
    tone: 'muted',
    iconClassName: 'universal-state-icon--empty',
    title: 'داده‌ای برای نمایش وجود ندارد',
    description: 'برای ادامه، فیلترها را تغییر دهید یا یک مورد جدید ایجاد کنید.',
  },
  error: {
    icon: TriangleAlert,
    tone: 'muted',
    iconClassName: 'universal-state-icon--error',
    title: 'خطا در نمایش بخش',
    description: 'بارگذاری این بخش کامل نشد. دوباره تلاش کنید یا وضعیت ورودی ها را بررسی کنید.',
  },
  success: {
    icon: CheckCircle2,
    tone: 'accent',
    iconClassName: 'universal-state-icon--success',
    title: 'عملیات با موفقیت انجام شد',
    description: 'تغییرات ثبت شد و می توانید کار بعدی را ادامه دهید.',
  },
  archived: {
    icon: Archive,
    tone: 'muted',
    iconClassName: 'universal-state-icon--archived',
    title: 'این رکورد بایگانی شده است',
    description: 'در صورت نیاز آن را بازگردانی کنید یا فقط برای مشاهده نگه دارید.',
  },
  disabled: {
    icon: Ban,
    tone: 'muted',
    iconClassName: 'universal-state-icon--disabled',
    title: 'این بخش در حال حاضر در دسترس نیست',
    description: 'برای ادامه به مجوز یا وضعیت فعال سازی مناسب نیاز دارید.',
  },
};

export const UniversalState = ({
  state = 'empty',
  title = '',
  description = '',
  action = null,
  className = '',
}) => {
  const resolvedState = STATE_META[state] ? state : 'empty';
  const meta = STATE_META[resolvedState];
  const Icon = meta.icon;

  return (
    <EmptyState
      title={title || meta.title}
      description={description || meta.description}
      action={action}
      icon={Icon}
      tone={meta.tone}
      iconClassName={cn(meta.iconClassName, meta.loading ? 'animate-pulse' : '')}
      iconInnerClassName={meta.loading ? 'animate-spin text-current' : 'text-current'}
      className={className}
    />
  );
};
