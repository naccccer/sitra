import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CUSTOM_UNIT_LABEL_M_SQUARE, normalizeCustomUnitLabel } from '@/utils/customItemUnits';
import { toPN } from '@/utils/helpers';
import { ensureBillingSettings } from '@/utils/invoice';
import { normalizeFactoryLimits, normalizeJumboRules } from '@/utils/catalogPricing';
import { masterDataApi } from '../services/masterDataApi';
import { BillingSettingsSection } from './admin-settings/BillingSettingsSection';
import { CountBadge } from './admin-settings/SettingsUiParts';
import { DoubleGlazingSettingsSection } from './admin-settings/DoubleGlazingSettingsSection';
import { JumboFactorySettingsSection } from './admin-settings/JumboFactorySettingsSection';
import { LaminateSettingsSection } from './admin-settings/LaminateSettingsSection';
import { MatrixSettingsSection } from './admin-settings/MatrixSettingsSection';
import { OperationsSettingsSection } from './admin-settings/OperationsSettingsSection';
import { CustomItemsSettingsSection } from './admin-settings/CustomItemsSettingsSection';
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
  next.jumboRules = normalizeJumboRules(next.jumboRules);
  next.jumboRulesEnabled = next.jumboRulesEnabled !== false;
  next.factoryLimits = normalizeFactoryLimits(next.factoryLimits);

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
  if (!Array.isArray(next.customItems)) next.customItems = [];
  next.customItems = next.customItems.map((item) => ({
    id: String(item?.id || ''),
    title: String(item?.title || '').trim(),
    unitLabel: normalizeCustomUnitLabel(item?.unitLabel || CUSTOM_UNIT_LABEL_M_SQUARE),
    unitPrice: Math.max(0, Number(item?.unitPrice) || 0),
    isActive: item?.isActive !== false,
  })).filter((item) => item.id !== '' && item.title !== '');

  return next;
};

export const AdminSettingsView = ({ catalog, setCatalog, secondaryAction = null }) => {
  const location = useLocation();
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
    { id: 'custom', label: 'سفارشی', count: draft.customItems.length },
    { id: 'tools', label: 'ابزار و الگو' },
    { id: 'billing', label: 'مالی و پرداخت' },
    { id: 'operations', label: 'خدمات و جاساز', count: draft.operations.length },
    { id: 'jumbo', label: 'جامبو و کارخانه' },
  ]), [draft.connectors.interlayers.length, draft.connectors.spacers.length, draft.customItems.length, draft.operations.length]);

  useEffect(() => {
    const query = new URLSearchParams(location.search || '');
    const requestedTab = String(query.get('tab') || '').trim();
    const availableTabs = new Set(settingsTabs.map((tab) => tab.id));
    if (availableTabs.has(requestedTab)) {
      setActiveSettingsTab(requestedTab);
    }
  }, [location.search, settingsTabs]);

  return (
    <div className="space-y-4 print-hide animate-in fade-in">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex min-w-max items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition ${activeSettingsTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <CountBadge tone={activeSettingsTab === tab.id ? 'dark' : 'light'}>
                      {toPN(tab.count)}
                    </CountBadge>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button onClick={handleSaveSettings} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white transition hover:bg-emerald-700 active:scale-95">
              <Save size={16} />
              ثبت تغییرات
            </button>
            {secondaryAction}
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
        {activeSettingsTab === 'custom' && <CustomItemsSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'tools' && <ToolsPatternSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'billing' && <BillingSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'operations' && <OperationsSettingsSection draft={draft} setDraft={setDraft} />}
        {activeSettingsTab === 'jumbo' && <JumboFactorySettingsSection draft={draft} setDraft={setDraft} />}
      </div>
    </div>
  );
};
