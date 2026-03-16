import React from 'react';

export const TabHint = ({ tone = 'blue', children }) => {
  const toneClass = tone === 'indigo'
    ? 'border-indigo-200 bg-indigo-50/60 text-indigo-700'
    : 'border-blue-200 bg-blue-50/60 text-blue-700';

  return (
    <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${toneClass}`}>
      {children}
    </div>
  );
};

export const SettingsCard = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(59,130,246,0.08)] ${className}`}>
    {children}
  </section>
);

export const CardTitle = ({ title, subtitle, badge }) => (
  <div className="mb-3">
    <div className="mb-1 flex items-center justify-between gap-2">
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      {badge ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">{badge}</span> : null}
    </div>
    {subtitle ? <p className="text-[11px] font-bold text-slate-500">{subtitle}</p> : null}
  </div>
);

export const DashedActionButton = ({ onClick, children, tone = 'blue' }) => {
  const toneClass = tone === 'indigo'
    ? 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
    : 'border-blue-200 text-blue-600 hover:bg-blue-50';

  return (
    <button
      onClick={onClick}
      className={`mt-1 flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed py-2.5 text-xs font-black transition-colors sm:w-fit sm:px-5 ${toneClass}`}
    >
      {children}
    </button>
  );
};
