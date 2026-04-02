import React from 'react';
import { X, ExternalLink, Download, Printer, AlertTriangle, FileText } from 'lucide-react';
import { toPN } from '../../../../utils/helpers';
import { resolveApiFileUrl } from '@/utils/url';
import { Button, Card, EmptyState, IconButton, InlineAlert } from '@/components/shared/ui';

export const PatternFilesModal = ({ isOpen, onClose, orderCode, files = [] }) => {
  if (!isOpen) return null;

  const handleOpenForPrint = (filePath) => {
    if (!filePath) return;
    window.open(resolveApiFileUrl(filePath), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <Card padding="none" className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800">فایل‌های الگوی سفارش کارگاهی</h3>
            <p className="text-[11px] font-bold text-slate-500 mt-1">کد رهگیری: <span className="tabular-nums font-black text-[rgb(10,22,52)]" dir="ltr">{toPN(orderCode || '-')}</span></p>
          </div>
          <IconButton action="close" variant="secondary" label="بستن" tooltip="بستن" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-88px)] space-y-3">
          {files.length === 0 ? (
            <EmptyState title="فایل الگوی آپلودی ثبت نشده است" description="برای این سفارش هنوز فایل قابل نمایش وجود ندارد." className="border border-amber-300 bg-amber-50 text-amber-800" />
          ) : (
            files.map((file) => (
              <Card key={file.id} padding="sm" className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-black text-slate-800">
                    آیتم ردیف {toPN(file.rowNumber)}: {file.itemTitle}
                  </div>
                  <div className="text-[10px] font-mono tabular-nums text-slate-500 break-all" dir="ltr">{file.fileName}</div>
                </div>

                {file.previewDataUrl && !file.filePath && (
                  <InlineAlert tone="info" title="فایل اصلی ذخیره نشده">
                    پیش‌نمایش موجود است اما فایل اصلی ذخیره نشده است.
                  </InlineAlert>
                )}

                <div className="flex flex-wrap gap-2">
                  {file.isDirectPrintable && file.filePath && (
                    <Button
                      onClick={() => handleOpenForPrint(file.filePath)}
                      size="sm"
                      variant="primary"
                    >
                      <Printer size={12} />
                      بازکردن برای چاپ
                    </Button>
                  )}

                  {!file.isDirectPrintable && file.filePath && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(resolveApiFileUrl(file.filePath), '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink size={12} />
                        بازکردن فایل
                      </Button>
                      {file.isCad && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => window.open(resolveApiFileUrl(file.filePath), '_blank', 'noopener,noreferrer')}
                        >
                            <Download size={12} />
                            دانلود فایل CAD
                        </Button>
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
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
