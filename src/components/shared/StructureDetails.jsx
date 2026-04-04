import React from 'react';
import { Layers } from 'lucide-react';
import { normalizeCustomUnitLabel } from '@/utils/customItemUnits';
import { normalizeLaminateConfig } from '@/utils/laminateConfig';
import { toPN } from '../../utils/helpers';

const DEFAULT_UNIT_LABEL = '\u0639\u062f\u062f';

const formatThicknessLabel = (thick) => {
  if (thick === undefined || thick === null || thick === '') return '-';
  const raw = String(thick);
  return raw.endsWith('mm') ? `${toPN(raw.slice(0, -2))}mm` : `${toPN(raw)}mm`;
};

export const StructureDetails = ({ item, catalog }) => {
  const itemType = String(item?.itemType || 'catalog');

  if (itemType === 'manual') {
    const manual = item?.manual || {};
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-black text-[rgb(var(--ui-accent-strong))]">آیتم دستی</div>
        <div className="text-[10px] font-bold text-slate-600">
          {toPN(manual.qty ?? item?.dimensions?.count ?? 1)} {manual.unitLabel || DEFAULT_UNIT_LABEL}
        </div>
        {manual.description && <div className="text-[10px] font-bold text-slate-500">{manual.description}</div>}
        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
          <span>{manual.taxable ? 'مشمول مالیات' : 'معاف از مالیات'}</span>
        </div>
      </div>
    );
  }

  if (itemType === 'custom' || item?.activeTab === 'custom') {
    const custom = item?.custom || {};
    const unitLabel = normalizeCustomUnitLabel(custom.unitLabel || item?.config?.unitLabel || DEFAULT_UNIT_LABEL);
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-black text-[rgb(var(--ui-accent-strong))]">آیتم سفارشی</div>
        <div className="text-[10px] font-bold text-slate-600">
          {toPN(item?.dimensions?.count ?? 1)} {unitLabel}
        </div>
        <div className="text-[10px] font-bold text-slate-500">
          قیمت پایه: {toPN((Number(custom.baseUnitPrice || 0)).toLocaleString())} تومان
        </div>
      </div>
    );
  }

  const ops = item?.operations && typeof item.operations === 'object' ? item.operations : {};
  const opsKeys = Object.keys(ops);
  const hasPattern = item?.pattern?.type && item.pattern.type !== 'none';
  const hasServices = opsKeys.length > 0 || hasPattern;

  const getGlassById = (glassId) => {
    const list = catalog?.glasses || [];
    return list.find((g) => g.id === glassId) || list[0] || null;
  };

  const getGlassLabel = (layer = {}) => {
    const glass = getGlassById(layer?.glassId);
    return `${glass?.title || 'فلوت'} ${formatThicknessLabel(layer?.thick)}`;
  };

  const getSpacerLabel = (spacerId) => catalog?.connectors?.spacers?.find((s) => s.id === spacerId)?.title || 'اسپیسر';
  const renderGlassLayerRow = (marker, layer = {}) => (
    <div className="flex items-center gap-1 text-[11px]">
      <span className="font-black text-slate-400">{toPN(marker)}</span>
      <span className={layer?.isSekurit ? 'font-black text-rose-600' : 'font-black text-slate-700'}>
        {getGlassLabel(layer)}
      </span>
      {layer?.isSekurit && <span className="mr-1 rounded bg-rose-100 px-1 text-[8px] font-black text-rose-700">سکوریت</span>}
      {layer?.hasEdge && <span className="mr-1 rounded bg-[rgb(var(--ui-accent-muted))] px-1 text-[8px] font-black text-[rgb(var(--ui-accent-strong))]">ابزار</span>}
    </div>
  );

  const renderLaminatedBlock = ({ prefix = '1', title = 'لمینت', config = {} }) => {
    const hasLaminateData = Array.isArray(config?.layers) ? config.layers.length > 0 : Boolean(config?.glass1 || config?.glass2);
    if (!hasLaminateData) return null;

    const laminateConfig = normalizeLaminateConfig(config);
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[11px]">
          <span className="font-black text-slate-400">{toPN(`${prefix}-`)}</span>
          <span className="font-black text-slate-700">{title}</span>
        </div>
        <div className="space-y-1 pr-4">
          {laminateConfig.layers.map((layer, index) => (
            <div key={`${prefix}-${index}`}>
              {renderGlassLayerRow(`${prefix}.${index + 1}-`, layer)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const patternLabel = () => {
    if (!hasPattern) return '';
    if (item.pattern.type === 'upload') {
      return item?.pattern?.fileName
        ? `الگو (فایل پیوست: ${item.pattern.fileName})`
        : 'الگو (فایل پیوست)';
    }
    if (item.pattern.type === 'hole_map') {
      const holeCount = Array.isArray(item?.pattern?.holeMap?.holes) ? item.pattern.holeMap.holes.length : 0;
      return `نقشه سوراخ (${toPN(holeCount)} سوراخ)`;
    }
    return 'الگو (کارتن)';
  };

  return (
    <div className="space-y-1">
      {item.activeTab === 'single' && renderGlassLayerRow('1-', item?.config || {})}

      {item.activeTab === 'double' && (
        <>
          {item?.config?.pane1?.isLaminated
            ? renderLaminatedBlock({ prefix: '1', title: 'جداره بیرونی (لمینت)', config: item.config.pane1 })
            : renderGlassLayerRow('1-', item?.config?.pane1?.glass1 || {})}

          <div className="flex items-center gap-2 py-0.5 pr-5 text-[10px] font-bold text-blue-500">
            <Layers size={10} className="opacity-50" />
            {getSpacerLabel(item?.config?.spacerId)}
          </div>

          {item?.config?.pane2?.isLaminated
            ? renderLaminatedBlock({ prefix: '2', title: 'جداره داخلی (لمینت)', config: item.config.pane2 })
            : renderGlassLayerRow('2-', item?.config?.pane2?.glass1 || {})}
        </>
      )}

      {item.activeTab === 'laminate' && renderLaminatedBlock({ prefix: '1', title: 'شیشه لمینت', config: item?.config || {} })}

      {hasServices && (
        <div className="mt-1.5 flex flex-wrap gap-2 space-y-0.5 border-t border-dashed border-slate-200/70 pt-1.5 text-[10px] text-[rgb(var(--ui-accent-strong))]/90">
          {opsKeys.map((serviceId) => {
            const title = catalog?.operations?.find((o) => o.id === serviceId)?.title || 'خدمت';
            const qty = Number(ops[serviceId] || 0);
            const qtyLabel = qty > 1 ? ` × ${toPN(qty)}` : '';
            return <div key={serviceId}>+ {title}{qtyLabel}</div>;
          })}
          {hasPattern && <div>+ {patternLabel()}</div>}
        </div>
      )}
    </div>
  );
};
