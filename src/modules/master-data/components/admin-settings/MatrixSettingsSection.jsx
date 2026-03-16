import React, { useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload, X } from 'lucide-react';
import { PriceInput } from '@/components/shared/PriceInput';
import { toPN } from '@/utils/helpers';
import {
  buildMatrixExportFileName,
  parseMatrixImportText,
  serializeMatrixExcelXml,
} from '@/modules/master-data/services/matrixImportExport';

export const MatrixSettingsSection = ({
  draft,
  setDraft,
  newThickness,
  setNewThickness,
  isAddingCol,
  setIsAddingCol,
}) => {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  const downloadTextFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMatrixUpdate = (id, field, value) => {
    setDraft((previous) => ({
      ...previous,
      glasses: previous.glasses.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }));
  };

  const handleMatrixPriceUpdate = (id, thickness, value) => {
    setDraft((previous) => ({
      ...previous,
      glasses: previous.glasses.map((row) => {
        if (row.id !== id) return row;
        const nextPrices = { ...row.prices };
        if (value === '') delete nextPrices[thickness];
        else nextPrices[thickness] = value;
        return { ...row, prices: nextPrices };
      }),
    }));
  };

  const handleExportExcel = () => {
    try {
      const content = serializeMatrixExcelXml(draft);
      downloadTextFile(content, buildMatrixExportFileName('xls'), 'application/vnd.ms-excel;charset=utf-8');
    } catch (error) {
      alert(error?.message || 'خروجی Excel انجام نشد.');
    }
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const extension = file.name.split('.').pop();
      const parsed = parseMatrixImportText(text, extension);
      const confirmed = window.confirm('با ایمپورت فایل، ماتریس فعلی جایگزین می‌شود. ادامه می‌دهید؟');
      if (!confirmed) return;

      setDraft((previous) => ({
        ...previous,
        thicknesses: parsed.thicknesses,
        glasses: parsed.glasses,
      }));
      setIsAddingCol(false);
      setNewThickness('');
      alert('ایمپورت ماتریس با موفقیت انجام شد.');
    } catch (error) {
      alert(error?.message || 'ایمپورت فایل ناموفق بود.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-bold text-slate-500">ورودی: CSV / Excel | خروجی: Excel</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100"
          >
            <Download size={14} /> خروجی Excel
          </button>
          <button
            onClick={handleImportTrigger}
            disabled={isImporting}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={14} /> {isImporting ? 'در حال پردازش...' : 'ایمپورت فایل'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.xml,.xls"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-max w-full border-collapse whitespace-nowrap text-center text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="w-12 p-3 font-black">ردیف</th>
              <th className="w-40 p-3 font-black">نوع شیشه</th>
              <th className="w-32 p-3 font-black">فرآیند</th>
              {draft.thicknesses.map((thickness) => (
                <th key={thickness} className="group w-28 p-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                    <span className="font-black text-slate-700">{toPN(thickness)} میل</span>
                    <button
                      onClick={() => setDraft((previous) => ({ ...previous, thicknesses: previous.thicknesses.filter((item) => item !== thickness) }))}
                      className="opacity-0 text-slate-300 hover:text-red-500 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-28 p-2 align-middle">
                {isAddingCol ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const thickness = parseInt(newThickness, 10);
                      if (thickness && !draft.thicknesses.includes(thickness)) {
                        setDraft((previous) => ({ ...previous, thicknesses: [...previous.thicknesses, thickness].sort((a, b) => a - b) }));
                      }
                      setIsAddingCol(false);
                      setNewThickness('');
                    }}
                  >
                    <input
                      type="number"
                      autoFocus
                      value={newThickness}
                      onChange={(event) => setNewThickness(event.target.value)}
                      placeholder="ضخامت"
                      className="w-full rounded-lg border border-blue-300 bg-white px-2 py-1 text-center text-xs outline-none"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingCol(true)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-50 py-1.5 text-xs font-black text-blue-600 hover:bg-blue-100"
                  >
                    <Plus size={14} /> ستون
                  </button>
                )}
              </th>
              <th className="w-12 p-3 font-black">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {draft.glasses.map((row, index) => (
              <tr key={row.id} className="group hover:bg-slate-50/50">
                <td className="p-2 tabular-nums font-black text-slate-400">{toPN(index + 1)}</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={row.title}
                    onChange={(event) => handleMatrixUpdate(row.id, 'title', event.target.value)}
                    className="w-full rounded-lg bg-transparent py-1.5 text-center font-black outline-none focus:bg-slate-100"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={row.process || 'raw'}
                    onChange={(event) => handleMatrixUpdate(row.id, 'process', event.target.value)}
                    className={`w-full rounded-lg border py-1.5 text-center font-black outline-none ${(row.process || 'raw') === 'raw' ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                  >
                    <option value="raw">خام</option>
                    <option value="sekurit">سکوریت</option>
                  </select>
                </td>
                {draft.thicknesses.map((thickness) => (
                  <td key={`${row.id}-${thickness}`} className="p-1 focus-within:bg-blue-50/30">
                    <PriceInput value={row.prices[thickness] || ''} onChange={(value) => handleMatrixPriceUpdate(row.id, thickness, value)} />
                  </td>
                ))}
                <td />
                <td className="p-2">
                  <button
                    onClick={() => setDraft((previous) => ({ ...previous, glasses: previous.glasses.filter((item) => item.id !== row.id) }))}
                    className="mx-auto block opacity-0 text-slate-300 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={() => setDraft((previous) => ({ ...previous, glasses: [...previous.glasses, { id: Date.now().toString(), title: '', process: 'raw', prices: {} }] }))}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 hover:bg-slate-50"
        >
          <Plus size={16} /> افزودن ردیف شیشه
        </button>
      </div>
    </div>
  );
};
