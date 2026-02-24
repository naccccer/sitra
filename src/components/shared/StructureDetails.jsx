import React from 'react';
import { Layers } from 'lucide-react';
import { toPN } from '../../utils/helpers';

export const StructureDetails = ({ item, catalog }) => {
  if ((item?.itemType || 'catalog') === 'manual') {
    const manual = item?.manual || {};
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-black text-amber-700">آیتم دستی</div>
        <div className="text-[10px] font-bold text-slate-600">
          {toPN(manual.qty ?? item?.dimensions?.count ?? 1)} {manual.unitLabel || 'عدد'}
        </div>
        {manual.description && <div className="text-[10px] font-bold text-slate-500">{manual.description}</div>}
        <div className="text-[10px] font-bold text-slate-500 flex flex-wrap gap-2">
          <span>{manual.taxable ? 'مشمول مالیات' : 'معاف از مالیات'}</span>
          <span>{manual.productionImpact ? 'تولیدی' : 'غیرتولیدی'}</span>
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
    const thick = layer?.thick ?? '-';
    return `${glass?.title || 'فلوت'} ${toPN(thick)}mm`;
  };

  const getSpacerLabel = (spacerId) => {
    return catalog?.connectors?.spacers?.find((s) => s.id === spacerId)?.title || 'اسپیسر';
  };

  const getInterlayerLabel = (interlayerId) => {
    return catalog?.connectors?.interlayers?.find((x) => x.id === interlayerId)?.title || 'PVB';
  };

  const renderGlassLayerRow = (marker, layer = {}) => (
    <div className="flex items-center gap-1 text-[11px]">
      <span className="text-slate-400 font-black">{toPN(marker)}</span>
      <span className={layer?.isSekurit ? 'text-rose-600 font-black' : 'text-slate-700 font-black'}>
        {getGlassLabel(layer)}
      </span>
      {layer?.isSekurit && <span className="bg-rose-100 text-rose-700 px-1 rounded text-[8px] font-black mr-1">سکوریت</span>}
      {layer?.hasEdge && <span className="bg-indigo-100 text-indigo-700 px-1 rounded text-[8px] font-black mr-1">ابزار</span>}
    </div>
  );

  const renderLaminatedBlock = ({ prefix = '1', title = 'لمینت', config = {} }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-[11px]">
        <span className="text-slate-400 font-black">{toPN(`${prefix}-`)}</span>
        <span className="text-slate-700 font-black">{title}</span>
      </div>
      <div className="pr-4 space-y-1">
        {renderGlassLayerRow(`${prefix}.1-`, config?.glass1 || {})}
        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 py-0.5">
          <Layers size={10} className="opacity-50" />
          {getInterlayerLabel(config?.interlayerId)}
        </div>
        {renderGlassLayerRow(`${prefix}.2-`, config?.glass2 || {})}
      </div>
    </div>
  );

  const patternLabel = () => {
    if (!hasPattern) return '';
    if (item.pattern.type === 'upload') {
      return item?.pattern?.fileName
        ? `الگو (فایل پیوست: ${item.pattern.fileName})`
        : 'الگو (فایل پیوست)';
    }
    return 'الگو (کارتن)';
  };

  return (
    <div className="space-y-1">
      {item.activeTab === 'single' && renderGlassLayerRow('1-', item?.config || {})}

      {item.activeTab === 'double' && (
        <>
          {item?.config?.pane1?.isLaminated ? (
            renderLaminatedBlock({ prefix: '1', title: 'جداره بیرونی (لمینت)', config: item.config.pane1 })
          ) : (
            renderGlassLayerRow('1-', item?.config?.pane1?.glass1 || {})
          )}

          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 py-0.5 pr-5">
            <Layers size={10} className="opacity-50" />
            {getSpacerLabel(item?.config?.spacerId)}
          </div>

          {item?.config?.pane2?.isLaminated ? (
            renderLaminatedBlock({ prefix: '2', title: 'جداره داخلی (لمینت)', config: item.config.pane2 })
          ) : (
            renderGlassLayerRow('2-', item?.config?.pane2?.glass1 || {})
          )}
        </>
      )}

      {item.activeTab === 'laminate' && renderLaminatedBlock({ prefix: '1', title: 'شیشه لمینت', config: item?.config || {} })}

      {hasServices && (
        <div className="pt-1.5 mt-1.5 border-t border-slate-200/70 border-dashed text-amber-600/90 text-[10px] space-y-0.5 flex flex-wrap gap-2">
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
