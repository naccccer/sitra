import React, { useState } from 'react';
import { X, CheckCircle2, UploadCloud, FileBox, MapPin, Plus, Trash2 } from 'lucide-react';
import { toPN, FACTORY_ADDRESS } from '../../../../utils/helpers';
import {
  useSettingsModalLogic,
  formatCm,
  formatCmFa,
  edgeYLabel,
  edgeZLabel,
  MAX_HOLE_COUNT,
  HOLE_STEP_CM,
} from '../../hooks/useSettingsModalLogic';

const OPERATION_ICON_BASE_PATH = '/icons/operations';

const OperationIcon = ({ title, iconFile }) => {
  const [hasError, setHasError] = useState(false);
  const iconPath = iconFile ? `${OPERATION_ICON_BASE_PATH}/${iconFile}` : null;

  if (!iconPath || hasError) {
    return (
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">
        {title?.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <img
      src={iconPath}
      alt={title || 'service'}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-30 h-30 object-contain"
    />
  );
};

export const SettingsModal = ({ setModalMode, config, setConfig, catalog, dimensions }) => {
  const {
    view,
    setView,
    pattern,
    setPattern,
    selectedServices,
    holeMapDraft,
    activeHoleId,
    setActiveHoleId,
    activeHole,
    isUploadingPattern,
    fileInputRef,
    widthCm,
    heightCm,
    holeMapValidation,
    previewHoles,
    canSave,
    toggleService,
    openHoleMapDesigner,
    addHoleAtCenter,
    handlePreviewClick,
    updateActiveHoleField,
    deleteHole,
    handleFileUpload,
    handleSave,
  } = useSettingsModalLogic({ config, setConfig, setModalMode, dimensions });

  if (view === 'catalog') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[60] flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
        <div className="bg-white w-full max-w-3xl rounded-2xl flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95">
          <div className="flex justify-between p-4 border-b border-slate-100">
            <h2 className="text-sm font-black">انتخاب خدمات و جاساز</h2>
            <button onClick={() => setView('main')} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800">
              <X size={18} />
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {catalog.operations.map((service) => (
              <div
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`cursor-pointer bg-white border-2 rounded-xl overflow-hidden flex flex-col aspect-[2/3] max-w-[150px] w-full justify-self-center transition-all ${selectedServices[service.id] ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex-1 flex items-center justify-center relative p-1">
                  <OperationIcon title={service.title} iconFile={service.iconFile} />
                  {selectedServices[service.id] && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </div>
                <div className="min-h-12 px-2 py-2 text-center text-[10px] leading-4 font-bold border-t border-slate-100 text-slate-700 flex items-center justify-center">
                  {service.title}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <button onClick={() => setView('main')} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-3 rounded-xl text-sm font-black shadow-md">
              تایید انتخاب‌ها
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'holeMap') {
    const canConfirmDesigner = holeMapValidation.isValid;

    return (
      <div className="fixed inset-0 bg-slate-900/70 z-[70] flex justify-center items-center p-3 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
        <div className="bg-white w-full max-w-6xl rounded-2xl flex flex-col max-h-[95vh] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-800">طراحی نقشه سوراخ</h2>
            <button onClick={() => setView('main')} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800">
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
                    onClick={handlePreviewClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        addHoleAtCenter();
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
                    onClick={addHoleAtCenter}
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
                        <button type="button" onClick={() => deleteHole(hole.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
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
                        onChange={(event) => updateActiveHoleField('diameterCm', event.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="max-w-[180px]">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">مرجع عمودی</label>
                        <select
                          value={activeHole.fromYEdge}
                          onChange={(event) => updateActiveHoleField('fromYEdge', event.target.value)}
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
                          onChange={(event) => updateActiveHoleField('distanceYCm', event.target.value)}
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
                          onChange={(event) => updateActiveHoleField('fromZEdge', event.target.value)}
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
                          onChange={(event) => updateActiveHoleField('distanceZCm', event.target.value)}
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
            <button onClick={() => setView('main')} className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-black">
              بازگشت
            </button>
            <button
              onClick={() => setView('main')}
              disabled={!canConfirmDesigner}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              تایید نقشه
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <div className="bg-white w-full max-w-3xl rounded-2xl flex flex-col shadow-2xl animate-in fade-in max-h-[92vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-800">خدمات جانبی و الگو</h2>
          <button onClick={() => setModalMode(null)} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-800">۱. خدمات و جاساز</h3>
              {Object.keys(selectedServices).length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  {toPN(Object.keys(selectedServices).length)} مورد انتخاب شده
                </span>
              )}
            </div>

            {Object.keys(selectedServices).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.keys(selectedServices).map((id) => {
                  const title = catalog.operations.find((o) => o.id === id)?.title || 'خدمت ناشناس';
                  return (
                    <div key={id} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
                      <span className="text-xs font-bold text-slate-700 before:content-['•'] before:mr-1 before:text-blue-400 before:ml-2">{title}</span>
                      <button onClick={() => toggleService(id)} className="text-red-400 hover:text-white hover:bg-red-500 p-1.5 bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => setView('catalog')} className="w-full border-2 border-dashed border-blue-300 text-blue-600 bg-white hover:bg-blue-50 py-3 rounded-xl text-xs font-black flex justify-center items-center gap-2 transition-colors">
              <Plus size={16} />
              انتخاب / ویرایش سوراخ‌ها و جاسازها
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 mb-4">۲. نقشه یا الگو</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setPattern({ type: 'none', fileName: '' })}
                className={`py-3.5 rounded-xl text-xs font-bold border transition-all ${pattern.type === 'none' ? 'border-slate-800 shadow-md bg-white text-slate-800 ring-2 ring-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
              >
                سفارش فاقد الگو (ابعاد مشخص است)
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.dwg,.dxf,.jpg,.png" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPattern}
                  className={`py-3.5 border rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${pattern.type === 'upload' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-2 ring-blue-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <UploadCloud size={18} />
                    {isUploadingPattern ? 'در حال آپلود...' : 'آپلود فایل نقشه'}
                  </div>
                  {pattern.type === 'upload' && pattern.fileName && (
                    <span className="text-[9px] font-mono text-blue-500 truncate w-32 text-center bg-white px-2 py-0.5 rounded-full border border-blue-100">
                      {pattern.fileName}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setPattern({ type: 'carton', fileName: '' })}
                  className={`py-3.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${pattern.type === 'carton' ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-md ring-2 ring-amber-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <FileBox size={18} />
                  ارسال فیزیکی الگو
                </button>

                <button
                  onClick={openHoleMapDesigner}
                  className={`py-3.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${pattern.type === 'hole_map' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md ring-2 ring-emerald-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <MapPin size={18} />
                  نقشه سوراخ
                </button>
              </div>

              {pattern.type === 'carton' && (
                <div className="mt-3 bg-white border-2 border-amber-300 rounded-xl p-4 flex gap-4 items-center shadow-sm animate-in slide-in-from-top-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed font-bold">
                    <span className="block text-amber-600 mb-1 text-[10px] font-black tracking-wide">
                      آدرس کارخانه جهت ارسال فیزیکی (کارتن/شابلون):
                    </span>
                    {FACTORY_ADDRESS}
                  </div>
                </div>
              )}

              {pattern.type === 'hole_map' && (
                <div className="mt-2 bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    <div>ابعاد شیشه: <span className="font-black">{formatCmFa(widthCm > 0 ? widthCm : '-')} × {formatCmFa(heightCm > 0 ? heightCm : '-')}</span> سانتی‌متر</div>
                    <div className="mt-1">تعداد سوراخ: <span className="font-black">{toPN(holeMapDraft.holes.length)}</span></div>
                  </div>
                  <button
                    onClick={openHoleMapDesigner}
                    className="w-full py-3 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-800 text-xs font-black"
                  >
                    باز کردن پنجره بزرگ طراحی نقشه سوراخ
                  </button>
                  {holeMapValidation.globalErrors.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] font-bold text-red-700 space-y-1">
                      {holeMapValidation.globalErrors.map((error) => (
                        <div key={error}>• {error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors text-white py-3.5 rounded-xl text-sm font-black shadow-lg"
          >
            تایید و ثبت در ردیف سفارش
          </button>
        </div>
      </div>
    </div>
  );
};
