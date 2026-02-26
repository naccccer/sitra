import React from 'react';
import { X, ExternalLink, Download, Printer, AlertTriangle, FileText } from 'lucide-react';
import { toPN } from '../../../../utils/helpers';

export const PatternFilesModal = ({ isOpen, onClose, orderCode, files = [] }) => {
  if (!isOpen) return null;

  const handleOpenForPrint = (filePath) => {
    if (!filePath) return;
    window.open(filePath, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800">فایل‌های الگوی سفارش تولید</h3>
            <p className="text-[11px] font-bold text-slate-500 mt-1">کد رهگیری: <span className="tabular-nums" dir="ltr">{toPN(orderCode || '-')}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-88px)] space-y-3">
          {files.length === 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              برای این سفارش فایل الگوی آپلودی ثبت نشده است.
            </div>
          ) : (
            files.map((file) => (
              <article key={file.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-black text-slate-800">
                    آیتم ردیف {toPN(file.rowNumber)}: {file.itemTitle}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 break-all">{file.fileName}</div>
                </div>

                {file.previewDataUrl && !file.filePath && (
                  <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-[11px] font-bold text-blue-700">
                    پیش‌نمایش موجود است اما فایل اصلی ذخیره نشده است.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {file.isDirectPrintable && file.filePath && (
                    <button
                      onClick={() => handleOpenForPrint(file.filePath)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold"
                    >
                      <Printer size={12} />
                      بازکردن برای چاپ
                    </button>
                  )}

                  {!file.isDirectPrintable && file.filePath && (
                    <>
                      <a
                        href={file.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold"
                      >
                        <ExternalLink size={12} />
                        بازکردن فایل
                      </a>
                      {file.isCad && (
                        <a
                          href={file.filePath}
                          download
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold"
                        >
                          <Download size={12} />
                          دانلود فایل CAD
                        </a>
                      )}
                    </>
                  )}

                  {!file.filePath && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold border border-slate-200">
                      <FileText size={12} />
                      فایل اصلی موجود نیست
                    </span>
                  )}
                </div>

                {!file.isDirectPrintable && file.isCad && (
                  <div className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    چاپ مستقیم DWG/DXF در مرورگر پشتیبانی نمی‌شود؛ فایل را در نرم‌افزار تخصصی باز کنید.
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
