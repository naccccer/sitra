import React from 'react';
import { CheckCircle2, Plus, Settings, ShieldAlert } from 'lucide-react';
import { CustomItemsTable } from '@/modules/sales/components/customer/order-form/CustomItemsTable';
import {
  GlassRow,
  LaminatedPaneEditor,
  LaminateLayersEditor,
  SpacerConnectorRow,
} from '@/modules/sales/components/customer/order-form/GlassAssemblyEditors';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';

export const OrderConfigurationSection = ({
  activeTab,
  setActiveTab,
  config,
  updateConfigLayer,
  addLaminateLayer,
  removeLaminateLayer,
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
  customItems,
  customDraft,
  setCustomDraft,
  customDraftState,
  onGoToCustomItems,
}) => {
  const tabs = [
    { id: 'single', label: 'تک جداره' },
    { id: 'double', label: 'دوجداره' },
    { id: 'laminate', label: 'لمینت' },
    { id: 'custom', label: 'سفارشی' },
  ];
  const isCustomTab = activeTab === 'custom';
  const customUnitCode = String(customDraftState?.unitCode || 'm_square');
  const isCustomQtyUnit = isCustomTab && customUnitCode === 'qty';
  const isCustomServiceDisabled = isCustomTab && customUnitCode !== 'm_square';
  const overrideFloorPrice = catalogPricingPreview.displayFloorUnitPrice ?? catalogPricingPreview.floorUnitPrice;

  return (
    <div className="print-hide overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:gap-3">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-[95px] flex-1 rounded-xl py-3.5 text-sm font-black transition-colors ${activeTab === tab.id ? 'bg-emerald-500 text-white shadow-md' : 'border bg-white text-slate-500 hover:bg-slate-100'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-start gap-8 p-6 lg:flex-row">
        <div className="w-full flex-1">
          {activeTab === 'single' && (
            <div className="mx-auto max-w-2xl">
              <GlassRow
                layerKey="single.glass1"
                unavailableState={unavailableLayers['single.glass1'] || null}
                data={config.single}
                onChange={(field, value) => updateConfigLayer('single', field, null, value)}
                catalog={catalog}
              />
            </div>
          )}

          {activeTab === 'laminate' && (
            <LaminateLayersEditor
              laminateConfig={config.laminate}
              catalog={catalog}
              unavailableLayers={unavailableLayers}
              updateConfigLayer={updateConfigLayer}
              onAddLaminateLayer={addLaminateLayer}
              onRemoveLaminateLayer={removeLaminateLayer}
            />
          )}

          {activeTab === 'double' && (
            <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
              <LaminatedPaneEditor assembly="double" paneKey="pane1" config={config} updateConfigLayer={updateConfigLayer} catalog={catalog} unavailableLayers={unavailableLayers} />
              <SpacerConnectorRow value={config.double.spacerId} onChange={(value) => updateConfigLayer('double', 'spacerId', null, value)} catalog={catalog} />
              <LaminatedPaneEditor assembly="double" paneKey="pane2" config={config} updateConfigLayer={updateConfigLayer} catalog={catalog} unavailableLayers={unavailableLayers} />
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="mx-auto w-full max-w-2xl space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
                <CustomItemsTable
                  customItems={customItems}
                  customDraft={customDraft}
                  setCustomDraft={setCustomDraft}
                  onGoToCustomItems={onGoToCustomItems}
                  isStaffContext={isStaffContext}
                />
              </div>
              {isStaffContext && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onGoToCustomItems}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={12} />
                    ساخت آیتم
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:w-[320px]">
          <div className="grid grid-cols-3 gap-3">
            {['width', 'height', 'count'].map((field) => (
              <div key={field} className={`rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm focus-within:border-blue-400 ${(field !== 'count' && isCustomQtyUnit) ? 'opacity-50' : ''}`}>
                <span className="mb-2 block text-[10px] font-black text-slate-500">{field === 'width' ? 'عرض(cm)' : field === 'height' ? 'ارتفاع(cm)' : 'تعداد'}</span>
                <input type="number" name={field} value={dimensions[field]} onChange={onDimensionChange} disabled={field !== 'count' && isCustomQtyUnit} className="w-full bg-transparent text-center text-lg font-black tabular-nums outline-none disabled:cursor-not-allowed" dir="ltr" />
              </div>
            ))}
          </div>

          {isCustomTab ? (
            customDraftState.dimensionError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] font-bold text-red-700 shadow-inner">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <div>{customDraftState.dimensionError}</div>
              </div>
            )
          ) : (
            summaryErrors.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] font-bold text-red-700 shadow-inner">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                <ul className="list-inside list-disc">
                  {summaryErrors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
                </ul>
              </div>
            )
          )}

          <button onClick={onOpenSettingsModal} disabled={isCustomServiceDisabled} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 shadow-sm transition-colors ${isCustomServiceDisabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-400'}`}>
            <Settings size={16} />
            <span className="text-xs font-black">خدمات و الگو</span>
            {!isCustomServiceDisabled && (Object.keys(config.operations || {}).length > 0 || config.pattern?.type !== 'none') && <span className="mr-2 rounded-full bg-amber-500 px-1.5 text-[9px] text-white">ثبت شد</span>}
          </button>
          {isCustomServiceDisabled && (
            <div className="text-[10px] font-bold text-slate-500">برای این واحد، خدمات و الگو غیرفعال است.</div>
          )}

          {isStaffContext && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-1">
                <PriceInput
                  value={itemPricing.overrideUnitPrice}
                  onChange={(value) => setItemPricing((previous) => ({ ...previous, overrideUnitPrice: value }))}
                  placeholder="فی توافقی"
                  className="rounded-lg text-xs text-slate-900"
                />
              </div>
              <div className={`text-[10px] font-bold ${catalogPricingPreview.isBelowFloor ? 'text-red-600' : 'text-slate-500'}`}>
                کف مجاز: {toPN(overrideFloorPrice.toLocaleString())} تومان
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
};
