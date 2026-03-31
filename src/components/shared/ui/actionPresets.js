import {
  Archive,
  ChevronDown,
  Eye,
  Filter,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';

export const ACTION_PRESETS = Object.freeze({
  create: { label: 'ایجاد', variant: 'accent', icon: Plus },
  edit: { label: 'ویرایش', variant: 'secondary', icon: Pencil },
  delete: { label: 'حذف', variant: 'danger', icon: Trash2, isDestructive: true },
  archive: { label: 'بایگانی', variant: 'ghost', icon: Archive },
  restore: { label: 'بازگردانی', variant: 'success', icon: RotateCcw },
  print: { label: 'چاپ', variant: 'secondary', icon: Printer },
  save: { label: 'ذخیره', variant: 'primary', icon: Save },
  cancel: { label: 'انصراف', variant: 'ghost', icon: X },
  reload: { label: 'بارگذاری مجدد', variant: 'secondary', icon: RefreshCcw },
  refresh: { label: 'به‌روزرسانی', variant: 'secondary', icon: RefreshCcw },
  filter: { label: 'فیلتر', variant: 'secondary', icon: Filter },
  openDetails: { label: 'جزئیات', variant: 'ghost', icon: Eye },
  rowExpand: { label: 'بازکردن ردیف', variant: 'ghost', icon: ChevronDown },
});

export const getActionPreset = (action) => ACTION_PRESETS[action] || null;
