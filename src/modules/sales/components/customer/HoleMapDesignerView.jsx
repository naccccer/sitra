import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { toPN } from '../../../../utils/helpers';
import {
  formatCm,
  formatCmFa,
  edgeYLabel,
  edgeZLabel,
  MAX_HOLE_COUNT,
  HOLE_STEP_CM,
} from '../../hooks/useSettingsModalLogic';

export const HoleMapDesignerView = ({
  widthCm,
  heightCm,
  holeMapDraft,
  activeHoleId,
  setActiveHoleId,
  activeHole,
  holeMapValidation,
  previewHoles,
  canConfirm,
  onClose,
  onAddHoleAtCenter,
  onPreviewClick,
  onUpdateHoleField,
  onDeleteHole,
}) => (
  <div className="fixed inset-0 bg-slate-900/70 z-[70] flex justify-center items-center p-3 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
    <div className="bg-white w-full max-w-6xl rounded-2xl flex flex-col max-h-[95vh] shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-slate-100">
        <h2 className="text-base font-black text-slate-800">طراحی نقشه سوراخ</h2>
        <button onClick={onClose} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800">
          <X size={20} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5" dir="ltr">
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
            <div className="relative mx-auto w-full max-w-[560px] px-10 py-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                عرض: {formatCmFa(widthCm > 0 ? widthCm : '-')} cm
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                عرض: {formatCmFa(widthCm > 0 ? widthCm : '-')} cm
              </div>
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200"
                style={{ writingMode: 'vertical-rl' }}
              >
                ارتفاع: {formatCmFa(heightCm > 0 ? heightCm : '-')} cm
              </div>
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200"
                style={{ writingMode: 'vertical-rl' }}
              >
                ارتفاع: {formatCmFa(heightCm > 0 ? heightCm : '-')} cm
              </div>

              <div
                onClick={onPreviewClick}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onAddHoleAtCenter();
                  }
                }}
                className={`relative w-full rounded-xl border-[3px] border-sky-300 bg-gradient-to-br from-cyan-50 to-slate-100 overflow-hidden shadow-inner ${widthCm <= 0 || heightCm <= 0 || holeMapDraft.holes.length >= MAX_HOLE_COUNT ? 'cursor-not-allowed opacity-80' : 'cursor-crosshair'}`}
                style={{ aspectRatio: `${Math.max(widthCm, 1)} / ${Math.max(heightCm, 1)}` }}
                aria-label="پیش‌نمایش شیشه برای ثبت سوراخ"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.95),rgba(203,213,225,0.4))]" />
                {previewHoles.map(({ hole, xPercent, yPercent, sizePercent }, index) => {
                  const isSelected = hole.id === activeHoleId;
                  const hasError = Boolean(holeMapValidation.itemErrorsById[hole.id]);
                  return (
                    <button
                      key={hole.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveHoleId(hole.id);
                      }}
                      className={`absolute rounded-full border-2 flex items-center justify-center text-[9px] font-black transition-all ${hasError ? 'border-red-500 bg-red-100 text-red-700' : 'border-sky-500 bg-white/95 text-sky-700'} ${isSelected ? 'ring-2 ring-emerald-500 scale-110' : ''}`}
                      style={{
                        left: `${xPercent}%`,
                        top: `${yPercent}%`,
                        width: `${sizePercent}%`,
                        aspectRatio: '1/1',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {toPN(index + 1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 w-full max-w-[430px] justify-self-end" dir="rtl">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onAddHoleAtCenter}
                disabled={widthCm <= 0 || heightCm <= 0 || holeMapDraft.holes.length >= MAX_HOLE_COUNT}
                className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px] font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                افزودن سوراخ
              </button>
              <span className="text-[11px] font-black text-slate-700">تعداد سوراخ: {toPN(holeMapDraft.holes.length)}</span>
            </div>

            <div className="border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/60">
              {holeMapDraft.holes.length === 0 && (
                <div className="text-[10px] text-slate-500 font-bold p-2">هنوز سوراخی ثبت نشده است.</div>
              )}
              {holeMapDraft.holes.map((hole, index) => {
                const rowErrors = holeMapValidation.itemErrorsById[hole.id] || [];
                return (
                  <div key={hole.id} className={`rounded-lg border px-2 py-1.5 flex items-center justify-between gap-2 ${hole.id === activeHoleId ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    <button
                      type="button"
                      onClick={() => setActiveHoleId(hole.id)}
                      className="text-right flex-1"
                    >
                      <div className="text-[11px] font-black text-slate-700">سوراخ {toPN(index + 1)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        قطر {formatCmFa(hole.diameterCm)} | {edgeYLabel(hole.fromYEdge)} {formatCmFa(hole.distanceYCm)} | {edgeZLabel(hole.fromZEdge)} {formatCmFa(hole.distanceZCm)}
                      </div>
                      {rowErrors.length > 0 && <div className="text-[9px] font-black text-red-600 mt-1">نیازمند اصلاح</div>}
                    </button>
                    <button type="button" onClick={() => onDeleteHole(hole.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {activeHole && (
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-3">
                <div className="text-[11px] font-black text-slate-700">ویرایش سوراخ انتخاب‌شده</div>

                <div className="max-w-[220px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">قطر سوراخ (cm)</label>
                  <input
                    type="number"
                    min={HOLE_STEP_CM}
                    step={HOLE_STEP_CM}
                    value={formatCm(activeHole.diameterCm)}
                    onChange={(event) => onUpdateHoleField('diameterCm', event.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="max-w-[180px]">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">مرجع عمودی</label>
                    <select
                      value={activeHole.fromYEdge}
                      onChange={(event) => onUpdateHoleField('fromYEdge', event.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                    >
                      <option value="top">از بالا</option>
                      <option value="bottom">از پایین</option>
                    </select>
                  </div>
                  <div className="max-w-[220px]">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">فاصله از مرجع عمودی (cm)</label>
                    <input
                      type="number"
                      min={0}
                      step={HOLE_STEP_CM}
                      value={formatCm(activeHole.distanceYCm)}
                      onChange={(event) => onUpdateHoleField('distanceYCm', event.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="max-w-[180px]">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">مرجع افقی</label>
                    <select
                      value={activeHole.fromZEdge}
                      onChange={(event) => onUpdateHoleField('fromZEdge', event.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                    >
                      <option value="left">از چپ</option>
                      <option value="right">از راست</option>
                    </select>
                  </div>
                  <div className="max-w-[220px]">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">فاصله از مرجع افقی (cm)</label>
                    <input
                      type="number"
                      min={0}
                      step={HOLE_STEP_CM}
                      value={formatCm(activeHole.distanceZCm)}
                      onChange={(event) => onUpdateHoleField('distanceZCm', event.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>

                {(holeMapValidation.itemErrorsById[activeHole.id] || []).length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-2 py-1.5 text-[10px] font-bold text-red-700 space-y-1">
                    {(holeMapValidation.itemErrorsById[activeHole.id] || []).map((error) => (
                      <div key={error}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {holeMapValidation.globalErrors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] font-bold text-red-700 space-y-1">
                {holeMapValidation.globalErrors.map((error) => (
                  <div key={error}>• {error}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-black">
          بازگشت
        </button>
        <button
          onClick={onClose}
          disabled={!canConfirm}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          تایید نقشه
        </button>
      </div>
    </div>
  </div>
);
