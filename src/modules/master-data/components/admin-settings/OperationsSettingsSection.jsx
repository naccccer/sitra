import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import { resolvePublicAssetUrl } from '@/utils/url';
import { masterDataApi } from '../../services/masterDataApi';
import {
  CompactField,
  CompactSelect,
  CompactTextInput,
  DangerIconButton,
  DashedActionButton,
  FieldLabel,
  InputShell,
  SettingsCard,
  SettingsInlineGroup,
  SettingsSection,
} from './SettingsUiParts';

const OPERATION_ICON_BASE_PATH = '/icons/operations';
const MAX_ICON_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_ICON_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ALLOWED_ICON_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);

const validateIconFile = (file) => {
  if (!file) return 'فایلی انتخاب نشده است.';
  if (file.size > MAX_ICON_SIZE_BYTES) return 'حجم آیکون نباید بیشتر از ۲ مگابایت باشد.';
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
    <SettingsSection title="مدیریت خدمات و جاساز" badge={`${toPN((draft.operations || []).length)} مورد`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
        className="hidden"
        onChange={onIconFileSelected}
      />

      <div className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {operationsWithKey.map(({ operation, index, opKey }) => {
            const iconSrc = resolvePublicAssetUrl(operation?.iconFile || '', OPERATION_ICON_BASE_PATH);
            const showIcon = Boolean(iconSrc) && !previewErrorByKey[opKey];
            const isUploading = Boolean(uploadingByKey[opKey]);

            return (
              <SettingsCard key={operation.id} className="bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {showIcon ? (
                        <img
                          src={iconSrc}
                          alt={operation?.title || 'service'}
                          className="h-full w-full object-contain p-2"
                          onError={() => setPreviewErrorByKey((previous) => ({ ...previous, [opKey]: true }))}
                        />
                      ) : (
                        <span className="text-xl font-black text-slate-400">{String(operation?.title || '?').charAt(0)}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <FieldLabel>عنوان خدمت</FieldLabel>
                      <CompactTextInput
                        dir="rtl"
                        className="w-[160px] max-w-full text-right"
                        value={operation.title}
                        onChange={(event) => updateOperation(index, { title: event.target.value })}
                        placeholder="عنوان خدمت یا جاساز"
                      />
                      <button
                        type="button"
                        onClick={() => openUploader(opKey)}
                        disabled={isUploading}
                        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                        {isUploading ? 'در حال آپلود...' : 'آپلود تصویر'}
                      </button>
                    </div>
                  </div>

                  <DangerIconButton onClick={() => setDraft((previous) => ({ ...previous, operations: (previous.operations || []).filter((item) => item.id !== operation.id) }))}>
                    <Trash2 size={16} />
                  </DangerIconButton>
                </div>

                <SettingsInlineGroup className="mt-3 items-end">
                  <CompactField>
                    <FieldLabel>قیمت</FieldLabel>
                    <InputShell>
                      <PriceInput value={operation.price} onChange={(value) => updateOperation(index, { price: value })} />
                    </InputShell>
                  </CompactField>

                  <CompactField>
                    <FieldLabel>واحد</FieldLabel>
                    <CompactSelect
                      value={operation.unit || 'qty'}
                      onChange={(event) => updateOperation(index, { unit: event.target.value })}
                    >
                      <option value="qty">عدد</option>
                      <option value="m_length">متر طول</option>
                      <option value="m_square">مساحت</option>
                    </CompactSelect>
                  </CompactField>
                </SettingsInlineGroup>

                {uploadErrorByKey[opKey] ? (
                  <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600">
                    {uploadErrorByKey[opKey]}
                  </div>
                ) : null}
              </SettingsCard>
            );
          })}
        </div>

        <div className="flex justify-start">
          <DashedActionButton
            onClick={() => setDraft((previous) => ({ ...previous, operations: [...(previous.operations || []), { id: Date.now().toString(), title: 'خدمت جدید', price: 0, unit: 'qty', iconFile: '' }] }))}
          >
            <Plus size={14} />
            افزودن خدمات و جاساز
          </DashedActionButton>
        </div>
      </div>
    </SettingsSection>
  );
};
