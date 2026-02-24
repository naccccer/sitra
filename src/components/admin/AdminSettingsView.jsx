import React, { useState } from 'react';
import { Save, Plus, X, Trash2, Layers } from 'lucide-react';
import { toPN } from '../../utils/helpers';
import { PriceInput } from '../shared/PriceInput';
import { api } from '../../services/api';
import { ensureBillingSettings, PAYMENT_METHOD_OPTIONS } from '../../utils/invoice';

const ensureCatalogDefaults = (source) => {
  const next = JSON.parse(JSON.stringify(source || {}));
  if (!next.fees) next.fees = {};
  if (!next.fees.edgeWork) next.fees.edgeWork = { unit: 'm_length', price: 0 };
  else {
    next.fees.edgeWork = {
      unit: next.fees.edgeWork.unit || 'm_length',
      price: next.fees.edgeWork.price ?? 0,
    };
  }
  next.billing = ensureBillingSettings(next);
  return next;
};

export const AdminSettingsView = ({ catalog, setCatalog }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('matrix');
  const [draft, setDraft] = useState(ensureCatalogDefaults(catalog));
  const [newThickness, setNewThickness] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);

  const handleSaveSettings = async () => {
    try {
      const safeDraft = ensureCatalogDefaults(draft);
      const response = await api.saveCatalog(safeDraft);
      setCatalog(ensureCatalogDefaults(response?.catalog || safeDraft));
      alert('تنظیمات و قیمت‌ها با موفقیت ثبت شد.');
    } catch (error) {
      console.error('Failed to save catalog to backend.', error);
      alert(error?.message || 'ذخیره تنظیمات روی سرور ناموفق بود.');
    }
  };

  const handleMatrixUpdate = (id, field, value) => {
    setDraft(p => ({ ...p, glasses: p.glasses.map(r => r.id === id ? { ...r, [field]: value } : r) }));
  };

  const handleMatrixPriceUpdate = (id, thk, value) => {
    setDraft(p => ({
      ...p, glasses: p.glasses.map(r => {
        if (r.id === id) {
          const newPrices = { ...r.prices };
          if (value === '') delete newPrices[thk]; else newPrices[thk] = value;
          return { ...r, prices: newPrices };
        }
        return r;
      })
    }));
  };

  const settingsTabs = [
    { id: 'matrix', label: 'Glass Matrix' },
    { id: 'pvbLogic', label: 'Laminated Rules' },
    { id: 'fees', label: 'Fees & Pattern' },
    { id: 'billing', label: 'Billing' },
    { id: 'connectors', label: 'Connectors' },
    { id: 'operations', label: 'Operations' },
    { id: 'jumbo', label: 'Jumbo & Factory' },
  ];

  return (
    <div className="space-y-4 print-hide animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="font-black text-slate-800">پیکربندی کاتالوگ و قیمت‌گذاری</h2>
        <button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 shadow-sm transition-all active:scale-95">
          <Save size={16} /> ثبت تغییرات
        </button>
      </div>
      
      <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto hide-scrollbar gap-1">
        {settingsTabs.map(t => (
          <button key={t.id} onClick={() => setActiveSettingsTab(t.id)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-black transition-all ${activeSettingsTab === t.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        {/* SETTINGS: MATRIX */}
        {activeSettingsTab === 'matrix' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-center border-collapse whitespace-nowrap min-w-max text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                <tr>
                  <th className="p-3 font-black w-12">ردیف</th>
                  <th className="p-3 font-black w-40">نوع شیشه</th>
                  <th className="p-3 font-black w-32">فرآیند</th>
                  {draft.thicknesses.map(thk => (
                    <th key={thk} className="p-2 w-28 group">
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm">
                        <span className="font-black text-slate-700">{toPN(thk)} میل</span>
                        <button onClick={() => setDraft(p => ({...p, thicknesses: p.thicknesses.filter(t => t !== thk)}))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 w-28 align-middle">
                    {isAddingCol ? (
                      <form onSubmit={(e) => { e.preventDefault(); const t = parseInt(newThickness); if(t && !draft.thicknesses.includes(t)) setDraft(p => ({...p, thicknesses: [...p.thicknesses, t].sort((a,b)=>a-b)})); setIsAddingCol(false); setNewThickness(''); }}>
                        <input type="number" autoFocus value={newThickness} onChange={e => setNewThickness(e.target.value)} placeholder="ضخامت" className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs outline-none text-center"/>
                      </form>
                    ) : (
                      <button onClick={() => setIsAddingCol(true)} className="w-full flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg py-1.5 text-xs font-black"><Plus size={14} /> ستون</button>
                    )}
                  </th>
                  <th className="p-3 font-black w-12">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draft.glasses.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 group">
                    <td className="p-2 text-slate-400 font-black tabular-nums">{toPN(index + 1)}</td>
                    <td className="p-2"><input type="text" value={row.title} onChange={e => handleMatrixUpdate(row.id, 'title', e.target.value)} className="w-full bg-transparent outline-none text-center font-black focus:bg-slate-100 py-1.5 rounded-lg"/></td>
                    <td className="p-2">
                      <select value={row.process || 'raw'} onChange={e => handleMatrixUpdate(row.id, 'process', e.target.value)} className={`w-full outline-none text-center font-black py-1.5 rounded-lg border ${(row.process || 'raw') === 'raw' ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                        <option value="raw">خام</option><option value="sekurit">سکوریت</option>
                      </select>
                    </td>
                    {draft.thicknesses.map(thk => (
                      <td key={`${row.id}-${thk}`} className="p-1 focus-within:bg-blue-50/30">
                        <PriceInput value={row.prices[thk] || ''} onChange={(val) => handleMatrixPriceUpdate(row.id, thk, val)} />
                      </td>
                    ))}
                    <td></td>
                    <td className="p-2"><button onClick={() => setDraft(p => ({...p, glasses: p.glasses.filter(r => r.id !== row.id)}))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 mx-auto block"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setDraft(p => ({...p, glasses: [...p.glasses, { id: Date.now().toString(), title: '', process: 'raw', prices: {} }] }))} className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 py-3 mt-4 rounded-xl font-black text-xs flex items-center justify-center gap-2"><Plus size={16}/> افزودن ردیف شیشه</button>
          </div>
        )}

        {/* SETTINGS: PVB LOGIC */}
        {activeSettingsTab === 'pvbLogic' && (
          <div>
            <h3 className="font-black text-sm text-slate-800 mb-4">قوانین محاسبه خودکار طلق لمینت بر اساس مجموع ضخامت</h3>
            <div className="space-y-3 max-w-3xl">
              {draft.pvbLogic.map((rule, i) => (
                <div key={rule.id} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">از مجموع ضخامت (mm)</label>
                    <input type="number" value={rule.minTotalThickness} onChange={e => { const r = [...draft.pvbLogic]; r[i].minTotalThickness = parseInt(e.target.value)||0; setDraft(p=>({...p, pvbLogic: r}))}} className="w-full bg-white border border-slate-200 text-xs font-black p-2 rounded outline-none text-center" dir="ltr"/>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">تا مجموع ضخامت (mm)</label>
                    <input type="number" value={rule.maxTotalThickness} onChange={e => { const r = [...draft.pvbLogic]; r[i].maxTotalThickness = parseInt(e.target.value)||0; setDraft(p=>({...p, pvbLogic: r}))}} className="w-full bg-white border border-slate-200 text-xs font-black p-2 rounded outline-none text-center" dir="ltr"/>
                  </div>
                  <div className="flex-[2]">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">طلق پیشنهادی سیستم</label>
                    <select value={rule.defaultInterlayerId} onChange={e => { const r = [...draft.pvbLogic]; r[i].defaultInterlayerId = e.target.value; setDraft(p=>({...p, pvbLogic: r}))}} className="w-full bg-white border border-slate-200 text-xs font-black p-2.5 rounded outline-none text-indigo-700 cursor-pointer">
                       {draft.connectors.interlayers.map(il => <option key={il.id} value={il.id}>{il.title}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setDraft(p => ({...p, pvbLogic: p.pvbLogic.filter(x => x.id !== rule.id)}))} className="text-red-400 hover:text-red-600 mt-4"><Trash2 size={16}/></button>
                </div>
              ))}
              <button onClick={() => setDraft(p => ({...p, pvbLogic: [...p.pvbLogic, {id: Date.now().toString(), minTotalThickness: 0, maxTotalThickness: 0, defaultInterlayerId: draft.connectors.interlayers[0]?.id}]}))} className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-2 border-2 border-dashed border-indigo-200 py-3 rounded-xl justify-center w-full hover:bg-indigo-50"><Plus size={14}/> افزودن قانون طلق</button>
            </div>
          </div>
        )}

        {/* SETTINGS: FEES */}
        {activeSettingsTab === 'fees' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl space-y-4 shadow-[inset_0_1px_0_rgba(59,130,246,0.08)]">
              <h3 className="font-black text-sm text-slate-800 border-b pb-2">اجرت دوجداره</h3>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                 <select value={draft.fees.doubleGlazing.unit} onChange={e => setDraft(p=>({...p, fees: {...p.fees, doubleGlazing: {...p.fees.doubleGlazing, unit: e.target.value}}}))} className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-bold"><option value="m_square">مساحت (مترمربع)</option><option value="m_length">متر طول (محیط)</option><option value="qty">عدد</option></select>
              </div>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت متغیر (تومان)</label><div className="bg-white border border-slate-300 rounded-lg"><PriceInput value={draft.fees.doubleGlazing.price} onChange={v => setDraft(p => ({...p, fees: {...p.fees, doubleGlazing: {...p.fees.doubleGlazing, price: v}}}))} /></div></div>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت ثابت هر سفارش (تومان)</label><div className="bg-white border border-slate-300 rounded-lg"><PriceInput value={draft.fees.doubleGlazing.fixedOrderPrice} onChange={v => setDraft(p => ({...p, fees: {...p.fees, doubleGlazing: {...p.fees.doubleGlazing, fixedOrderPrice: v}}}))} /></div></div>
            </div>
            <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl space-y-4 shadow-[inset_0_1px_0_rgba(59,130,246,0.08)]">
              <h3 className="font-black text-sm text-slate-800 border-b pb-2">اجرت لمینت</h3>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                 <select value={draft.fees.laminating.unit} onChange={e => setDraft(p=>({...p, fees: {...p.fees, laminating: {...p.fees.laminating, unit: e.target.value}}}))} className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-bold"><option value="m_square">مساحت (مترمربع)</option><option value="m_length">متر طول (محیط)</option><option value="qty">عدد</option></select>
              </div>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت متغیر (تومان)</label><div className="bg-white border border-slate-300 rounded-lg"><PriceInput value={draft.fees.laminating.price} onChange={v => setDraft(p => ({...p, fees: {...p.fees, laminating: {...p.fees.laminating, price: v}}}))} /></div></div>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت ثابت هر سفارش (تومان)</label><div className="bg-white border border-slate-300 rounded-lg"><PriceInput value={draft.fees.laminating.fixedOrderPrice} onChange={v => setDraft(p => ({...p, fees: {...p.fees, laminating: {...p.fees.laminating, fixedOrderPrice: v}}}))} /></div></div>
            </div>
            <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl space-y-4 shadow-[inset_0_1px_0_rgba(59,130,246,0.08)]">
              <h3 className="font-black text-sm text-slate-800 border-b pb-2">هزینه ابزار</h3>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                 <select value={draft.fees.edgeWork?.unit || 'm_length'} onChange={e => setDraft(p => ({...p, fees: {...p.fees, edgeWork: {...(p.fees.edgeWork || { unit: 'm_length', price: 0 }), unit: e.target.value}}}))} className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-bold"><option value="m_length">متر طول (محیط)</option><option value="m_square">مساحت (مترمربع)</option><option value="fixed">قیمت ثابت</option></select>
              </div>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">نرخ ابزار (تومان)</label><div className="bg-white border border-slate-300 rounded-lg"><PriceInput value={draft.fees.edgeWork?.price ?? 0} onChange={v => setDraft(p => ({...p, fees: {...p.fees, edgeWork: {...(p.fees.edgeWork || { unit: 'm_length', price: 0 }), price: v}}}))} /></div></div>
            </div>
            <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl space-y-4 shadow-[inset_0_1px_0_rgba(59,130,246,0.08)]">
              <h3 className="font-black text-sm text-slate-800 border-b pb-2">هزینه الگوکشی</h3>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                 <select value={draft.fees.pattern.unit} onChange={e => setDraft(p=>({...p, fees: {...p.fees, pattern: {...p.fees.pattern, unit: e.target.value}}}))} className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-bold"><option value="order">کل سفارش (ثابت)</option><option value="qty">به ازای هر عدد</option></select>
              </div>
              <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبلغ الگو (تومان)</label><div className="bg-white border border-slate-300 rounded-lg"><PriceInput value={draft.fees.pattern.price} onChange={v => setDraft(p => ({...p, fees: {...p.fees, pattern: {...p.fees.pattern, price: v}}}))} /></div></div>
            </div>
          </div>
        )}

        {activeSettingsTab === 'billing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
            <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl space-y-4">
              <h3 className="font-black text-sm text-slate-800 border-b pb-2">قوانین قیمت‌گذاری</h3>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">درصد کف قیمت نسبت به کاتالوگ</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={draft.billing?.priceFloorPercent ?? 90}
                  onChange={(e) => {
                    const floor = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                    setDraft((p) => ({ ...p, billing: { ...ensureBillingSettings(p), priceFloorPercent: floor } }));
                  }}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-black text-center"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="border border-slate-200 bg-slate-50/70 p-4 rounded-xl space-y-4">
              <h3 className="font-black text-sm text-slate-800 border-b pb-2">مالیات و روش‌های پرداخت</h3>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft.billing?.taxDefaultEnabled)}
                  onChange={(e) => setDraft((p) => ({ ...p, billing: { ...ensureBillingSettings(p), taxDefaultEnabled: e.target.checked } }))}
                />
                اعمال مالیات به‌صورت پیش‌فرض
              </label>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">نرخ مالیات (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draft.billing?.taxRate ?? 10}
                  onChange={(e) => {
                    const taxRate = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                    setDraft((p) => ({ ...p, billing: { ...ensureBillingSettings(p), taxRate } }));
                  }}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-black text-center"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-2">روش‌های پرداخت فعال</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const currentMethods = draft.billing?.paymentMethods || ensureBillingSettings(draft).paymentMethods;
                    const checked = currentMethods.includes(option.value);

                    return (
                      <label key={option.value} className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setDraft((p) => {
                              const billing = ensureBillingSettings(p);
                              const methods = new Set(billing.paymentMethods || []);
                              if (e.target.checked) methods.add(option.value);
                              else methods.delete(option.value);
                              const nextMethods = Array.from(methods);
                              return {
                                ...p,
                                billing: {
                                  ...billing,
                                  paymentMethods: nextMethods.length > 0 ? nextMethods : [PAYMENT_METHOD_OPTIONS[0].value],
                                },
                              };
                            });
                          }}
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS: CONNECTORS */}
        {activeSettingsTab === 'connectors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2"><Layers size={16} className="text-blue-500"/> لیست اسپیسرها</h3>
              <div className="space-y-2">
                {draft.connectors.spacers.map((s, i) => (
                  <div key={s.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input type="text" value={s.title} onChange={e => { const newSp = [...draft.connectors.spacers]; newSp[i].title = e.target.value; setDraft(p => ({...p, connectors: {...p.connectors, spacers: newSp}})); }} className="flex-1 bg-white border border-slate-200 text-xs font-bold p-2 rounded outline-none" />
                    <select value={s.unit || 'm_length'} onChange={e => { const newSp = [...draft.connectors.spacers]; newSp[i].unit = e.target.value; setDraft(p => ({...p, connectors: {...p.connectors, spacers: newSp}})); }} className="bg-white border border-slate-200 text-xs p-2 rounded"><option value="m_length">متر طول</option><option value="m_square">مساحت (مترمربع)</option></select>
                    <div className="w-28 bg-white border border-slate-200 rounded"><PriceInput value={s.price} onChange={v => { const newSp = [...draft.connectors.spacers]; newSp[i].price = v; setDraft(p => ({...p, connectors: {...p.connectors, spacers: newSp}})); }} /></div>
                    <button onClick={() => setDraft(p => ({...p, connectors: {...p.connectors, spacers: p.connectors.spacers.filter(x => x.id !== s.id)}}))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => setDraft(p => ({...p, connectors: {...p.connectors, spacers: [...p.connectors.spacers, {id: Date.now().toString(), title: 'اسپیسر جدید', price: 0, unit: 'm_length'}]}}))} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2"><Plus size={14}/> افزودن اسپیسر</button>
              </div>
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2"><Layers size={16} className="text-indigo-500"/> لیست طلق‌ها</h3>
              <div className="space-y-2">
                {draft.connectors.interlayers.map((s, i) => (
                  <div key={s.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input type="text" value={s.title} onChange={e => { const newSp = [...draft.connectors.interlayers]; newSp[i].title = e.target.value; setDraft(p => ({...p, connectors: {...p.connectors, interlayers: newSp}})); }} className="flex-1 bg-white border border-slate-200 text-xs font-bold p-2 rounded outline-none" />
                    <select value={s.unit || 'm_square'} onChange={e => { const newSp = [...draft.connectors.interlayers]; newSp[i].unit = e.target.value; setDraft(p => ({...p, connectors: {...p.connectors, interlayers: newSp}})); }} className="bg-white border border-slate-200 text-xs p-2 rounded"><option value="m_square">مساحت (مترمربع)</option></select>
                    <div className="w-28 bg-white border border-slate-200 rounded"><PriceInput value={s.price} onChange={v => { const newSp = [...draft.connectors.interlayers]; newSp[i].price = v; setDraft(p => ({...p, connectors: {...p.connectors, interlayers: newSp}})); }} /></div>
                    <button onClick={() => setDraft(p => ({...p, connectors: {...p.connectors, interlayers: p.connectors.interlayers.filter(x => x.id !== s.id)}}))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => setDraft(p => ({...p, connectors: {...p.connectors, interlayers: [...p.connectors.interlayers, {id: Date.now().toString(), title: 'طلق جدید', price: 0, unit: 'm_square'}]}}))} className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-2"><Plus size={14}/> افزودن طلق</button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS: OPERATIONS */}
        {activeSettingsTab === 'operations' && (
          <div>
            <h3 className="font-black text-sm text-slate-800 mb-3">مدیریت خدمات جانبی</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {draft.operations.map((op, i) => (
                <div key={op.id} className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex flex-col gap-2 shadow-sm">
                  <input type="text" value={op.title} onChange={e => { const newOps = [...draft.operations]; newOps[i].title = e.target.value; setDraft(p => ({...p, operations: newOps})); }} className="w-full bg-white border border-slate-200 text-xs font-bold p-2 rounded outline-none" placeholder="عنوان خدمت" />
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-slate-200 rounded"><PriceInput value={op.price} onChange={v => { const newOps = [...draft.operations]; newOps[i].price = v; setDraft(p => ({...p, operations: newOps})); }} /></div>
                    <select value={op.unit || 'qty'} onChange={e => { const newOps = [...draft.operations]; newOps[i].unit = e.target.value; setDraft(p => ({...p, operations: newOps})); }} className="bg-white border border-slate-200 text-xs p-1 rounded font-bold"><option value="qty">عدد</option><option value="m_length">متر طول</option><option value="m_square">مساحت (مترمربع)</option></select>
                  </div>
                  <div className="flex justify-between items-center mt-1 border-t pt-2">
                    <input type="text" value={op.iconFile} onChange={e => { const newOps = [...draft.operations]; newOps[i].iconFile = e.target.value; setDraft(p => ({...p, operations: newOps})); }} className="text-[10px] font-mono bg-white border rounded px-1 py-0.5 w-24" placeholder="icon.svg"/>
                    <button onClick={() => setDraft(p => ({...p, operations: p.operations.filter(x => x.id !== op.id)}))} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setDraft(p => ({...p, operations: [...p.operations, {id: Date.now().toString(), title: 'خدمت جدید', price: 0, unit: 'qty', iconFile: ''}]}))} className="border-2 border-dashed border-slate-300 text-slate-500 rounded-xl flex items-center justify-center gap-1 font-bold text-xs hover:bg-slate-50 min-h-[120px]"><Plus size={16}/> خدمت جدید</button>
            </div>
          </div>
        )}

        {/* SETTINGS: JUMBO & FACTORY */}
        {activeSettingsTab === 'jumbo' && (
          <div className="space-y-8">
            <div>
              <h3 className="font-black text-sm text-slate-800 mb-3 border-b pb-2">محدودیت ابعاد کارخانه (تولید)</h3>
              <div className="flex gap-4 max-w-sm">
                 <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">حداکثر عرض قابل تولید (cm)</label>
                    <input type="number" value={draft.factoryLimits?.maxWidth || 0} onChange={e => setDraft(p=>({...p, factoryLimits: {...(p.factoryLimits||{}), maxWidth: parseInt(e.target.value)||0}}))} className="w-full bg-slate-50 border border-slate-200 text-sm font-black p-2 rounded outline-none text-center" dir="ltr"/>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">حداکثر ارتفاع قابل تولید (cm)</label>
                    <input type="number" value={draft.factoryLimits?.maxHeight || 0} onChange={e => setDraft(p=>({...p, factoryLimits: {...(p.factoryLimits||{}), maxHeight: parseInt(e.target.value)||0}}))} className="w-full bg-slate-50 border border-slate-200 text-sm font-black p-2 rounded outline-none text-center" dir="ltr"/>
                 </div>
              </div>
            </div>

            <div>
              <h3 className="font-black text-sm text-slate-800 mb-3 border-b pb-2">قوانین افزایش قیمت ابعاد ویژه (جامبو)</h3>
              <div className="space-y-3 max-w-4xl">
                {draft.jumboRules.map((rule, i) => (
                  <div key={rule.id} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="w-24">
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">از بُعد (cm)</label>
                      <input type="number" value={rule.minDim} onChange={e => { const r = [...draft.jumboRules]; r[i].minDim = parseInt(e.target.value)||0; setDraft(p=>({...p, jumboRules: r}))}} className="w-full bg-white border border-slate-200 text-xs font-black p-2 rounded outline-none text-center" dir="ltr"/>
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">تا بُعد (0=نامحدود)</label>
                      <input type="number" value={rule.maxDim} onChange={e => { const r = [...draft.jumboRules]; r[i].maxDim = parseInt(e.target.value)||0; setDraft(p=>({...p, jumboRules: r}))}} className="w-full bg-white border border-slate-200 text-xs font-black p-2 rounded outline-none text-center" dir="ltr"/>
                    </div>
                    <div className="w-32">
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">نوع افزایش</label>
                      <select value={rule.type || 'percentage'} onChange={e => { const r = [...draft.jumboRules]; r[i].type = e.target.value; setDraft(p=>({...p, jumboRules: r}))}} className="w-full bg-white border border-slate-200 text-xs font-bold p-2 rounded outline-none">
                         <option value="percentage">درصد (%)</option>
                         <option value="fixed">مبلغ ثابت (تومان)</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">مقدار افزایش</label>
                      <input type="number" value={rule.value || rule.addedPercentage || 0} onChange={e => { const r = [...draft.jumboRules]; r[i].value = parseInt(e.target.value)||0; r[i].addedPercentage = r[i].value; setDraft(p=>({...p, jumboRules: r}))}} className="w-full bg-white border border-slate-200 text-xs font-black p-2 rounded outline-none text-center text-rose-600" dir="ltr"/>
                    </div>
                    <button onClick={() => setDraft(p => ({...p, jumboRules: p.jumboRules.filter(x => x.id !== rule.id)}))} className="text-red-400 hover:text-red-600 mt-4"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button onClick={() => setDraft(p => ({...p, jumboRules: [...p.jumboRules, {id: Date.now().toString(), minDim: 0, maxDim: 0, type: 'percentage', value: 0}]}))} className="text-xs font-bold text-blue-600 flex items-center gap-1 border border-blue-200 p-2 rounded-lg bg-blue-50 hover:bg-blue-100"><Plus size={14}/> افزودن قانون جدید</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


