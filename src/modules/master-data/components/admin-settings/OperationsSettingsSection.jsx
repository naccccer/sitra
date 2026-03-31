import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import { resolvePublicAssetUrl } from '@/utils/url';
import { masterDataApi } from '../../services/masterDataApi';
import { CardTitle, DashedActionButton, SettingsCard } from './SettingsUiParts';

const OPERATION_ICON_BASE_PATH = '/icons/operations';
const MAX_ICON_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_ICON_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ALLOWED_ICON_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);

const validateIconFile = (file) => {
  if (!file) return 'فایلی انتخاب نشده است.';
  if (file.size > MAX_ICON_SIZE_BYTES) return 'حجم آیکون نباید بیشتر از 2 مگابایت باشد.';
  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_ICON_TYPES.has(file.type) && !ALLOWED_ICON_EXTENSIONS.has(extension)) {
    return 'فرمت آیکون فقط JPG، PNG، WEBP یا SVG مجاز است.';
  }
  return '';
};

const operationKeyOf = (operation, fallbackIndex) => String(operation?.id || `idx_${fallbackIndex}`);

export const OperationsSettingsSection = ({ draft, setDraft }) => {
  const fileInputRef = useRef(null);
  const [pendingUploadKey, setPendingUploadKey] = useState('');
  const [uploadingByKey, setUploadingByKey] = useState({});
  const [uploadErrorByKey, setUploadErrorByKey] = useState({});
  const [previewErrorByKey, setPreviewErrorByKey] = useState({});

  const operationsWithKey = useMemo(
    () => (draft.operations || []).map((operation, index) => ({ operation, index, opKey: operationKeyOf(operation, index) })),
    [draft.operations],
  );

  const updateOperation = (index, patch) => {
    setDraft((previous) => {
      const nextOperations = [...(previous.operations || [])];
      nextOperations[index] = { ...nextOperations[index], ...patch };
      return { ...previous, operations: nextOperations };
    });
  };

  const openUploader = (opKey) => {
    setPendingUploadKey(opKey);
    fileInputRef.current?.click();
  };

  const onIconFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !pendingUploadKey) return;

    const validationError = validateIconFile(file);
    if (validationError) {
      setUploadErrorByKey((previous) => ({ ...previous, [pendingUploadKey]: validationError }));
      return;
    }

    const target = operationsWithKey.find((item) => item.opKey === pendingUploadKey);
    if (!target) {
      setPendingUploadKey('');
      return;
    }

    setUploadingByKey((previous) => ({ ...previous, [pendingUploadKey]: true }));
    setUploadErrorByKey((previous) => ({ ...previous, [pendingUploadKey]: '' }));

    try {
      const response = await masterDataApi.uploadOperationIcon(file);
      const filePath = String(response?.filePath || '').trim();
      if (!filePath) {
        throw new Error('مسیر فایل آیکون از سرور دریافت نشد.');
      }
      updateOperation(target.index, { iconFile: filePath });
      setPreviewErrorByKey((previous) => ({ ...previous, [pendingUploadKey]: false }));
    } catch (error) {
      setUploadErrorByKey((previous) => ({ ...previous, [pendingUploadKey]: error?.message || 'آپلود آیکون ناموفق بود.' }));
    } finally {
      setUploadingByKey((previous) => ({ ...previous, [pendingUploadKey]: false }));
      setPendingUploadKey('');
    }
  };

  return (
    <div className="space-y-4">
      <SettingsCard>
        <CardTitle
          title="مدیریت خدمات و جاساز"
          badge={`${toPN((draft.operations || []).length)} مورد`}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
          className="hidden"
          onChange={onIconFileSelected}
        />

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          {operationsWithKey.map(({ operation, index, opKey }) => {
            const iconSrc = resolvePublicAssetUrl(operation?.iconFile || '', OPERATION_ICON_BASE_PATH);
            const showIcon = Boolean(iconSrc) && !previewErrorByKey[opKey];
            const isUploading = Boolean(uploadingByKey[opKey]);

            return (
              <div key={operation.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3.5 shadow-sm">
                <div className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
                    {showIcon ? (
                      <img
                        src={iconSrc}
                        alt={operation?.title || 'service'}
                        className="h-full w-full object-contain p-2"
                        onError={() => setPreviewErrorByKey((previous) => ({ ...previous, [opKey]: true }))}
                      />
                    ) : (
                      <span className="text-2xl font-black text-slate-400">{String(operation?.title || '?').charAt(0)}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <input
                      type="text"
                      value={operation.title}
                      onChange={(event) => updateOperation(index, { title: event.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-blue-300"
                      placeholder="عنوان خدمت یا جاساز"
                    />
                    <button
                      type="button"
                      onClick={() => openUploader(opKey)}
                      disabled={isUploading}
                      className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-black text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
                    >
                      {isUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                      {isUploading ? 'در حال آپلود...' : 'آپلود تصویر'}
                    </button>
                  </div>

                  <button
                    onClick={() => setDraft((previous) => ({ ...previous, operations: (previous.operations || []).filter((item) => item.id !== operation.id) }))}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <PriceInput value={operation.price} onChange={(value) => updateOperation(index, { price: value })} />
                  </div>

                  <select
                    value={operation.unit || 'qty'}
                    onChange={(event) => updateOperation(index, { unit: event.target.value })}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold outline-none"
                  >
                    <option value="qty">عدد</option>
                    <option value="m_length">متر طول</option>
                    <option value="m_square">مساحت</option>
                  </select>

                </div>

                {uploadErrorByKey[opKey] ? (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
                    {uploadErrorByKey[opKey]}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <DashedActionButton
          onClick={() => setDraft((previous) => ({ ...previous, operations: [...(previous.operations || []), { id: Date.now().toString(), title: 'خدمت جدید', price: 0, unit: 'qty', iconFile: '' }] }))}
        >
          <Plus size={14} /> افزودن خدمات و جاساز
        </DashedActionButton>
      </SettingsCard>
    </div>
  );
};
