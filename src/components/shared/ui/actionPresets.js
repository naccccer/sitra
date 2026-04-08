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
  create: { label: 'ایجاد', variant: 'forest', icon: Plus },
  edit: { label: 'ویرایش', variant: 'tertiary', icon: Pencil },
  delete: { label: 'حذف', variant: 'destructive', icon: Trash2, isDestructive: true },
  archive: { label: 'بایگانی', variant: 'quiet', icon: Archive },
  restore: { label: 'بازگردانی', variant: 'secondary', icon: RotateCcw },
  print: { label: 'چاپ', variant: 'tertiary', icon: Printer },
  save: { label: 'ذخیره', variant: 'primary', icon: Save },
  cancel: { label: 'انصراف', variant: 'quiet', icon: X },
  reload: { label: 'بارگذاری مجدد', variant: 'tertiary', icon: RefreshCcw },
  refresh: { label: 'به‌روزرسانی', variant: 'tertiary', icon: RefreshCcw },
  filter: { label: 'فیلتر', variant: 'tertiary', icon: Filter },
  openDetails: { label: 'جزئیات', variant: 'quiet', icon: Eye },
  rowExpand: { label: 'بازکردن ردیف', variant: 'quiet', icon: ChevronDown },
});

export const getActionPreset = (action) => ACTION_PRESETS[action] || null;
