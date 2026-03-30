import React, { useState } from 'react';
import { toPN } from '@/utils/helpers';
import { resolveApiFileUrl, resolvePublicAssetUrl } from '@/utils/url';
import { PdfPagePreview } from './PdfPagePreview';
const OPERATION_ICON_BASE_PATH = '/icons/operations';

const getDataUrlMimeType = (dataUrl = '') => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return '';
  const semiIndex = dataUrl.indexOf(';');
  if (semiIndex <= 5) return '';
  return dataUrl.slice(5, semiIndex).toLowerCase();
};
const getFileExtension = (fileName = '') => {
  const normalized = String(fileName || '').trim().toLowerCase();
  if (!normalized.includes('.')) return '';
  const parts = normalized.split('.');
  return parts[parts.length - 1] || '';
};
const isImageMime = (mime = '') => String(mime || '').toLowerCase().startsWith('image/');
const isPdfMime = (mime = '') => String(mime || '').toLowerCase() === 'application/pdf';
const parsePositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};
const formatCm = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return toPN('0');
  const rounded = Math.round(numeric * 10) / 10;
  return toPN(rounded.toString());
};

const holeCenterFromEdges = (hole, widthCm, heightCm) => {
  const distanceY = Math.max(0, Number(hole?.distanceYCm) || 0);
  const distanceZ = Math.max(0, Number(hole?.distanceZCm) || 0);
  const fromYEdge = hole?.fromYEdge === 'bottom' ? 'bottom' : 'top';
  const fromZEdge = hole?.fromZEdge === 'right' ? 'right' : 'left';

  return {
    centerX: fromZEdge === 'left' ? distanceZ : widthCm - distanceZ,
    centerY: fromYEdge === 'top' ? distanceY : heightCm - distanceY,
  };
};

export const OperationChip = ({ title, iconFile, qty = 1, compact = false }) => {
  const [iconFailed, setIconFailed] = useState(false);
  const normalizedTitle = title || 'خدمت';
  const iconSrc = resolvePublicAssetUrl(iconFile, OPERATION_ICON_BASE_PATH);
  const showFallback = !iconSrc || iconFailed;
  const className = compact
    ? 'flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5'
    : 'rounded-lg border border-slate-300 bg-white overflow-hidden flex flex-col aspect-[2/3]';

  return (
    <div className={className}>
      <div className={compact ? 'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white' : 'flex-1 flex items-center justify-center p-1 bg-slate-50/40'}>
        {showFallback ? (
          <div className={compact ? 'flex h-full w-full items-center justify-center text-lg font-black text-slate-400' : 'w-full h-full flex items-center justify-center text-2xl font-black text-slate-400'}>
            {normalizedTitle.charAt(0)}
          </div>
        ) : (
          <img
            src={iconSrc}
            alt={normalizedTitle}
            loading="eager"
            decoding="async"
            onError={() => setIconFailed(true)}
            className={compact ? 'h-full w-full object-contain p-1' : 'w-full h-full object-contain'}
          />
        )}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : 'min-h-12 px-1.5 py-1 text-center border-t border-slate-200 flex flex-col items-center justify-center'}>
        <div className={compact ? 'max-h-8 overflow-hidden text-[10px] leading-4 font-black text-slate-700' : 'text-[10px] leading-4 font-black text-slate-700'}>
          {normalizedTitle}
        </div>
        {qty > 1 && <div className="mt-0.5 text-[9px] font-bold text-slate-500">× {toPN(qty)}</div>}
      </div>
    </div>
  );
};

export const PatternPreview = ({ pattern, width, height }) => {
  const type = pattern?.type || 'none';

  if (type === 'carton') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
        این آیتم با الگوی فیزیکی (کارتن/شابلون) ثبت شده است.
      </div>
    );
  }

  if (type === 'hole_map') {
    const holeMap = pattern?.holeMap && typeof pattern.holeMap === 'object' ? pattern.holeMap : {};
    const holes = Array.isArray(holeMap?.holes) ? holeMap.holes : [];
    const widthCm = parsePositiveNumber(width);
    const heightCm = parsePositiveNumber(height);
    const canRenderPreview = widthCm > 0 && heightCm > 0;

    const normalizedHoles = holes.map((hole, index) => {
      const diameterCm = Math.max(0, Number(hole?.diameterCm) || 0);
      const fromYEdge = hole?.fromYEdge === 'bottom' ? 'bottom' : 'top';
      const fromZEdge = hole?.fromZEdge === 'right' ? 'right' : 'left';
      const distanceYCm = Math.max(0, Number(hole?.distanceYCm) || 0);
      const distanceZCm = Math.max(0, Number(hole?.distanceZCm) || 0);
      const center = canRenderPreview
        ? holeCenterFromEdges({ fromYEdge, fromZEdge, distanceYCm, distanceZCm }, widthCm, heightCm)
        : { centerX: 0, centerY: 0 };

      return {
        id: String(hole?.id || `hole_${index}`),
        index,
        diameterCm,
        fromYEdge,
        fromZEdge,
        distanceYCm,
        distanceZCm,
        centerX: center.centerX,
        centerY: center.centerY,
      };
    });

    const fromYLabel = (edge) => (edge === 'bottom' ? 'از پایین' : 'از بالا');
    const fromZLabel = (edge) => (edge === 'right' ? 'از راست' : 'از چپ');

    return (
      <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5">
        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold text-slate-700">
          <div className="rounded-md border border-emerald-200 bg-white px-2 py-0.5">
            تعداد سوراخ: <span className="font-black">{toPN(normalizedHoles.length)}</span>
          </div>
          <div className="rounded-md border border-emerald-200 bg-white px-2 py-0.5">
            ابعاد: <span className="font-black">{widthCm > 0 ? toPN(widthCm) : '-'} × {heightCm > 0 ? toPN(heightCm) : '-'}</span> cm
          </div>
        </div>

        {canRenderPreview ? (
          <div className="rounded-lg border border-emerald-200 bg-white p-1.5">
            <svg viewBox={`0 0 ${widthCm} ${heightCm}`} className="pattern-preview-thumb h-[44mm] w-full rounded-md bg-gradient-to-br from-cyan-50 to-slate-100">
              <rect x="0" y="0" width={widthCm} height={heightCm} fill="transparent" stroke="#94a3b8" strokeWidth={Math.max(0.8, Math.min(widthCm, heightCm) * 0.003)} />
              {normalizedHoles.map((hole) => (
                <g key={hole.id}>
                  <circle
                    cx={hole.centerX}
                    cy={hole.centerY}
                    r={Math.max(0.2, hole.diameterCm / 2)}
                    fill="rgba(14,116,144,0.10)"
                    stroke="#0e7490"
                    strokeWidth={Math.max(0.2, hole.diameterCm * 0.05)}
                  />
                  <text
                    x={hole.centerX}
                    y={hole.centerY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0f172a"
                    fontSize={Math.max(1.6, Math.min(widthCm, heightCm) * 0.045)}
                    fontWeight="700"
                  >
                    {hole.index + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-[9px] font-bold text-slate-500">
            برای پیش‌نمایش موقعیت سوراخ‌ها، ابعاد آیتم باید معتبر باشد.
          </div>
        )}

        {normalizedHoles.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
            <table className="w-full text-[9px]">
              <thead className="bg-emerald-100/70 text-emerald-900">
                <tr>
                  <th className="px-1.5 py-0.5 text-right font-black">#</th>
                  <th className="px-1.5 py-0.5 text-right font-black">x (قطر)</th>
                  <th className="px-1.5 py-0.5 text-right font-black">y</th>
                  <th className="px-1.5 py-0.5 text-right font-black">z</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {normalizedHoles.map((hole) => (
                  <tr key={hole.id} className="text-slate-700">
                    <td className="px-1.5 py-0.5 font-bold">{toPN(hole.index + 1)}</td>
                    <td className="px-1.5 py-0.5 font-bold">{formatCm(hole.diameterCm)} cm</td>
                    <td className="px-1.5 py-0.5 font-bold">{fromYLabel(hole.fromYEdge)}: {formatCm(hole.distanceYCm)}</td>
                    <td className="px-1.5 py-0.5 font-bold">{fromZLabel(hole.fromZEdge)}: {formatCm(hole.distanceZCm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-[9px] font-bold text-slate-500">
            برای این آیتم هنوز سوراخی در نقشه ثبت نشده است.
          </div>
        )}
      </div>
    );
  }

  if (type !== 'upload') {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-bold text-slate-500">
        برای این آیتم الگوی آپلودی ثبت نشده است.
      </div>
    );
  }

  const fileName = pattern?.fileName || 'pattern-file';
  const previewDataUrl = pattern?.previewDataUrl || '';
  const filePath = pattern?.filePath || pattern?.path || pattern?.url || '';
  const resolvedFileUrl = resolveApiFileUrl(filePath);
  const mimeType = String(pattern?.mimeType || getDataUrlMimeType(previewDataUrl)).toLowerCase();
  const fileExtension = getFileExtension(fileName) || getFileExtension(filePath);
  const hasPreviewSource = Boolean(previewDataUrl || resolvedFileUrl);
  const isPdfPreview = hasPreviewSource && (isPdfMime(mimeType) || fileExtension === 'pdf');
  const isCad = ['dwg', 'dxf'].includes(fileExtension)
    || mimeType.includes('vnd.dwg')
    || mimeType.includes('vnd.dxf')
    || mimeType.includes('/dxf')
    || mimeType.includes('/dwg');
  const isImage = hasPreviewSource && (
    previewDataUrl.startsWith('data:image/')
    || (!previewDataUrl && (isImageMime(mimeType) || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension)))
  );
  const canTryEmbeddedPreview = hasPreviewSource && !isImage && !isCad && !isPdfPreview;
  const previewSource = previewDataUrl || resolvedFileUrl;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-slate-600 break-all">
        {fileName}
      </div>

      {isImage && (
        <img
          src={previewSource}
          alt={fileName}
          loading="eager"
          className="pattern-preview-thumb w-full rounded-lg border border-slate-200 bg-white object-contain"
        />
      )}

      {isPdfPreview && (
        <PdfPagePreview src={previewSource} className="pdf-preview-thumb" />
      )}

      {canTryEmbeddedPreview && (
        <div className="space-y-2">
          <object
            data={previewSource}
            type={mimeType || 'application/pdf'}
            className="pattern-preview-thumb w-full rounded-lg border border-slate-200 bg-white"
            aria-label={`preview-${fileName}`}
          >
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[10px] font-bold text-slate-500">
              پیش‌نمایش فایل قابل نمایش نبود. از نام فایل برای پیگیری استفاده شود.
            </div>
          </object>
          <div className="text-[10px] font-bold text-slate-500">
            اگر پیش‌نمایش نمایش داده نشد، از نام فایل برای پیگیری استفاده شود.
          </div>
        </div>
      )}

      {hasPreviewSource && isCad && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-700">
          پیش‌نمایش مستقیم فایل‌های CAD (DWG/DXF) در فاکتور پشتیبانی نمی‌شود. فایل را باز یا دانلود کنید.
        </div>
      )}

      {hasPreviewSource && !isImage && !isPdfPreview && !canTryEmbeddedPreview && !isCad && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[10px] font-bold text-slate-500">
          پیش‌نمایش مستقیم برای این نوع فایل در فاکتور قابل نمایش نیست.
        </div>
      )}

      {resolvedFileUrl && (
        <a
          href={resolvedFileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700"
        >
          باز کردن فایل الگو
        </a>
      )}

      {!hasPreviewSource && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[10px] font-bold text-slate-500">
          پیش‌نمایش فایل در داده سفارش موجود نیست.
        </div>
      )}
    </div>
  );
};
