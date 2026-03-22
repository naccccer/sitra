import React from 'react';
import { CheckCircle2, Flame, Layers, Plus, Ruler, Settings, ShieldAlert } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { glassProcess } from '@/modules/sales/components/customer/order-form/orderFormUtils';

const getCatalogDefaults = (catalog) => ({
  glasses: Array.isArray(catalog?.glasses) ? catalog.glasses : [],
  thicknesses: Array.isArray(catalog?.thicknesses) ? catalog.thicknesses : [],
  spacers: Array.isArray(catalog?.connectors?.spacers) ? catalog.connectors.spacers : [],
});

const GlassRow = ({ data, onChange, catalog, layerKey, isUnavailable = false }) => {
  const defaults = getCatalogDefaults(catalog);
  const targetProcess = data.isSekurit ? 'sekurit' : 'raw';
  const glassOptions = defaults.glasses.filter((glass) => glassProcess(glass) === targetProcess);
  const selectedGlass = defaults.glasses.find((glass) => glass.id === data.glassId);
  const selectedExists = glassOptions.some((glass) => glass.id === data.glassId);
  const layerLabel = isUnavailable ? 'ناموجود' : 'شیشه';

  return (
    <div data-layer-key={layerKey} className={`relative mx-1 flex flex-col overflow-hidden rounded-xl border shadow-sm sm:h-11 sm:flex-row ${isUnavailable ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
      <div className={`${isUnavailable ? 'bg-red-600' : 'bg-slate-900'} flex h-7 w-full shrink-0 items-center justify-center text-[10px] font-black text-white sm:h-auto sm:w-8 sm:[writing-mode:vertical-rl]`}>
        <span className="sm:rotate-180">{layerLabel}</span>
      </div>
      <div className={`flex flex-1 flex-wrap items-center gap-1.5 p-1 ${isUnavailable ? 'bg-red-50/20' : 'bg-white'}`}>
        <select value={data.glassId} onChange={(event) => onChange('glassId', event.target.value)} className={`h-8 min-w-0 grow basis-[130px] rounded-lg border bg-slate-50 px-2 py-1.5 text-[11px] font-black outline-none ${isUnavailable ? 'border-red-300 text-red-700' : 'border-slate-200'}`}>
          {!selectedExists && selectedGlass && <option value={selectedGlass.id}>{selectedGlass.title} (ناموجود)</option>}
          {glassOptions.map((glass) => <option key={glass.id} value={glass.id}>{glass.title}</option>)}
        </select>
        <select value={data.thick} onChange={(event) => onChange('thick', parseInt(event.target.value, 10))} className="h-8 w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-black outline-none">
          {defaults.thicknesses.map((thickness) => <option key={thickness} value={thickness}>{toPN(thickness)} میل</option>)}
        </select>
        <label className={`flex h-8 grow basis-[95px] cursor-pointer items-center justify-center gap-1 rounded-lg border text-[10px] font-black ${data.isSekurit ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-400'}`}>
          <input type="checkbox" checked={data.isSekurit} onChange={(event) => onChange('isSekurit', event.target.checked)} className="hidden" />
          <Flame size={12} />
          سکوریت
        </label>
        <label className={`flex h-8 grow basis-[95px] cursor-pointer items-center justify-center gap-1 rounded-lg border text-[10px] font-black ${data.hasEdge ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-400'}`}>
          <input type="checkbox" checked={data.hasEdge} onChange={(event) => onChange('hasEdge', event.target.checked)} className="hidden" />
          <Ruler size={12} />
          ابزار
        </label>
      </div>
    </div>
  );
};

const ConnectorRow = ({ value, onChange, type, catalog }) => {
  const defaults = getCatalogDefaults(catalog);
  if (type === 'interlayer') {
    return (
      <div className="flex justify-center py-1">
        <div className="h-1.5 w-24 rounded-full bg-indigo-200 opacity-60" />
      </div>
    );
  }
  return (
    <div className="relative z-20 -my-2 flex justify-center py-2">
      <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 shadow-sm">
        <Layers size={14} className="text-blue-500" />
        <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent text-xs font-black text-blue-700 outline-none">
          {defaults.spacers.map((spacer) => <option key={spacer.id} value={spacer.id}>{spacer.title}</option>)}
        </select>
      </div>
    </div>
  );
};

const LaminatedPaneEditor = ({ assembly, paneKey, config, updateConfigLayer, catalog, unavailableLayers }) => {
  const paneData = config[assembly][paneKey];
  const layer1Key = `${assembly}.${paneKey}.glass1`;
  const layer2Key = `${assembly}.${paneKey}.glass2`;
  return (
    <div className="relative z-10 mb-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-black text-slate-800">{paneKey === 'pane1' ? 'جداره بیرونی' : 'جداره داخلی'}</span>
        <label className="flex cursor-pointer flex-row-reverse items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">تبدیل به لمینت</span>
          <input type="checkbox" checked={paneData.isLaminated} onChange={(event) => updateConfigLayer(assembly, paneKey, 'isLaminated', event.target.checked)} className="hidden" />
          <div className={`flex h-4.5 w-8 rounded-full p-0.5 transition-all ${paneData.isLaminated ? 'bg-indigo-400' : 'bg-slate-300'}`}>
            <div className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm ${paneData.isLaminated ? '-translate-x-3.5' : ''}`} />
          </div>
        </label>
      </div>
      <div className={`bg-slate-50/50 p-2.5 ${paneData.isLaminated ? 'space-y-1.5' : ''}`}>
        <GlassRow layerKey={layer1Key} isUnavailable={Boolean(unavailableLayers[layer1Key])} data={paneData.glass1} onChange={(field, value) => updateConfigLayer(assembly, paneKey, 'glass1', value, field)} catalog={catalog} />
        {paneData.isLaminated && (
          <>
            <ConnectorRow type="interlayer" />
            <GlassRow layerKey={layer2Key} isUnavailable={Boolean(unavailableLayers[layer2Key])} data={paneData.glass2} onChange={(field, value) => updateConfigLayer(assembly, paneKey, 'glass2', value, field)} catalog={catalog} />
          </>
        )}
      </div>
    </div>
  );
};

export const OrderConfigurationSection = ({
  activeTab,
  setActiveTab,
  config,
  updateConfigLayer,
  catalog,
  unavailableLayers,
  dimensions,
  onDimensionChange,
  summaryErrors,
  isStaffContext,
  itemPricing,
  setItemPricing,
  catalogPricingPreview,
  canAddCatalogItem,
  onAddCatalogItem,
  isEditingCatalogItem,
  onOpenSettingsModal,
}) => (
  <div className="print-hide overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:gap-3">
      {[{ id: 'single', label: 'تک جداره' }, { id: 'double', label: 'دوجداره' }, { id: 'laminate', label: 'لمینت' }].map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-[95px] flex-1 rounded-xl py-3.5 text-sm font-black transition-colors ${activeTab === tab.id ? 'bg-emerald-500 text-white shadow-md' : 'border bg-white text-slate-500 hover:bg-slate-100'}`}>
          {tab.label}
        </button>
      ))}
    </div>

    <div className="flex flex-col items-start gap-8 p-6 lg:flex-row">
      <div className="w-full flex-1">
        {activeTab === 'single' && <div className="mx-auto max-w-2xl"><GlassRow layerKey="single.glass1" isUnavailable={Boolean(unavailableLayers['single.glass1'])} data={config.single} onChange={(field, value) => updateConfigLayer('single', field, null, value)} catalog={catalog} /></div>}
        {activeTab === 'laminate' && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
            <GlassRow layerKey="laminate.glass1" isUnavailable={Boolean(unavailableLayers['laminate.glass1'])} data={config.laminate.glass1} onChange={(field, value) => updateConfigLayer('laminate', 'glass1', field, value)} catalog={catalog} />
            <ConnectorRow type="interlayer" />
            <GlassRow layerKey="laminate.glass2" isUnavailable={Boolean(unavailableLayers['laminate.glass2'])} data={config.laminate.glass2} onChange={(field, value) => updateConfigLayer('laminate', 'glass2', field, value)} catalog={catalog} />
          </div>
        )}
        {activeTab === 'double' && (
          <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
            <LaminatedPaneEditor assembly="double" paneKey="pane1" config={config} updateConfigLayer={updateConfigLayer} catalog={catalog} unavailableLayers={unavailableLayers} />
            <ConnectorRow type="spacer" value={config.double.spacerId} onChange={(value) => updateConfigLayer('double', 'spacerId', null, value)} catalog={catalog} />
            <LaminatedPaneEditor assembly="double" paneKey="pane2" config={config} updateConfigLayer={updateConfigLayer} catalog={catalog} unavailableLayers={unavailableLayers} />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:w-[320px]">
        <div className="grid grid-cols-3 gap-3">
          {['width', 'height', 'count'].map((field) => (
            <div key={field} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm focus-within:border-blue-400">
              <span className="mb-2 block text-[10px] font-black text-slate-500">{field === 'width' ? 'عرض(cm)' : field === 'height' ? 'ارتفاع(cm)' : 'تعداد'}</span>
              <input type="number" name={field} value={dimensions[field]} onChange={onDimensionChange} className="w-full bg-transparent text-center text-lg font-black tabular-nums outline-none" dir="ltr" />
            </div>
          ))}
        </div>

        {summaryErrors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] font-bold text-red-700 shadow-inner">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <ul className="list-inside list-disc">
              {summaryErrors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
            </ul>
          </div>
        )}

        <button onClick={onOpenSettingsModal} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 shadow-sm transition-colors hover:border-blue-400">
          <Settings size={16} />
          <span className="text-xs font-black">خدمات و الگو</span>
          {(Object.keys(config.operations || {}).length > 0 || config.pattern?.type !== 'none') && <span className="mr-2 rounded-full bg-amber-500 px-1.5 text-[9px] text-white">ثبت شد</span>}
        </button>

        {isStaffContext && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
            <input type="number" value={itemPricing.overrideUnitPrice} onChange={(event) => setItemPricing((previous) => ({ ...previous, overrideUnitPrice: event.target.value }))} placeholder="فی توافقی" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold" dir="ltr" />
            <div className={`text-[10px] font-bold ${catalogPricingPreview.isBelowFloor ? 'text-red-600' : 'text-slate-500'}`}>
              کف مجاز: {toPN(catalogPricingPreview.floorUnitPrice.toLocaleString())} تومان
            </div>
          </div>
        )}

        <button onClick={onAddCatalogItem} disabled={!canAddCatalogItem} className={`mt-1 flex w-full justify-between rounded-xl p-1.5 text-sm font-black text-white shadow-md transition-all ${!canAddCatalogItem ? 'cursor-not-allowed bg-slate-300' : 'bg-slate-900 hover:bg-slate-800 active:scale-95'}`}>
          <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2.5 tabular-nums shadow-inner">
            {catalogPricingPreview.finalLineTotal > 0 ? toPN(catalogPricingPreview.finalLineTotal.toLocaleString()) : '---'}
            <span className="text-[9px] font-normal opacity-80">تومان</span>
          </div>
          <div className="flex items-center gap-2 px-3">
            {isEditingCatalogItem ? 'بروزرسانی' : 'افزودن'}
            {isEditingCatalogItem ? <CheckCircle2 size={18} /> : <Plus size={18} />}
          </div>
        </button>
      </div>
    </div>
  </div>
);
