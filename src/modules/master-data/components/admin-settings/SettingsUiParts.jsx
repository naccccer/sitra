import React from 'react';

export const CountBadge = ({ children, tone = 'light' }) => {
  const toneClass = tone === 'dark'
    ? 'bg-white/12 text-white ring-1 ring-white/15'
    : 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${toneClass}`}>
      {children}
    </span>
  );
};

export const SettingsSection = ({
  title,
  subtitle = '',
  badge = '',
  actions = null,
  children,
  className = '',
  bodyClassName = '',
}) => (
  <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black">{title}</h3>
          {badge ? <CountBadge tone="dark">{badge}</CountBadge> : null}
        </div>
        {subtitle ? <p className="mt-1 text-[11px] font-bold text-slate-300">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
    <div className={`p-4 ${bodyClassName}`}>{children}</div>
  </section>
);

export const SettingsCard = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-slate-200 bg-slate-50/50 p-3 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ title, subtitle = '', badge = '' }) => (
  <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
    <div>
      <h4 className="text-xs font-black text-slate-800">{title}</h4>
      {subtitle ? <p className="mt-1 text-[10px] font-bold text-slate-500">{subtitle}</p> : null}
    </div>
    {badge ? <CountBadge>{badge}</CountBadge> : null}
  </div>
);

export const FieldLabel = ({ children }) => (
  <span className="mb-2 block text-[10px] font-black text-slate-500">{children}</span>
);

export const CompactField = ({ children, className = '' }) => (
  <div className={`w-full min-w-[96px] max-w-[126px] ${className}`}>{children}</div>
);

export const InputShell = ({ children, className = '' }) => (
  <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
    {children}
  </div>
);

export const CompactTextInput = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-black text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
  />
);

export const CompactSelect = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
  >
    {children}
  </select>
);

export const SettingsInlineGroup = ({ children, className = '' }) => (
  <div className={`flex flex-wrap gap-2.5 ${className}`}>{children}</div>
);

export const DangerIconButton = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white text-red-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 ${className}`}
  >
    {children}
  </button>
);

export const DashedActionButton = ({ onClick, children, tone = 'blue', className = '', disabled = false }) => {
  const toneClass = tone === 'indigo'
    ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
    : 'border-slate-300 text-slate-700 hover:bg-slate-50';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 text-xs font-black transition ${toneClass} disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 ${className}`}
    >
      {children}
    </button>
  );
};

export const ToggleChip = ({ checked = false, children, className = '' }) => (
  <span className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-black transition ${checked ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'} ${className}`}>
    {children}
  </span>
);
