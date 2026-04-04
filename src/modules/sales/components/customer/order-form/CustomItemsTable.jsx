import React, { useEffect, useMemo, useRef, useState } from 'react';

export const CustomItemsTable = ({
  customItems,
  customDraft,
  setCustomDraft,
  onGoToCustomItems,
  isStaffContext = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedItem = useMemo(
    () => customItems.find((item) => String(item.id) === String(customDraft.itemId || '')) || null,
    [customItems, customDraft.itemId],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (normalizedQuery === '') return customItems;
    return customItems.filter((item) => String(item.title || '').toLowerCase().includes(normalizedQuery));
  }, [customItems, query]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  if (customItems.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-black text-slate-700">آیتم سفارشی فعالی وجود ندارد.</p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {isStaffContext ? 'ابتدا از اطلاعات پایه آیتم سفارشی بسازید.' : 'در حال حاضر آیتم سفارشی برای انتخاب وجود ندارد.'}
        </p>
        {isStaffContext && (
          <button type="button" onClick={onGoToCustomItems} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
            ساخت آیتم
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-slate-300"
      >
        <span className="truncate">{selectedItem?.title || 'انتخاب آیتم سفارشی'}</span>
        <span className="text-xs text-slate-400">{isOpen ? 'بستن' : 'انتخاب'}</span>
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-11 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی آیتم..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-300"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5">
            {filteredItems.length === 0 && (
              <div className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500">آیتمی پیدا نشد.</div>
            )}
            {filteredItems.map((item) => {
              const isSelected = String(customDraft.itemId || '') === String(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCustomDraft((previous) => ({
                      ...previous,
                      itemId: String(item.id),
                      unitPrice: String(item.unitPrice),
                    }));
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-xs transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span className="truncate font-black">{item.title}</span>
                  {isSelected && <span className="text-[10px] font-black">انتخاب شده</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
