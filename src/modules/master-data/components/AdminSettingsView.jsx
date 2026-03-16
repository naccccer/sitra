import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { ensureBillingSettings } from '@/utils/invoice';
import { masterDataApi } from '../services/masterDataApi';
import { BillingSettingsSection } from './admin-settings/BillingSettingsSection';
import { DoubleGlazingSettingsSection } from './admin-settings/DoubleGlazingSettingsSection';
import { JumboFactorySettingsSection } from './admin-settings/JumboFactorySettingsSection';
import { LaminateSettingsSection } from './admin-settings/LaminateSettingsSection';
import { MatrixSettingsSection } from './admin-settings/MatrixSettingsSection';
import { OperationsSettingsSection } from './admin-settings/OperationsSettingsSection';
import { ToolsPatternSettingsSection } from './admin-settings/ToolsPatternSettingsSection';

const DESTINATION_DRILLING_SERVICE_IDS = new Set(['op_hole1', 'op_hole2']);
const DRILLING_SERVICE_KEYWORDS = ['hole', 'drill', 'سوراخ'];

const isDestinationDrillingService = (operation = {}) => {
  const id = String(operation?.id || '').toLowerCase();
  if (DESTINATION_DRILLING_SERVICE_IDS.has(id)) return true;
  if (String(operation?.unit || '') !== 'qty') return false;
  const searchable = `${id} ${String(operation?.title || '').toLowerCase()}`;
  return DRILLING_SERVICE_KEYWORDS.some((keyword) => searchable.includes(keyword));
};

const ensureCatalogDefaults = (source) => {
  const next = JSON.parse(JSON.stringify(source || {}));

  if (!Array.isArray(next.glasses)) next.glasses = [];
  if (!Array.isArray(next.thicknesses)) next.thicknesses = [];
  if (!Array.isArray(next.pvbLogic)) next.pvbLogic = [];
  if (!Array.isArray(next.jumboRules)) next.jumboRules = [];
  if (!next.factoryLimits) next.factoryLimits = { maxWidth: 0, maxHeight: 0 };

  if (!next.connectors || typeof next.connectors !== 'object') next.connectors = {};
  if (!Array.isArray(next.connectors.spacers)) next.connectors.spacers = [];
  if (!Array.isArray(next.connectors.interlayers)) next.connectors.interlayers = [];

  if (!next.fees || typeof next.fees !== 'object') next.fees = {};
  if (!next.fees.doubleGlazing) next.fees.doubleGlazing = { unit: 'm_square', price: 0, fixedOrderPrice: 0 };
  if (!next.fees.laminating) next.fees.laminating = { unit: 'm_square', price: 0, fixedOrderPrice: 0 };
  if (!next.fees.pattern) next.fees.pattern = { unit: 'order', price: 0 };
  if (!next.fees.edgeWork) next.fees.edgeWork = { unit: 'm_length', price: 0 };
  else {
    next.fees.edgeWork = {
      unit: next.fees.edgeWork.unit || 'm_length',
      price: next.fees.edgeWork.price ?? 0,
    };
  }

  next.billing = ensureBillingSettings(next);
  if (!Array.isArray(next.operations)) next.operations = [];
  next.operations = next.operations.filter((operation) => !isDestinationDrillingService(operation));

  return next;
};

export const AdminSettingsView = ({ catalog, setCatalog }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('matrix');
  const [draft, setDraft] = useState(ensureCatalogDefaults(catalog));
  const [newThickness, setNewThickness] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);

  useEffect(() => {
    setDraft(ensureCatalogDefaults(catalog));
  }, [catalog]);

  const handleSaveSettings = async () => {
    try {
      const safeDraft = ensureCatalogDefaults(draft);
      const response = await masterDataApi.saveCatalog(safeDraft);
      setCatalog(ensureCatalogDefaults(response?.catalog || safeDraft));
      alert('تنظیمات و قیمت‌ها با موفقیت ثبت شد.');
    } catch (error) {
      console.error('Failed to save catalog to backend.', error);
      alert(error?.message || 'ذخیره تنظیمات روی سرور ناموفق بود.');
    }
  };

  const settingsTabs = useMemo(() => ([
    { id: 'matrix', label: 'ماتریس شیشه' },
    { id: 'laminate', label: 'لمینت', count: draft.connectors.interlayers.length },
    { id: 'double', label: 'دوجداره', count: draft.connectors.spacers.length },
    { id: 'tools', label: 'ابزار و الگو' },
    { id: 'billing', label: 'مالی و پرداخت' },
    { id: 'operations', label: 'خدمات و جاساز', count: draft.operations.length },
    { id: 'jumbo', label: 'جامبو و کارخانه' },
  ]), [draft.connectors.interlayers.length, draft.connectors.spacers.length, draft.operations.length]);

  return (
    <div className="space-y-4 print-hide animate-in fade-in">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black text-slate-800">پیکربندی لیست قیمت</h2>
          <button onClick={handleSaveSettings} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95">
            <Save size={16} /> ثبت تغییرات
          </button>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex min-w-max items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-1.5">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-black transition-all ${activeSettingsTab === tab.id ? 'border border-blue-200 bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-white/70'}`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeSettingsTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {toPN(tab.count)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {activeSettingsTab === 'matrix' && (
          <MatrixSettingsSection
            draft={draft}
            setDraft={setDraft}
            newThickness={newThickness}
            setNewThickness={setNewThickness}
            isAddingCol={isAddingCol}
            setIsAddingCol={setIsAddingCol}
          />
        )}
        {activeSettingsTab === 'laminate' && <LaminateSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'double' && <DoubleGlazingSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'tools' && <ToolsPatternSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'billing' && <BillingSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'operations' && <OperationsSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'jumbo' && <JumboFactorySettingsSection draft={draft} setDraft={setDraft} />}
      </div>
    </div>
  );
};

