import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Ruler, Plus, Settings, Layers, Flame, 
  Trash2, Edit3, Printer, CheckCircle2,
  X, UploadCloud, MapPin, FileBox, Save, Store, User, Phone,
  Search, Eye, Archive, ShieldAlert, Briefcase, ChevronDown, ChevronUp, LogOut, Lock, ArrowRight, Menu
} from 'lucide-react';

// --- UTILS ---
const FACTORY_ADDRESS = 'مشهد، خین‌عرب، بین طرح چی 11 و 13، پرهام';
const FACTORY_PHONES = '۰۹۰۴۷۰۷۹۸۶۹ - ۰۹۱۵۸۷۸۸۸۴۶';

const toPN = (num) => {
  if (num === undefined || num === null) return '';
  return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
};

const generateOrderCode = (items, source = 'customer', dailySeq = 1) => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: '2-digit', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(d);
  const yy = parts.find(p => p.type === 'year')?.value || '00';
  const mm = parts.find(p => p.type === 'month')?.value || '00';
  const dd = parts.find(p => p.type === 'day')?.value || '00';
  const dateStr = `${yy}${mm}${dd}`;

  const hasPattern = items.some(i => i.pattern?.type === 'upload' || i.pattern?.type === 'carton') ? 1 : 0;
  const isAdmin = source === 'admin' ? 1 : 0;
  const seqStr = String(dailySeq).padStart(3, '0');

  const baseString = `${dateStr}${hasPattern}${isAdmin}${seqStr}`;
  let sum = 0;
  for (let i = 0; i < baseString.length; i++) sum += parseInt(baseString[i], 10) || 0;
  const k = sum % 10;

  return `${dateStr}-${hasPattern}${isAdmin}-${seqStr}-${k}`;
};

// --- INITIAL MOCK DATABASE (ERP STATE) ---
const initialCatalog = {
  roundStep: 1000,
  factoryLimits: { maxWidth: 321, maxHeight: 600 },
  thicknesses: [4, 5, 6, 8, 10, 12],
  glasses: [
    { id: '1', title: 'فلوت', process: 'raw', prices: { 4: 120000, 5: 150000, 6: 180000, 8: 250000, 10: 320000 } },
    { id: '2', title: 'فلوت', process: 'sekurit', prices: { 4: 180000, 5: 220000, 6: 270000, 8: 380000, 10: 480000 } },
    { id: '3', title: 'سوپر کلیر', process: 'raw', prices: { 4: 160000, 5: 200000, 6: 240000 } },
    { id: '4', title: 'سوپر کلیر', process: 'sekurit', prices: { 4: 240000, 5: 300000, 6: 360000 } },
    { id: '5', title: 'برنز', process: 'raw', prices: { 4: 140000, 6: 210000 } },
  ],
  connectors: {
    spacers: [
      { id: 'sp10', title: 'اسپیسر 10', price: 20000, unit: 'm_length' },
      { id: 'sp12', title: 'اسپیسر 12', price: 25000, unit: 'm_length' },
      { id: 'sp14', title: 'اسپیسر 14', price: 30000, unit: 'm_length' }
    ],
    interlayers: [
      { id: 'pvb038', title: 'طلق PVB 0.38', price: 180000, unit: 'm_square' },
      { id: 'pvb076', title: 'طلق PVB 0.76', price: 350000, unit: 'm_square' },
      { id: 'eva_smart', title: 'طلق هوشمند', price: 8000000, unit: 'm_square' }
    ]
  },
  operations: [
    { id: 'op_hole1', title: 'سوراخ مته ۲۰', price: 15000, unit: 'qty', iconFile: 'hole1.svg', isActive: true, sortOrder: 1 },
    { id: 'op_hole2', title: 'سوراخ گردبر ۵۰', price: 25000, unit: 'qty', iconFile: 'hole2.svg', isActive: true, sortOrder: 2 },
    { id: 'op_hinge1', title: 'جاساز لولا دیوار', price: 50000, unit: 'qty', iconFile: 'hinge1.svg', isActive: true, sortOrder: 3 },
    { id: 'op_other1', title: 'جاساز قفل کمری', price: 45000, unit: 'qty', iconFile: 'other1.svg', isActive: true, sortOrder: 4 }
  ],
  fees: {
    doubleGlazing: { price: 80000, unit: 'm_square', fixedOrderPrice: 50000 },
    laminating: { price: 120000, unit: 'm_square', fixedOrderPrice: 70000 },
    pattern: { price: 150000, unit: 'order' }
  },
  pvbLogic: [
    { id: 'pvbL1', minTotalThickness: 0, maxTotalThickness: 10, defaultInterlayerId: 'pvb038' },
    { id: 'pvbL2', minTotalThickness: 11, maxTotalThickness: 20, defaultInterlayerId: 'pvb076' }
  ],
  jumboRules: [
    { id: 'j1', minDim: 250, maxDim: 320, type: 'percentage', value: 15 },
    { id: 'j2', minDim: 321, maxDim: 0, type: 'fixed', value: 500000 }
  ]
};

// --- MOCK ORDERS ---
const initialOrders = [
  { 
    id: '1001', 
    orderCode: '021105-00-001-4',
    customerName: 'محمد رضایی', 
    phone: '09121112222', 
    date: '1402/11/05', 
    total: 2150000, 
    status: 'pending', 
    items: [
      { id: '1', title: 'شیشه تک جداره', dimensions: { width: 100, height: 100, count: 2 }, totalPrice: 2150000, unitPrice: 1075000, activeTab: 'single', config: { thick: 6, isSekurit: true, hasEdge: true, glassId: '2' }, operations: {'op_hole1': 1}, pattern: {type: 'none'} }
    ]
  }
];

const PriceInput = ({ value, onChange, placeholder = "-" }) => {
  const displayValue = value ? value.toLocaleString() : '';
  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '').replace(/\D/g, '');
    onChange(raw ? parseInt(raw, 10) : '');
  };
  return (
    <input type="text" value={toPN(displayValue)} onChange={handleChange} placeholder={placeholder} className="w-full h-full text-center outline-none bg-transparent font-bold text-blue-700 placeholder-slate-300 focus:bg-blue-50/50 py-2 rounded-lg" dir="ltr" />
  );
};

// --- SHARED COMPONENTS ---
const StructureDetails = ({ item, catalog }) => {
    const opsKeys = Object.keys(item.operations || {});
    const hasPattern = item?.pattern?.type && item.pattern.type !== 'none';
    const hasServices = opsKeys.length > 0 || hasPattern;
  
    const getGlassLabel = (layer) => {
      const glass = catalog.glasses.find(g => g.id === layer.glassId) || catalog.glasses[0];
      return `${glass?.title || 'فلوت'} ${toPN(layer.thick)}mm`;
    };
  
    return (
      <div className="space-y-1">
        {item.activeTab === 'single' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 font-black">۱-</span>
            <span className={item.config.isSekurit ? 'text-rose-600 font-black' : 'text-slate-700 font-black'}>
              {getGlassLabel(item.config)}
            </span>
            {item.config.isSekurit && <span className="bg-rose-100 text-rose-700 px-1 rounded text-[8px] font-black mr-1">سکوریت</span>}
            {item.config.hasEdge && <span className="bg-indigo-100 text-indigo-700 px-1 rounded text-[8px] font-black mr-1">ابزار</span>}
          </div>
        )}
  
        {item.activeTab === 'double' && (
          <>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 font-black">۱-</span>
              <span className={item.config.pane1.glass1?.isSekurit && !item.config.pane1.isLaminated ? 'text-rose-600 font-black' : 'text-slate-700 font-black'}>
                {item.config.pane1.isLaminated ? 'لمینت' : getGlassLabel(item.config.pane1.glass1)}
              </span>
              {!item.config.pane1.isLaminated && item.config.pane1.glass1?.isSekurit && <span className="bg-rose-100 text-rose-700 px-1 rounded text-[8px] font-black mr-1">سکوریت</span>}
              {!item.config.pane1.isLaminated && item.config.pane1.glass1?.hasEdge && <span className="bg-indigo-100 text-indigo-700 px-1 rounded text-[8px] font-black mr-1">ابزار</span>}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 py-0.5 pr-5">
               <Layers size={10} className="opacity-50"/> 
               {catalog.connectors.spacers.find(s => s.id === item.config.spacerId)?.title || 'اسپیسر'}
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 font-black">۲-</span>
              <span className={item.config.pane2.glass1?.isSekurit && !item.config.pane2.isLaminated ? 'text-rose-600 font-black' : 'text-slate-700 font-black'}>
                {item.config.pane2.isLaminated ? 'لمینت' : getGlassLabel(item.config.pane2.glass1)}
              </span>
              {!item.config.pane2.isLaminated && item.config.pane2.glass1?.isSekurit && <span className="bg-rose-100 text-rose-700 px-1 rounded text-[8px] font-black mr-1">سکوریت</span>}
              {!item.config.pane2.isLaminated && item.config.pane2.glass1?.hasEdge && <span className="bg-indigo-100 text-indigo-700 px-1 rounded text-[8px] font-black mr-1">ابزار</span>}
            </div>
          </>
        )}
  
        {item.activeTab === 'laminate' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 font-black">-</span>
            <span className="text-slate-700 font-black">شیشه لمینت ({toPN(item.config.glass1.thick)} + {toPN(item.config.glass2.thick)})</span>
          </div>
        )}
  
        {hasServices && (
          <div className="pt-1.5 mt-1.5 border-t border-slate-200/70 border-dashed text-amber-600/90 text-[10px] space-y-0.5 flex flex-wrap gap-2">
            {opsKeys.map((serviceId) => {
              const title = catalog.operations.find(o => o.id === serviceId)?.title || 'خدمت';
              return <div key={serviceId}>+ {title}</div>;
            })}
            {hasPattern && (
              <div>+ الگو ({item.pattern.type === 'upload' ? 'فایل پیوست' : 'کارتن'})</div>
            )}
          </div>
        )}
      </div>
    );
  };

// ==========================================
// PRICING ENGINE (ISOLATED CUSTOM HOOK)
// ==========================================
const usePricingCalculator = (dimensions, activeTab, config, catalog) => {
  const validationErrors = useMemo(() => {
    const errors = [];
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const maxLimits = catalog.factoryLimits;
    if (maxLimits && ((w > maxLimits.maxWidth && h > maxLimits.maxHeight) || (w > maxLimits.maxHeight && h > maxLimits.maxWidth))) {
      errors.push(`ابعاد از حداکثر ظرفیت کارخانه (${maxLimits.maxWidth}×${maxLimits.maxHeight}) بیشتر است.`);
    }
    return errors;
  }, [dimensions, catalog.factoryLimits]);

  const pricingDetails = useMemo(() => {
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const count = parseInt(dimensions.count) || 1;
    const effectiveArea = w > 0 && h > 0 ? Math.max(0.25, (w * h) / 10000) : 0;
    const perimeter = w > 0 && h > 0 ? (2 * (w + h)) / 100 : 0;

    if (effectiveArea === 0 || count < 1 || validationErrors.length > 0) return { unitPrice: 0, total: 0 };

    let unitTotal = 0;
    const getGlassPrice = (gId, thk, isSek) => {
      const glass = catalog.glasses.find(g => g.id === gId) || catalog.glasses[0];
      const p = glass?.prices[thk] || 0;
      return p * (isSek ? 1.5 : 1);
    };

    const calcPane = (pane) => {
      if (!pane.isLaminated) return getGlassPrice(pane.glass1.glassId, pane.glass1.thick, pane.glass1.isSekurit) * effectiveArea;
      const g1 = getGlassPrice(pane.glass1.glassId, pane.glass1.thick, pane.glass1.isSekurit) * effectiveArea;
      const g2 = getGlassPrice(pane.glass2.glassId, pane.glass2.thick, pane.glass2.isSekurit) * effectiveArea;
      const pvbUnit = catalog.connectors.interlayers.find(i => i.id === pane.interlayerId)?.unit || 'm_square';
      const pvbPriceBase = catalog.connectors.interlayers.find(i => i.id === pane.interlayerId)?.price || 0;
      const pvbPrice = pvbUnit === 'm_square' ? pvbPriceBase * effectiveArea : pvbPriceBase;
      const asmUnit = catalog.fees.laminating.unit || 'm_square';
      const asmPrice = asmUnit === 'm_square' ? catalog.fees.laminating.price * effectiveArea : catalog.fees.laminating.price;
      return g1 + g2 + pvbPrice + asmPrice + catalog.fees.laminating.fixedOrderPrice;
    };

    if (activeTab === 'single') unitTotal += calcPane({ isLaminated: false, glass1: config.single });
    else if (activeTab === 'double') {
      unitTotal += calcPane(config.double.pane1) + calcPane(config.double.pane2);
      const spacerUnit = catalog.connectors.spacers.find(s => s.id === config.double.spacerId)?.unit || 'm_length';
      const spacerPriceBase = catalog.connectors.spacers.find(s => s.id === config.double.spacerId)?.price || 0;
      unitTotal += spacerUnit === 'm_length' ? spacerPriceBase * perimeter : spacerPriceBase * effectiveArea;
      const dblUnit = catalog.fees.doubleGlazing.unit || 'm_square';
      unitTotal += dblUnit === 'm_square' ? catalog.fees.doubleGlazing.price * effectiveArea : catalog.fees.doubleGlazing.price;
      unitTotal += catalog.fees.doubleGlazing.fixedOrderPrice;
    } else if (activeTab === 'laminate') {
      unitTotal += calcPane({ isLaminated: true, ...config.laminate });
    }

    Object.entries(config.operations || {}).forEach(([opId, qty]) => {
      const op = catalog.operations.find(o => o.id === opId);
      if(op) unitTotal += op.unit === 'qty' ? op.price * qty : op.price * effectiveArea;
    });
    
    if (config.pattern?.type && config.pattern.type !== 'none') {
      const patUnit = catalog.fees.pattern.unit || 'order';
      unitTotal += patUnit === 'qty' ? catalog.fees.pattern.price * count : catalog.fees.pattern.price;
    }

    const maxDim = Math.max(w, h);
    const applicableJumbo = catalog.jumboRules.filter(r => maxDim >= r.minDim && (r.maxDim === 0 || maxDim <= r.maxDim)).sort((a,b) => b.addedPercentage - a.addedPercentage)[0];
    if (applicableJumbo) {
      if(applicableJumbo.type === 'fixed') unitTotal += applicableJumbo.value;
      else unitTotal += unitTotal * (applicableJumbo.value / 100);
    }

    const roundedUnitPrice = Math.ceil(unitTotal / catalog.roundStep) * catalog.roundStep;
    return { unitPrice: roundedUnitPrice, total: roundedUnitPrice * count, effectiveArea };
  }, [dimensions, activeTab, config, catalog, validationErrors]);

  return { validationErrors, pricingDetails };
};

// ==========================================
// 1. ADMIN COMPONENTS (REFACTORED)
// ==========================================

// --- 1.1 ADMIN SETTINGS VIEW ---
const AdminSettingsView = ({ catalog, setCatalog }) => {
    const [activeSettingsTab, setActiveSettingsTab] = useState('matrix');
    const [draft, setDraft] = useState(JSON.parse(JSON.stringify(catalog)));
    const [newThickness, setNewThickness] = useState('');
    const [isAddingCol, setIsAddingCol] = useState(false);
  
    const handleSaveSettings = () => {
      setCatalog(draft);
      alert('تنظیمات و قیمت‌ها با موفقیت در سیستم ثبت شد.');
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
      { id: 'matrix', label: 'ماتریس شیشه‌ها' },
      { id: 'pvbLogic', label: 'قوانین طلق (لمینت)' },
      { id: 'fees', label: 'اجرت‌ها و الگو' },
      { id: 'connectors', label: 'متعلقات (اسپیسر/طلق)' },
      { id: 'operations', label: 'خدمات (CNC/جاساز)' },
      { id: 'jumbo', label: 'تنظیمات جامبو و کارخانه' },
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
                        <select value={row.process} onChange={e => handleMatrixUpdate(row.id, 'process', e.target.value)} className={`w-full outline-none text-center font-black py-1.5 rounded-lg border ${row.process === 'raw' ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                <h3 className="font-black text-sm text-slate-800 border-b pb-2">اجرت دوجداره</h3>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                   <select value={draft.fees.doubleGlazing.unit} onChange={e => setDraft(p=>({...p, fees: {...p.fees, doubleGlazing: {...p.fees.doubleGlazing, unit: e.target.value}}}))} className="w-full border p-2 rounded text-xs font-bold"><option value="m_square">مساحت (مترمربع)</option><option value="m_length">متر طول (محیط)</option><option value="qty">عدد</option></select>
                </div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت متغیر (تومان)</label><PriceInput value={draft.fees.doubleGlazing.price} onChange={v => setDraft(p => ({...p, fees: {...p.fees, doubleGlazing: {...p.fees.doubleGlazing, price: v}}}))} /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت ثابت هر سفارش (تومان)</label><PriceInput value={draft.fees.doubleGlazing.fixedOrderPrice} onChange={v => setDraft(p => ({...p, fees: {...p.fees, doubleGlazing: {...p.fees.doubleGlazing, fixedOrderPrice: v}}}))} /></div>
              </div>
              <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                <h3 className="font-black text-sm text-slate-800 border-b pb-2">اجرت لمینت</h3>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                   <select value={draft.fees.laminating.unit} onChange={e => setDraft(p=>({...p, fees: {...p.fees, laminating: {...p.fees.laminating, unit: e.target.value}}}))} className="w-full border p-2 rounded text-xs font-bold"><option value="m_square">مساحت (مترمربع)</option><option value="m_length">متر طول (محیط)</option><option value="qty">عدد</option></select>
                </div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت متغیر (تومان)</label><PriceInput value={draft.fees.laminating.price} onChange={v => setDraft(p => ({...p, fees: {...p.fees, laminating: {...p.fees.laminating, price: v}}}))} /></div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">اجرت ثابت هر سفارش (تومان)</label><PriceInput value={draft.fees.laminating.fixedOrderPrice} onChange={v => setDraft(p => ({...p, fees: {...p.fees, laminating: {...p.fees.laminating, fixedOrderPrice: v}}}))} /></div>
              </div>
              <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                <h3 className="font-black text-sm text-slate-800 border-b pb-2">هزینه الگوکشی</h3>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبنای محاسبه</label>
                   <select value={draft.fees.pattern.unit} onChange={e => setDraft(p=>({...p, fees: {...p.fees, pattern: {...p.fees.pattern, unit: e.target.value}}}))} className="w-full border p-2 rounded text-xs font-bold"><option value="order">کل سفارش (ثابت)</option><option value="qty">به ازای هر عدد</option></select>
                </div>
                <div><label className="text-[10px] text-slate-500 font-bold block mb-1">مبلغ الگو (تومان)</label><PriceInput value={draft.fees.pattern.price} onChange={v => setDraft(p => ({...p, fees: {...p.fees, pattern: {...p.fees.pattern, price: v}}}))} /></div>
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
  
// --- 1.2 ADMIN ORDERS VIEW ---
const AdminOrdersView = ({ orders, setOrders, catalog, onEditOrder }) => {
    const [activeOrdersTab, setActiveOrdersTab] = useState('all'); 
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [viewingOrder, setViewingOrder] = useState(null);
  
    const updateOrderStatus = (id, status) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    };
  
    const handleArchiveOrder = (id) => {
      updateOrderStatus(id, 'archived');
      if(expandedOrderId === id) setExpandedOrderId(null);
    };
  
    const toggleOrderExpansion = (id) => {
      setExpandedOrderId(prev => prev === id ? null : id);
    };
  
    const filteredOrders = orders.filter(o => {
      const matchesTab = activeOrdersTab === 'all' ? o.status !== 'archived' : o.status === activeOrdersTab;
      const matchesSearch = o.customerName.includes(searchQuery) || o.phone.includes(searchQuery) || (o.orderCode || '').includes(searchQuery);
      return matchesTab && matchesSearch;
    });
  
    return (
      <div className="space-y-4 print-hide animate-in slide-in-from-left-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar gap-1">
             {[
               {id: 'all', label: 'همه سفارش‌ها'}, 
               {id: 'pending', label: 'در انتظار'}, 
               {id: 'processing', label: 'در حال تولید'}, 
               {id: 'delivered', label: 'تحویل شده'},
               {id: 'archived', label: 'آرشیو'}
             ].map(t => (
               <button key={t.id} onClick={() => setActiveOrdersTab(t.id)} className={`whitespace-nowrap px-3 py-2 text-[11px] sm:text-xs font-bold rounded-md transition-all ${activeOrdersTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
             ))}
          </div>
          <div className="relative w-full md:w-72 shrink-0">
            <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="جستجو کد، نام یا موبایل..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-4 py-2 text-xs font-bold outline-none focus:border-blue-400" />
          </div>
        </div>
  
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-black text-center border-l border-slate-100 w-10">ردیف</th>
                  <th className="p-3 font-black text-center border-l border-slate-100">کد رهگیری</th>
                  <th className="p-3 font-black border-l border-slate-100">نام مشتری</th>
                  <th className="p-3 font-black border-l border-slate-100">موبایل</th>
                  <th className="p-3 font-black text-center border-l border-slate-100">تاریخ ثبت</th>
                  <th className="p-3 font-black text-center border-l border-slate-100">مبلغ کل (تومان)</th>
                  <th className="p-3 font-black text-center border-l border-slate-100">وضعیت</th>
                  <th className="p-3 font-black text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-bold">هیچ سفارشی یافت نشد.</td></tr>
                ) : filteredOrders.map((o, index) => (
                  <React.Fragment key={o.id}>
                    <tr className={`hover:bg-slate-50 transition-colors ${o.status === 'archived' ? 'opacity-50 grayscale' : ''} ${expandedOrderId === o.id ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-3 text-center font-bold text-slate-400 border-l border-slate-50 tabular-nums">{toPN(index+1)}</td>
                      <td className="p-3 text-center font-black text-blue-700 tabular-nums border-l border-slate-50 tracking-wider" dir="ltr">{toPN(o.orderCode)}</td>
                      <td className="p-3 font-black text-slate-800 border-l border-slate-50">{o.customerName} <span className="text-[10px] text-slate-400 font-normal mr-1">({toPN(Array.isArray(o.items) ? o.items.length : o.items)} قلم)</span></td>
                      <td className="p-3 font-bold text-slate-600 tabular-nums border-l border-slate-50" dir="ltr">{toPN(o.phone)}</td>
                      <td className="p-3 text-center font-bold text-slate-500 border-l border-slate-50">{toPN(o.date)}</td>
                      <td className="p-3 text-center font-black text-slate-900 tabular-nums border-l border-slate-50">{toPN(o.total.toLocaleString())}</td>
                      <td className="p-3 text-center border-l border-slate-50">
                         {o.status === 'archived' ? (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">آرشیو شده</span>
                         ) : (
                           <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className={`text-[10px] font-black px-2 py-1.5 rounded-md outline-none cursor-pointer appearance-none text-center ${o.status === 'pending' ? 'bg-amber-100 text-amber-700' : o.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              <option value="pending">در انتظار</option>
                              <option value="processing">در حال تولید</option>
                              <option value="delivered">تحویل شده</option>
                           </select>
                         )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                           <button onClick={() => toggleOrderExpansion(o.id)} className={`p-1.5 rounded transition-colors ${expandedOrderId === o.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50'}`} title="مشاهده آیتم‌ها">
                             {expandedOrderId === o.id ? <ChevronUp size={14}/> : <ChevronDown size={14} />}
                           </button>
                           {o.status !== 'archived' && (
                             <>
                               <button onClick={() => onEditOrder(o)} className="text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 p-1.5 rounded transition-colors" title="ویرایش سفارش"><Edit3 size={14} /></button>
                               <button onClick={() => handleArchiveOrder(o.id)} className="text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-1.5 rounded transition-colors" title="بایگانی"><Archive size={14} /></button>
                             </>
                           )}
                           {o.status === 'archived' && (
                             <button onClick={() => updateOrderStatus(o.id, 'pending')} className="text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-1.5 rounded text-[10px] font-bold transition-colors">بازیابی</button>
                           )}
                        </div>
                      </td>
                    </tr>
                    {/* ACCORDION EXPANDED DETAILS */}
                    {expandedOrderId === o.id && (
                      <tr className="bg-slate-50/80 animate-in fade-in">
                        <td colSpan="8" className="p-0 border-b-2 border-slate-200">
                           <div className="p-4 m-3 bg-white rounded-xl shadow-inner border border-slate-200">
                              <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                 <span className="font-black text-sm text-slate-800">ریز اقلام سفارش</span>
                                 <button onClick={() => { setViewingOrder(o); setTimeout(()=> window.print(), 100); }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex gap-1 items-center font-bold shadow-sm transition-colors"><Printer size={12}/> چاپ برای تولید</button>
                              </div>
                              <table className="w-full text-right text-sm border-collapse mt-2">
                                  <thead className="bg-slate-50 text-slate-500 text-xs border-y border-slate-200 rounded-lg">
                                      <tr>
                                          <th className="p-2 font-bold w-12 text-center border-l border-slate-200/50">ردیف</th>
                                          <th className="p-2 font-bold w-36 border-l border-slate-200/50">نوع ساختار</th>
                                          <th className="p-2 font-bold border-l border-slate-200/50">پیکربندی و خدمات</th>
                                          <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">ابعاد (cm)</th>
                                          <th className="p-2 font-bold w-16 text-center border-l border-slate-200/50">تعداد</th>
                                          <th className="p-2 font-bold w-28 text-center border-l border-slate-200/50">فی نهایی (تومان)</th>
                                          <th className="p-2 font-bold w-32 text-left pl-4">مبلغ کل (تومان)</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {Array.isArray(o.items) && o.items.map((item, ii) => (
                                          <tr key={item.id} className="hover:bg-blue-50/20 transition-colors even:bg-slate-50/50">
                                              <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 tabular-nums">{toPN(ii+1)}</td>
                                              <td className="p-2 border-l border-slate-100"><span className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-[9px] font-black whitespace-nowrap shadow-sm">{item.title}</span></td>
                                              <td className="p-2 border-l border-slate-100"><StructureDetails item={item} catalog={catalog} /></td>
                                              <td className="p-2 text-center font-bold text-slate-600 border-l border-slate-100 tabular-nums" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
                                              <td className="p-2 text-center font-black text-slate-800 tabular-nums">{toPN(item.dimensions.count)}</td>
                                              <td className="p-2 text-center font-bold text-slate-500 border-l border-slate-100 tabular-nums">{toPN(item.unitPrice.toLocaleString())}</td>
                                              <td className="p-2 text-left pl-4 font-black text-slate-900 bg-blue-50/30 text-[13px] tabular-nums">{toPN(item.totalPrice.toLocaleString())}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  
        {/* --- HIDDEN PRINT TEMPLATE FOR ADMIN (PRODUCTION INVOICE) --- */}
        {viewingOrder && (
          <div className="printable-area hidden print:block bg-white p-6" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
            <div className="flex justify-between items-start border-b-[2px] border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">گلس دیزاین <span className="text-slate-400 font-normal">| Sitra</span></h1>
                        <p className="text-xs font-bold mt-1 text-slate-600">برگه سفارش تولید (نسخه کارخانه)</p>
                    </div>
                </div>
                <div className="text-left text-xs font-bold space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[180px]">
                    <div className="flex justify-between gap-4"><span className="text-slate-500">تاریخ:</span> <span>{toPN(viewingOrder.date)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">مشتری:</span> <span>{viewingOrder.customerName}</span></div>
                    <div className="flex justify-between gap-4 border-t pt-1 mt-1"><span className="text-slate-500">کد رهگیری:</span> <span className="tabular-nums text-slate-900 font-black tracking-wider" dir="ltr">{toPN(viewingOrder.orderCode)}</span></div>
                </div>
            </div>
  
            <table className="w-full text-right border-collapse border border-slate-300 mb-6 text-xs">
                <thead className="bg-slate-100 text-slate-700">
                    <tr>
                        <th className="border border-slate-300 p-2 w-10 text-center">ردیف</th>
                        <th className="border border-slate-300 p-2 w-24">نوع ساختار</th>
                        <th className="border border-slate-300 p-2 text-right">جزئیات فنی و پیکربندی</th>
                        <th className="border border-slate-300 p-2 w-24 text-center">ابعاد (cm)</th>
                        <th className="border border-slate-300 p-2 w-12 text-center">تعداد</th>
                    </tr>
                </thead>
                <tbody className="text-slate-800">
                    {Array.isArray(viewingOrder.items) && viewingOrder.items.map((item, i) => (
                        <tr key={item.id} className="even:bg-slate-50/70 break-inside-avoid">
                            <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(i+1)}</td>
                            <td className="border border-slate-300 p-2 font-black align-top">{item.title}</td>
                            <td className="border border-slate-300 p-2 align-top">
                              <StructureDetails item={item} catalog={catalog} />
                            </td>
                            <td className="border border-slate-300 p-2 font-bold tabular-nums text-center align-top" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
                            <td className="border border-slate-300 p-2 font-black tabular-nums text-center align-top">{toPN(item.dimensions.count)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
  
            <div className="flex justify-between items-end mb-4 break-inside-avoid">
                <div className="w-1/2 p-3 text-[10px] font-bold text-slate-500 space-y-1.5 border border-slate-200 rounded-xl bg-slate-50">
                    <p className="text-slate-700">ملاحظات تولید:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>برش و تولید دقیقاً مطابق با ابعاد و پیکربندی درج شده انجام شود.</li>
                        <li>در صورت وجود الگو (فایل یا کارتن)، تطبیق نهایی الزامی است.</li>
                    </ul>
                </div>
            </div>
          </div>
        )}
      </div>
    );
  };

// --- 1.3 ADMIN PANEL (ROUTER) ---
const AdminPanel = ({ catalog, setCatalog, orders, setOrders, onEditOrder, userRole }) => {
  const [mainView, setMainView] = useState('orders'); // 'orders' | 'settings'

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <div className="flex bg-white rounded-2xl border border-slate-200 shadow-sm p-2 gap-2 print-hide">
        <button onClick={() => setMainView('orders')} className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${mainView === 'orders' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Briefcase size={18}/> مدیریت سفارشات
        </button>
        {userRole === 'manager' && (
          <button onClick={() => setMainView('settings')} className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${mainView === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Settings size={18}/> تنظیمات سیستم و قیمت‌ها
          </button>
        )}
      </div>

      {mainView === 'settings' && userRole === 'manager' && (
        <AdminSettingsView catalog={catalog} setCatalog={setCatalog} />
      )}

      {mainView === 'orders' && (
        <AdminOrdersView orders={orders} setOrders={setOrders} catalog={catalog} onEditOrder={onEditOrder} />
      )}
    </div>
  );
};


// ==========================================
// 2. ORDER FORM COMPONENT (Customer View)
// ==========================================
const SettingsModal = ({ setModalMode, config, setConfig, catalog }) => {
  const [view, setView] = useState('main');
  const [selectedServices, setSelectedServices] = useState({ ...config.operations });
  const [pattern, setPattern] = useState({ ...config.pattern });
  
  const fileInputRef = useRef(null);

  const toggleService = (id) => {
    setSelectedServices(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = 1; 
      return next;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) return alert('حجم فایل نباید بیشتر از 700 کیلوبایت باشد.');
    const reader = new FileReader();
    reader.onload = () => setPattern({ type: 'upload', fileName: file.name, previewDataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setConfig(prev => ({ ...prev, operations: { ...selectedServices }, pattern: { ...pattern } }));
    setModalMode(null);
  };

  if (view === 'catalog') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[60] flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
        <div className="bg-white w-full max-w-3xl rounded-2xl flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95">
          <div className="flex justify-between p-4 border-b border-slate-100"><h2 className="text-sm font-black">انتخاب خدمات و جاساز</h2><button onClick={()=>setView('main')} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800"><X size={18}/></button></div>
          <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {catalog.operations.map(service => (
              <div key={service.id} onClick={() => toggleService(service.id)} className={`cursor-pointer bg-white border-2 rounded-xl flex flex-col transition-all ${selectedServices[service.id] ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="h-20 flex items-center justify-center relative p-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">{service.title.charAt(0)}</div>
                  {selectedServices[service.id] && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5"><CheckCircle2 size={12}/></div>}
                </div>
                <div className="p-2 text-center text-[10px] font-bold border-t border-slate-100 text-slate-700">{service.title}</div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100"><button onClick={()=>setView('main')} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-3 rounded-xl text-sm font-black shadow-md">تایید انتخاب‌ها</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <div className="bg-white w-full max-w-xl rounded-2xl flex flex-col shadow-2xl animate-in fade-in">
        <div className="flex justify-between items-center p-4 border-b border-slate-100"><h2 className="text-base font-black text-slate-800">خدمات جانبی و الگو</h2><button onClick={()=>setModalMode(null)} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800"><X size={20}/></button></div>
        <div className="p-5 space-y-5">
          
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-800">۱. خدمات و جاساز</h3>
              {Object.keys(selectedServices).length > 0 && <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{toPN(Object.keys(selectedServices).length)} مورد انتخاب شده</span>}
            </div>
            
            {Object.keys(selectedServices).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.keys(selectedServices).map(id => {
                  const title = catalog.operations.find(o => o.id === id)?.title || 'خدمت ناشناس';
                  return (
                    <div key={id} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
                      <span className="text-xs font-bold text-slate-700 before:content-['•'] before:mr-1 before:text-blue-400 before:ml-2">{title}</span>
                      <button onClick={() => toggleService(id)} className="text-red-400 hover:text-white hover:bg-red-500 p-1.5 bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button onClick={() => setView('catalog')} className="w-full border-2 border-dashed border-blue-300 text-blue-600 bg-white hover:bg-blue-50 py-3 rounded-xl text-xs font-black flex justify-center items-center gap-2 transition-colors"><Plus size={16}/> انتخاب / ویرایش سوراخ‌ها و جاسازها</button>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 mb-4">۲. نقشه یا الگو</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => setPattern({ type: 'none', fileName: '' })} className={`py-3.5 rounded-xl text-xs font-bold border transition-all ${pattern.type === 'none' ? 'border-slate-800 shadow-md bg-white text-slate-800 ring-2 ring-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>سفارش فاقد الگو (ابعاد مشخص است)</button>
              <div className="flex gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.dwg,.dxf,.jpg,.png" />
                <button onClick={() => fileInputRef.current?.click()} className={`flex-1 py-3.5 border rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${pattern.type === 'upload' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-2 ring-blue-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2"><UploadCloud size={18}/> آپلود فایل نقشه</div>
                  {pattern.type === 'upload' && pattern.fileName && <span className="text-[9px] font-mono text-blue-500 truncate w-32 text-center bg-white px-2 py-0.5 rounded-full border border-blue-100">{pattern.fileName}</span>}
                </button>
                <button onClick={() => setPattern({ type: 'carton', fileName: '' })} className={`flex-1 py-3.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${pattern.type === 'carton' ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-md ring-2 ring-amber-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><FileBox size={18}/> ارسال فیزیکی الگو</button>
              </div>
              
              {pattern.type === 'carton' && (
                <div className="mt-3 bg-white border-2 border-amber-300 rounded-xl p-4 flex gap-4 items-center shadow-sm animate-in slide-in-from-top-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0"><MapPin size={24} /></div>
                  <div className="text-xs text-slate-700 leading-relaxed font-bold">
                    <span className="block text-amber-600 mb-1 text-[10px] font-black tracking-wide">آدرس کارخانه جهت ارسال فیزیکی (کارتن/شابلون):</span>
                    {FACTORY_ADDRESS}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl"><button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white py-3.5 rounded-xl text-sm font-black shadow-lg">تایید و ثبت در ردیف سفارش</button></div>
      </div>
    </div>
  );
};

const OrderForm = ({ catalog, orders, setOrders, editingOrder = null, onCancelEdit, onGoToLogin }) => {
  const [activeTab, setActiveTab] = useState('double');
  const [dimensions, setDimensions] = useState({ width: '100', height: '100', count: '1' });
  const [modalMode, setModalMode] = useState(null);
  const [orderItems, setOrderItems] = useState(editingOrder ? editingOrder.items : []);
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: editingOrder ? editingOrder.customerName : '', phone: editingOrder ? editingOrder.phone : '' });
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pvbLogicSuggest = (totalThick) => {
    const rule = catalog.pvbLogic.find(r => totalThick >= r.minTotalThickness && totalThick <= r.maxTotalThickness);
    return rule ? rule.defaultInterlayerId : catalog.connectors.interlayers[0]?.id;
  };

  const [config, setConfig] = useState({
    operations: {}, pattern: { type: 'none', fileName: '' },
    single: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
    laminate: { glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false }, interlayerId: pvbLogicSuggest(8), glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false } },
    double: { 
      spacerId: catalog.connectors.spacers[0]?.id,
      pane1: { isLaminated: false, glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false }, interlayerId: pvbLogicSuggest(8), glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false } }, 
      pane2: { isLaminated: false, glass1: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false }, interlayerId: pvbLogicSuggest(8), glass2: { glassId: catalog.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false } } 
    }
  });

  const handleDimensionChange = (e) => setDimensions(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const updateConfigLayer = (assembly, paneKey, subField, v, innerField = null) => {
    setConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      if (innerField) newConfig[assembly][paneKey][subField][innerField] = v;
      else if (subField) newConfig[assembly][paneKey][subField] = v;
      else newConfig[assembly][paneKey] = v;
      
      if ((innerField === 'thick' || subField === 'thick') && (assembly === 'laminate' || (assembly === 'double' && newConfig.double[paneKey].isLaminated))) {
        let t1 = 0, t2 = 0;
        if(assembly === 'laminate'){ t1 = newConfig.laminate.glass1.thick; t2 = newConfig.laminate.glass2.thick; newConfig.laminate.interlayerId = pvbLogicSuggest(t1+t2); }
        if(assembly === 'double'){ t1 = newConfig.double[paneKey].glass1.thick; t2 = newConfig.double[paneKey].glass2.thick; newConfig.double[paneKey].interlayerId = pvbLogicSuggest(t1+t2); }
      }
      return newConfig;
    });
  };

  const { validationErrors, pricingDetails } = usePricingCalculator(dimensions, activeTab, config, catalog);

  const grandTotal = orderItems.reduce((acc, item) => acc + item.totalPrice, 0);

  const handleAddToCart = () => {
    if (pricingDetails.total <= 0 || validationErrors.length > 0) return;
    const newItem = {
      id: editingItemId || Date.now(),
      title: activeTab === 'single' ? 'شیشه تک جداره' : activeTab === 'double' ? 'شیشه دوجداره' : 'شیشه لمینت',
      activeTab, dimensions: { ...dimensions }, config: JSON.parse(JSON.stringify(config[activeTab])),
      operations: { ...config.operations }, pattern: { ...config.pattern },
      unitPrice: pricingDetails.unitPrice, totalPrice: pricingDetails.total,
    };
    if (editingItemId) { setOrderItems(prev => prev.map(i => i.id === editingItemId ? newItem : i)); setEditingItemId(null); }
    else setOrderItems(prev => [...prev, newItem]);
    setConfig(prev => ({ ...prev, operations: {}, pattern: { type: 'none', fileName: '' } }));
  };
  
  const handleEditItemClick = (item) => {
    setActiveTab(item.activeTab);
    setDimensions(item.dimensions);
    setConfig(prev => ({...prev, [item.activeTab]: JSON.parse(JSON.stringify(item.config)), operations: item.operations, pattern: item.pattern}));
    setEditingItemId(item.id);
  };

  const submitOrderToServer = () => {
    if (!customerInfo.name || !customerInfo.phone) return alert('لطفاً نام و شماره تماس را وارد کنید.');
    
    if (editingOrder) {
       setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, customerName: customerInfo.name, phone: customerInfo.phone, items: orderItems, total: grandTotal } : o));
       alert('سفارش ویرایش شد.');
       onCancelEdit();
       return;
    }

    const code = generateOrderCode(orderItems, 'customer', orders.length + 1);
    const newOrder = {
      id: Math.floor(Math.random() * 10000).toString(),
      orderCode: code,
      customerName: customerInfo.name,
      phone: customerInfo.phone,
      date: new Date().toLocaleDateString('fa-IR'),
      total: grandTotal,
      status: 'pending',
      items: [...orderItems]
    };

    setOrders(prev => [newOrder, ...prev]);
    alert(`سفارش با موفقیت ثبت شد! کد پیگیری: ${code}`);
    
    setOrderItems([]);
    setIsCheckoutOpen(false);
    setCustomerInfo({ name: '', phone: '' });
  };

  const GlassRow = ({ data, onChange }) => (
    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-11 relative mx-1">
      <div className="bg-slate-900 w-8 flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ writingMode: 'vertical-rl' }}><span className="rotate-180">شیشه</span></div>
      <div className="flex-1 p-1 flex gap-1.5 items-center bg-white">
        <select value={data.glassId} onChange={e => onChange('glassId', e.target.value)} className="flex-[2] bg-slate-50 text-[11px] font-black px-2 py-1.5 rounded-lg outline-none border border-slate-200 h-full">
          {catalog.glasses.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <select value={data.thick} onChange={e => onChange('thick', parseInt(e.target.value))} className="w-20 bg-slate-50 text-[11px] font-black px-2 py-1.5 rounded-lg outline-none border border-slate-200 text-center h-full">
          {catalog.thicknesses.map(t => <option key={t} value={t}>{toPN(t)} میل</option>)}
        </select>
        <label className={`flex-[1] h-full rounded-lg flex items-center justify-center gap-1 text-[10px] font-black border cursor-pointer ${data.isSekurit ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-400'}`}>
          <input type="checkbox" checked={data.isSekurit} onChange={e => onChange('isSekurit', e.target.checked)} className="hidden"/><Flame size={12}/> سکوریت
        </label>
        <label className={`flex-[1] h-full rounded-lg flex items-center justify-center gap-1 text-[10px] font-black border cursor-pointer ${data.hasEdge ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>
          <input type="checkbox" checked={data.hasEdge} onChange={e => onChange('hasEdge', e.target.checked)} className="hidden"/><Ruler size={12}/> ابزار
        </label>
      </div>
    </div>
  );

  const ConnectorRow = ({ value, onChange, type }) => {
    if (type === 'interlayer') return <div className="flex justify-center py-1"><div className="w-24 h-1.5 bg-indigo-200 rounded-full opacity-60"></div></div>;
    return (
      <div className="flex justify-center py-2 -my-2 z-20 relative">
        <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-sm">
          <Layers size={14} className="text-blue-500"/>
          <select value={value} onChange={e => onChange(e.target.value)} className="bg-transparent text-xs font-black outline-none text-blue-700">
            {catalog.connectors.spacers.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
    );
  };

  const LaminatedPaneEditor = ({ assembly, paneKey }) => {
    const pData = config[assembly][paneKey];
    return (
      <div className="relative z-10 bg-white border border-slate-200 rounded-xl shadow-sm mb-1.5 overflow-hidden">
        <div className="flex justify-between items-center bg-slate-50 px-4 py-2 border-b border-slate-200">
          <span className="text-xs font-black text-slate-800">{paneKey === 'pane1' ? 'جداره بیرونی' : 'جداره داخلی'}</span>
          <label className="flex items-center gap-2 cursor-pointer flex-row-reverse">
            <span className="text-[10px] font-bold text-slate-500">تبدیل به لمینت</span>
            <input type="checkbox" checked={pData.isLaminated} onChange={e => updateConfigLayer(assembly, paneKey, 'isLaminated', e.target.checked)} className="hidden" />
            <div className={`w-8 h-4.5 rounded-full flex items-center p-0.5 transition-all ${pData.isLaminated ? 'bg-indigo-400' : 'bg-slate-300'}`}><div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform ${pData.isLaminated ? '-translate-x-3.5' : ''}`}></div></div>
          </label>
        </div>
        <div className={`p-2.5 bg-slate-50/50 ${pData.isLaminated ? 'space-y-1.5' : ''}`}>
          <GlassRow data={pData.glass1} onChange={(f, v) => updateConfigLayer(assembly, paneKey, 'glass1', v, f)} />
          {pData.isLaminated && <><ConnectorRow type="interlayer" /><GlassRow data={pData.glass2} onChange={(f, v) => updateConfigLayer(assembly, paneKey, 'glass2', v, f)} /></>}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {!editingOrder && (
        <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center print-hide mb-6 rounded-2xl mx-auto border border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl border border-white/20">S</div>
                <div>
                    <h1 className="text-lg font-black tracking-tight">گلس دیزاین | Sitra</h1>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">سیستم یکپارچه سفارش آنلاین</p>
                </div>
            </div>
            <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                    <Menu size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute left-0 top-12 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-700">
                        <button onClick={() => { setIsMenuOpen(false); onGoToLogin(); }} className="w-full text-right px-4 py-3.5 text-xs font-bold hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"><User size={14}/> ورود همکاران / پرسنل</button>
                        <button className="w-full text-right px-4 py-3 text-xs font-bold hover:bg-slate-50 border-b border-slate-100 text-slate-600">درباره ما</button>
                        <button className="w-full text-right px-4 py-3 text-xs font-bold hover:bg-slate-50 border-b border-slate-100 text-slate-600">تماس با ما</button>
                        <button className="w-full text-right px-4 py-3 text-xs font-bold hover:bg-slate-50 text-slate-600">قوانین و مقررات</button>
                    </div>
                )}
            </div>
        </header>
      )}

      {editingOrder && (
        <div className="bg-amber-100 border-2 border-amber-400 p-4 rounded-2xl flex justify-between items-center print-hide shadow-md">
           <div className="flex flex-col"><span className="font-black text-amber-900 text-lg">در حال ویرایش سفارش</span><span className="text-xs font-bold text-amber-700 mt-1">کد رهگیری: {editingOrder.orderCode} - مشتری: {editingOrder.customerName}</span></div>
           <button onClick={onCancelEdit} className="bg-white text-slate-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50">انصراف از ویرایش</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-hide">
        <div className="flex bg-slate-50 p-3 gap-3 border-b border-slate-200">
          {[{ id: 'single', label: 'تک جداره' }, { id: 'double', label: 'دوجداره' }, { id: 'laminate', label: 'لمینت' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3.5 rounded-xl text-sm font-black transition-colors ${activeTab === t.id ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-100'}`}>{t.label}</button>
          ))}
        </div>
        <div className="p-6 flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full">
            {activeTab === 'single' && <div className="max-w-2xl mx-auto"><GlassRow data={config.single} onChange={(f, v) => updateConfigLayer('single', f, null, v)} /></div>}
            {activeTab === 'laminate' && (
              <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner">
                <GlassRow data={config.laminate.glass1} onChange={(f, v) => updateConfigLayer('laminate', 'glass1', v, f)} />
                <ConnectorRow type="interlayer" />
                <GlassRow data={config.laminate.glass2} onChange={(f, v) => updateConfigLayer('laminate', 'glass2', v, f)} />
              </div>
            )}
            {activeTab === 'double' && (
              <div className="max-w-2xl mx-auto flex flex-col gap-1.5">
                <LaminatedPaneEditor assembly="double" paneKey="pane1" />
                <ConnectorRow type="spacer" value={config.double.spacerId} onChange={v => updateConfigLayer('double', 'spacerId', null, v)} />
                <LaminatedPaneEditor assembly="double" paneKey="pane2" />
              </div>
            )}
          </div>
          <div className="w-full lg:w-[320px] bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {['width', 'height', 'count'].map(field => (
                <div key={field} className="bg-white p-3 rounded-xl text-center border border-slate-200 shadow-sm focus-within:border-blue-400">
                  <span className="text-[10px] font-black text-slate-500 block mb-2">{field==='width'?'عرض(cm)':field==='height'?'ارتفاع(cm)':'تعداد'}</span>
                  <input type="number" name={field} value={dimensions[field]} onChange={handleDimensionChange} className="bg-transparent text-lg font-black outline-none text-center w-full tabular-nums" dir="ltr" />
                </div>
              ))}
            </div>
            
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-[10px] text-red-700 font-bold flex gap-2 items-start shadow-inner">
                 <ShieldAlert size={14} className="shrink-0 mt-0.5"/>
                 <ul className="list-disc list-inside">{validationErrors.map((e,i)=><li key={i}>{e}</li>)}</ul>
              </div>
            )}

            <button onClick={() => setModalMode('settings')} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 border border-slate-200 bg-white shadow-sm hover:border-blue-400 transition-colors">
                <Settings size={16}/><span className="text-xs font-black">خدمات و الگو</span>
                {(Object.keys(config.operations || {}).length > 0 || config.pattern?.type !== 'none') && <span className="bg-amber-500 text-white text-[9px] px-1.5 rounded-full mr-2">ثبت شد</span>}
            </button>
            <button onClick={handleAddToCart} disabled={pricingDetails.total <= 0 || validationErrors.length > 0} className={`w-full text-white rounded-xl font-black text-sm flex justify-between p-1.5 shadow-md mt-1 transition-all ${(pricingDetails.total <= 0 || validationErrors.length > 0) ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 active:scale-95 hover:bg-slate-800'}`}>
              <div className="bg-white/10 px-4 py-2.5 rounded-lg tabular-nums flex items-center gap-1.5 shadow-inner">
                  {pricingDetails.total > 0 ? toPN(pricingDetails.total.toLocaleString()) : '---'} <span className="text-[9px] font-normal opacity-80">تومان</span>
              </div>
              <div className="flex items-center gap-2 px-3">{editingItemId ? 'بروزرسانی' : 'افزودن'} {editingItemId ? <CheckCircle2 size={18}/> : <Plus size={18}/>}</div>
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT BASKET */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4 print-hide">
        <div className="bg-slate-900 p-3 text-white flex justify-between items-center">
            <span className="text-sm font-black pl-2">سبد سفارش مشتری</span>
            <button onClick={() => {
                try {
                   window.print();
                } catch(e) {
                   setShowPrintPreview(true);
                }
             }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all shadow-md">
              <Printer size={14}/> چاپ پیش‌فاکتور
            </button>
        </div>
        
        {orderItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold bg-slate-50/50">آیتمی در سفارش ثبت نشده است.</div>
        ) : (
            <>
              <div className="hidden lg:block overflow-x-auto p-2">
                  <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 text-[11px] border-y border-slate-200 rounded-lg">
                          <tr>
                              <th className="p-2 font-bold w-10 text-center border-l border-slate-200/50">ردیف</th>
                              <th className="p-2 font-bold w-32 border-l border-slate-200/50">نوع ساختار</th>
                              <th className="p-2 font-bold border-l border-slate-200/50">پیکربندی و خدمات</th>
                              <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">ابعاد (cm)</th>
                              <th className="p-2 font-bold w-12 text-center border-l border-slate-200/50">تعداد</th>
                              <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">فی (تومان)</th>
                              <th className="p-2 font-bold w-28 text-left border-l border-slate-200/50 pl-3">مبلغ کل</th>
                              <th className="p-2 font-bold w-16 text-center">عملیات</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {orderItems.map((item, i) => (
                              <tr key={item.id} className="hover:bg-blue-50/20 transition-colors even:bg-slate-50/50">
                                  <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 tabular-nums">{toPN(i+1)}</td>
                                  <td className="p-2 border-l border-slate-100"><span className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-full text-[10px] font-black whitespace-nowrap shadow-sm">{item.title}</span></td>
                                  <td className="p-2 border-l border-slate-100"><StructureDetails item={item} catalog={catalog} /></td>
                                  <td className="p-2 text-center font-bold text-slate-600 border-l border-slate-100 tabular-nums" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
                                  <td className="p-2 text-center font-black text-slate-800 border-l border-slate-100 tabular-nums">{toPN(item.dimensions.count)}</td>
                                  <td className="p-2 text-center font-bold text-slate-500 border-l border-slate-100 tabular-nums">{toPN(item.unitPrice.toLocaleString())}</td>
                                  <td className="p-2 text-left pl-3 font-black text-slate-900 border-l border-slate-100 tabular-nums bg-blue-50/30 text-sm">{toPN(item.totalPrice.toLocaleString())}</td>
                                  <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                          <button onClick={() => handleEditItemClick(item)} className="text-slate-400 hover:text-amber-600 bg-white border border-slate-200 p-1 rounded shadow-sm transition-colors"><Edit3 size={12}/></button>
                                          <button onClick={() => setOrderItems(p => p.filter(x => x.id !== item.id))} className="text-slate-400 hover:text-red-600 bg-white border border-slate-200 p-1 rounded shadow-sm transition-colors"><Trash2 size={12}/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* Mobile List View remains similar but slightly smaller paddings */}
              <div className="divide-y divide-slate-100 lg:hidden">
                  {orderItems.map((item, i) => (
                      <div key={item.id} className="p-3 flex justify-between items-start hover:bg-slate-50 transition-colors">
                          <div className="flex gap-2 w-[75%]">
                              <span className="text-[10px] font-black text-slate-400 bg-slate-100 w-5 h-5 flex items-center justify-center rounded shrink-0 mt-0.5">{toPN(i+1)}</span>
                              <div>
                                  <div className="text-[11px] font-black text-slate-800 leading-tight">
                                      {item.title} <span className="text-[9px] text-slate-400 font-bold tracking-wider tabular-nums">({toPN(item.dimensions.width)}×{toPN(item.dimensions.height)} - {toPN(item.dimensions.count)}عدد)</span>
                                  </div>
                                  <div className="mt-1"><StructureDetails item={item} catalog={catalog} /></div>
                              </div>
                          </div>
                          <div className="flex flex-col items-end justify-between h-full gap-2">
                              <div className="font-black text-xs text-blue-600 shrink-0 tabular-nums">{toPN(item.totalPrice.toLocaleString())}</div>
                              <div className="flex gap-1.5 mt-1">
                                  <button onClick={() => handleEditItemClick(item)} className="text-slate-400 hover:text-amber-500 bg-white border border-slate-200 p-1 rounded shadow-sm"><Edit3 size={12}/></button>
                                  <button onClick={() => setOrderItems(p => p.filter(x => x.id !== item.id))} className="text-slate-400 hover:text-red-500 bg-white border border-slate-200 p-1 rounded shadow-sm"><Trash2 size={12}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row justify-between items-center border-t border-slate-200 gap-4">
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500">مبلغ نهایی فاکتور:</span>
                      <span className="text-lg lg:text-xl font-black text-slate-900 tabular-nums">{toPN(grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-500">تومان</span></span>
                  </div>
                  
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                      <CheckCircle2 size={16}/> {editingOrder ? 'ثبت نهایی ویرایش سفارش' : 'تایید و ورود مشخصات'}
                  </button>
              </div>
            </>
        )}
      </div>

      {modalMode === 'settings' && (
        <SettingsModal 
            setModalMode={setModalMode} 
            config={config} 
            setConfig={setConfig} 
            catalog={catalog} 
        />
      )}

      {isCheckoutOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 print-hide">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-emerald-500 p-5 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><User size={32} /></div>
                      <h3 className="text-lg font-black">{editingOrder ? 'تایید نهایی ویرایش' : 'اطلاعات سفارش‌دهنده'}</h3>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5"><User size={14}/> نام و نام خانوادگی / شرکت</label>
                          <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-sm outline-none focus:border-emerald-400 transition-colors" placeholder="مثال: علی حسینی" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5"><Phone size={14}/> شماره موبایل</label>
                          <input type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-sm outline-none focus:border-emerald-400 transition-colors" placeholder="09123456789" dir="ltr" />
                      </div>
                      
                      <div className="pt-4 flex gap-3">
                          <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-200 transition-colors">انصراف</button>
                          <button onClick={submitOrderToServer} className="flex-[2] bg-emerald-500 text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all">
                              <Save size={18}/> ثبت نهایی
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- PRINTABLE INVOICE AREA (FOR CUSTOMER) --- */}
      {showPrintPreview && (
          <div className="fixed inset-0 z-[100] bg-slate-500 overflow-y-auto print:bg-white print:p-0" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
              <div className="sticky top-0 z-50 bg-slate-900 text-white p-3 shadow-xl flex justify-between items-center print-hide">
                  <button onClick={() => setShowPrintPreview(false)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"><ArrowRight size={16} /> بازگشت</button>
                  <div className="font-black text-sm flex-1 text-center">پیش‌نمایش چاپ فاکتور مشتری</div>
                  <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-colors"><Printer size={16} /> چاپ فاکتور</button>
              </div>
              
              <div className="printable-area w-full max-w-[210mm] mx-auto bg-white my-8 shadow-2xl p-[10mm] text-black print:my-0 print:shadow-none print:w-auto print:p-0">
                  <div className="flex justify-between items-start border-b-[2px] border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
                          <div>
                              <h1 className="text-2xl font-black tracking-tight text-slate-900">گلس دیزاین <span className="text-slate-400 font-normal">| Sitra</span></h1>
                              <p className="text-xs font-bold mt-1 text-slate-600">پیش‌فاکتور رسمی سفارش</p>
                          </div>
                      </div>
                      <div className="text-left text-xs font-bold space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[160px]">
                          <div className="flex justify-between gap-4"><span className="text-slate-500">تاریخ:</span> <span>{new Date().toLocaleDateString('fa-IR')}</span></div>
                          <div className="flex justify-between gap-4"><span className="text-slate-500">شماره:</span> <span className="tabular-nums">- در انتظار ثبت -</span></div>
                      </div>
                  </div>

                  <table className="w-full text-right border-collapse border border-slate-300 mb-8 text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                          <tr>
                              <th className="border border-slate-300 p-2 w-10 text-center">ردیف</th>
                              <th className="border border-slate-300 p-2 w-20">نوع ساختار</th>
                              <th className="border border-slate-300 p-2 text-right">جزئیات فنی و پیکربندی</th>
                              <th className="border border-slate-300 p-2 w-24 text-center">ابعاد (cm)</th>
                              <th className="border border-slate-300 p-2 w-12 text-center">تعداد</th>
                              <th className="border border-slate-300 p-2 w-28 text-center">فی (تومان)</th>
                              <th className="border border-slate-300 p-2 w-32 text-left">مبلغ کل (تومان)</th>
                          </tr>
                      </thead>
                      <tbody className="text-slate-800">
                          {orderItems.length === 0 && (
                            <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-bold">بدون آیتم</td></tr>
                          )}
                          {orderItems.map((item, i) => (
                              <tr key={item.id} className="even:bg-slate-50/70 break-inside-avoid">
                                  <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(i+1)}</td>
                                  <td className="border border-slate-300 p-2 font-black align-top">{item.title}</td>
                                  <td className="border border-slate-300 p-2 align-top"><StructureDetails item={item} catalog={catalog} /></td>
                                  <td className="border border-slate-300 p-2 font-bold tabular-nums text-center align-top" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
                                  <td className="border border-slate-300 p-2 font-black tabular-nums text-center align-top">{toPN(item.dimensions.count)}</td>
                                  <td className="border border-slate-300 p-2 font-bold text-slate-600 tabular-nums text-center align-top">{toPN(item.unitPrice.toLocaleString())}</td>
                                  <td className="border border-slate-300 p-2 font-black tabular-nums bg-slate-100 text-left align-top text-[13px]">{toPN(item.totalPrice.toLocaleString())}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>

                  <div className="flex justify-between items-end mb-4 break-inside-avoid">
                      <div className="w-1/2 p-3 text-[10px] font-bold text-slate-500 space-y-1.5 border border-slate-200 rounded-xl bg-slate-50">
                          <p className="text-slate-700">توضیحات و شرایط:</p>
                          <ul className="list-disc list-inside space-y-1">
                              <li>تمامی ابعاد به سانتی‌متر و با دقت میلی‌متر ثبت شده‌اند.</li>
                              <li>مسئولیت صحت ابعاد و الگوها بر عهده مشتری می‌باشد.</li>
                              <li>اعتبار پیش‌فاکتور ۳ روز کاری می‌باشد.</li>
                          </ul>
                      </div>
                      <div className="w-72 border-[1.5px] border-slate-800 p-4 rounded-2xl bg-slate-900 text-white">
                          <div className="flex justify-between text-lg font-black tabular-nums items-center">
                              <span className="text-slate-300 text-xs">جمع کل فاکتور:</span>
                              <span>{toPN(grandTotal.toLocaleString())} <span className="text-[10px] font-normal text-slate-400">تومان</span></span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      <div className="hidden print:block printable-area bg-white p-6" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
        <div className="flex justify-between items-start border-b-[2px] border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">گلس دیزاین <span className="text-slate-400 font-normal">| Sitra</span></h1>
                    <p className="text-xs font-bold mt-1 text-slate-600">پیش‌فاکتور رسمی سفارش</p>
                </div>
            </div>
            <div className="text-left text-xs font-bold space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[160px]">
                <div className="flex justify-between gap-4"><span className="text-slate-500">تاریخ:</span> <span>{new Date().toLocaleDateString('fa-IR')}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">شماره:</span> <span className="tabular-nums">- در انتظار ثبت -</span></div>
            </div>
        </div>

        <table className="w-full text-right border-collapse border border-slate-300 mb-8 text-xs">
            <thead className="bg-slate-100 text-slate-700">
                <tr>
                    <th className="border border-slate-300 p-2 w-10 text-center">ردیف</th>
                    <th className="border border-slate-300 p-2 w-20">نوع ساختار</th>
                    <th className="border border-slate-300 p-2 text-right">جزئیات فنی و پیکربندی</th>
                    <th className="border border-slate-300 p-2 w-24 text-center">ابعاد (cm)</th>
                    <th className="border border-slate-300 p-2 w-12 text-center">تعداد</th>
                    <th className="border border-slate-300 p-2 w-28 text-center">فی (تومان)</th>
                    <th className="border border-slate-300 p-2 w-32 text-left">مبلغ کل (تومان)</th>
                </tr>
            </thead>
            <tbody className="text-slate-800">
                {orderItems.length === 0 && (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-bold">بدون آیتم</td></tr>
                )}
                {orderItems.map((item, i) => (
                    <tr key={item.id} className="even:bg-slate-50/70 break-inside-avoid">
                        <td className="border border-slate-300 p-2 font-bold text-slate-500 tabular-nums text-center align-top">{toPN(i+1)}</td>
                        <td className="border border-slate-300 p-2 font-black align-top">{item.title}</td>
                        <td className="border border-slate-300 p-2 align-top"><StructureDetails item={item} catalog={catalog} /></td>
                        <td className="border border-slate-300 p-2 font-bold tabular-nums text-center align-top" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
                        <td className="border border-slate-300 p-2 font-black tabular-nums text-center align-top">{toPN(item.dimensions.count)}</td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-600 tabular-nums text-center align-top">{toPN(item.unitPrice.toLocaleString())}</td>
                        <td className="border border-slate-300 p-2 font-black tabular-nums bg-slate-100 text-left align-top text-[13px]">{toPN(item.totalPrice.toLocaleString())}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

    </div>
  );
};

// ==========================================
// 3. LOGIN COMPONENT
// ==========================================
const LoginView = ({ onLogin, onGoToCustomer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'manager' && password === '1234') {
       onLogin('manager');
    } else if (username === 'admin' && password === '1234') {
       onLogin('admin');
    } else {
       alert('نام کاربری یا رمز عبور اشتباه است.');
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
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 transition-colors" dir="ltr" />
             </div>
             <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">رمز عبور</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 transition-colors" dir="ltr" />
             </div>
             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30 transition-all mt-6">
                <Lock size={16}/> ورود به پنل
             </button>
          </form>
       </div>
       <button onClick={onGoToCustomer} className="mt-8 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors">
          <ArrowRight size={14}/> بازگشت به فرم سفارش مشتری
       </button>
    </div>
  );
};

// ==========================================
// 4. MAIN APP
// ==========================================
export default function App() {
  const [view, setView] = useState('customer'); // 'customer' | 'login' | 'admin'
  const [userRole, setUserRole] = useState(null); // 'manager' | 'admin'
  
  const [catalog, setCatalog] = useState(initialCatalog);
  const [orders, setOrders] = useState(initialOrders);
  const [editingOrder, setEditingOrder] = useState(null);

  const handleLogin = (role) => {
    setUserRole(role);
    setView('admin');
  };

  const handleLogout = () => {
    setUserRole(null);
    setView('login');
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

      {/* Main Views */}
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