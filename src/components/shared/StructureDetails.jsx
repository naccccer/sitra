import React from 'react';
import { Layers } from 'lucide-react';
import { toPN } from '../../utils/helpers';

export const StructureDetails = ({ item, catalog }) => {
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