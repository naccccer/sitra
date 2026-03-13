import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile';
import { Badge, Button, Card, Input } from '@/components/shared/ui';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_LOGO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const validateLogoFile = (file) => {
  if (!file) return 'فایلی انتخاب نشده است.';
  if (file.size > MAX_LOGO_SIZE_BYTES) return 'حجم لوگو نباید بیشتر از 2 مگابایت باشد.';
  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_LOGO_TYPES.has(file.type) && !ALLOWED_LOGO_EXTENSIONS.has(extension)) {
    return 'فرمت لوگو فقط JPG، PNG یا WEBP مجاز است.';
  }
  return '';
};

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-xs font-black text-slate-600">{label}</label>
    {children}
  </div>
);

export const AdminProfileSettingsTab = ({ profile, setProfile }) => {
  const [draft, setDraft] = useState(() => normalizeProfile(profile));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const logoInputRef = useRef(null);

  useEffect(() => {
    setDraft(normalizeProfile(profile));
  }, [profile]);

  const logoSrc = useMemo(() => profileLogoSrc(draft.logoPath), [draft.logoPath]);
  const fallbackLetter = useMemo(() => profileBrandInitial(draft), [draft]);

  const updateField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const uploadLogo = async (file) => {
    const validationError = validateLogoFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      setSuccessMsg('');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await api.uploadLogo(file);
      setDraft((prev) => ({
        ...prev,
        logoPath: response?.filePath || '',
        logoOriginalName: response?.originalName || '',
      }));
      setSuccessMsg('لوگو بارگذاری شد. برای نهایی شدن، ثبت را بزنید.');
    } catch (error) {
      setErrorMsg(error?.message || 'بارگذاری لوگو ناموفق بود.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await api.saveProfile(draft);
      const nextProfile = normalizeProfile(response?.profile || draft);
      setDraft(nextProfile);
      setProfile(nextProfile);
      setSuccessMsg('تنظیمات پروفایل کسب‌وکار ذخیره شد.');
    } catch (error) {
      setErrorMsg(error?.message || 'ذخیره تنظیمات پروفایل ناموفق بود.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card tone="muted" padding="md" className="space-y-3">
          <div className="text-xs font-black text-slate-700">لوگوی برند</div>
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-3xl font-black text-white">
            {logoSrc ? <img src={logoSrc} alt={draft.brandName} className="h-full w-full object-cover" /> : fallbackLetter}
          </div>
          {draft.logoOriginalName && <div className="break-all text-[11px] font-bold text-slate-500">{draft.logoOriginalName}</div>}
          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadLogo(file);
                event.target.value = '';
              }}
            />
            <Button type="button" onClick={() => logoInputRef.current?.click()} disabled={isUploading} variant="primary" size="md">
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {isUploading ? 'در حال آپلود...' : 'آپلود لوگو'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                updateField('logoPath', '');
                updateField('logoOriginalName', '');
                setSuccessMsg('لوگو از پیش‌نویس حذف شد. برای نهایی شدن، ثبت را بزنید.');
                setErrorMsg('');
              }}
              variant="danger"
              size="md"
            >
              <Trash2 size={14} />
              حذف لوگو
            </Button>
          </div>
          <div className="text-[10px] font-bold text-slate-500">حداکثر حجم: 2MB | فرمت: JPG/PNG/WEBP</div>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-span-2">
          <Field label="نام برند"><Input type="text" value={draft.brandName} onChange={(event) => updateField('brandName', event.target.value)} /></Field>
          <Field label="زیرعنوان پنل"><Input type="text" value={draft.panelSubtitle} onChange={(event) => updateField('panelSubtitle', event.target.value)} /></Field>
          <Field label="عنوان فاکتور مشتری"><Input type="text" value={draft.invoiceTitleCustomer} onChange={(event) => updateField('invoiceTitleCustomer', event.target.value)} /></Field>
          <Field label="عنوان برگه کارگاهی"><Input type="text" value={draft.invoiceTitleFactory} onChange={(event) => updateField('invoiceTitleFactory', event.target.value)} /></Field>
          <div className="md:col-span-2">
            <Field label="آدرس">
              <textarea
                value={draft.address}
                onChange={(event) => updateField('address', event.target.value)}
                rows={2}
                className="focus-ring w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="شماره تماس">
              <Input type="text" value={draft.phones} onChange={(event) => updateField('phones', event.target.value)} dir="ltr" />
            </Field>
          </div>
        </div>
      </div>

      {errorMsg && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{errorMsg}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{successMsg}</div>}

      <div className="flex items-center justify-between gap-2">
        <Badge tone="neutral">ذخیره‌سازی با همان قرارداد فعلی API انجام می‌شود</Badge>
        <Button type="button" onClick={saveProfile} disabled={isSaving} variant="success" size="lg">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          ثبت تنظیمات پروفایل
        </Button>
      </div>
    </div>
  );
};
