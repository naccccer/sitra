import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '../../utils/profile';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_LOGO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const validateLogoFile = (file) => {
  if (!file) return 'فایلی انتخاب نشده است.';
  if (file.size > MAX_LOGO_SIZE_BYTES) return 'حجم لوگو نباید بیشتر از 2 مگابایت باشد.';
  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_LOGO_TYPES.has(file.type) && !ALLOWED_LOGO_EXTENSIONS.has(extension)) {
    return 'فرمت لوگو فقط JPG, PNG یا WEBP مجاز است.';
  }
  return '';
};

export const AdminProfileSettingsTab = ({ profile, setProfile }) => {
  const [draft, setDraft] = useState(() => normalizeProfile(profile));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-xs font-black text-slate-700">لوگوی برند</div>
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 text-white flex items-center justify-center text-3xl font-black">
            {logoSrc ? (
              <img src={logoSrc} alt={draft.brandName} className="h-full w-full object-cover" />
            ) : (
              fallbackLetter
            )}
          </div>
          {draft.logoOriginalName && (
            <div className="text-[11px] font-bold text-slate-500 break-all">{draft.logoOriginalName}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="h-9 px-3 rounded-lg text-xs font-black bg-slate-900 text-white inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-800">
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {isUploading ? 'در حال آپلود...' : 'آپلود لوگو'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogo(file);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                updateField('logoPath', '');
                updateField('logoOriginalName', '');
                setSuccessMsg('لوگو از پیش‌نویس حذف شد. برای نهایی شدن، ثبت را بزنید.');
                setErrorMsg('');
              }}
              className="h-9 px-3 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              حذف لوگو
            </button>
          </div>
          <div className="text-[10px] font-bold text-slate-500">حداکثر حجم: 2MB | فرمت: JPG/PNG/WEBP</div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black text-slate-600 mb-1 block">نام برند</label>
            <input
              type="text"
              value={draft.brandName}
              onChange={(e) => updateField('brandName', e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 mb-1 block">زیرعنوان پنل</label>
            <input
              type="text"
              value={draft.panelSubtitle}
              onChange={(e) => updateField('panelSubtitle', e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 mb-1 block">عنوان فاکتور مشتری</label>
            <input
              type="text"
              value={draft.invoiceTitleCustomer}
              onChange={(e) => updateField('invoiceTitleCustomer', e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 mb-1 block">عنوان برگه تولید</label>
            <input
              type="text"
              value={draft.invoiceTitleFactory}
              onChange={(e) => updateField('invoiceTitleFactory', e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-black text-slate-600 mb-1 block">آدرس</label>
            <textarea
              value={draft.address}
              onChange={(e) => updateField('address', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold bg-white resize-y"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-black text-slate-600 mb-1 block">شماره تماس</label>
            <input
              type="text"
              value={draft.phones}
              onChange={(e) => updateField('phones', e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black px-3 py-2">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-2">{successMsg}</div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveProfile}
          disabled={isSaving}
          className={`h-10 px-4 rounded-lg text-xs font-black inline-flex items-center gap-1.5 ${isSaving ? 'bg-slate-200 text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          ثبت تنظیمات پروفایل
        </button>
      </div>
    </div>
  );
};
