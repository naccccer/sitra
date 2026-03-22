import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

const OPERATION_ICON_BASE_PATH = '/icons/operations';

const OperationIcon = ({ title, iconFile }) => {
  const [hasError, setHasError] = useState(false);
  const iconPath = iconFile ? `${OPERATION_ICON_BASE_PATH}/${iconFile}` : null;

  if (!iconPath || hasError) {
    return (
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">
        {title?.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <img
      src={iconPath}
      alt={title || 'service'}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-30 h-30 object-contain"
    />
  );
};

export const ServiceCatalogView = ({ catalog, selectedServices, onToggle, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/60 z-[60] flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
    <div className="bg-white w-full max-w-3xl rounded-2xl flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95">
      <div className="flex justify-between p-4 border-b border-slate-100">
        <h2 className="text-sm font-black">انتخاب خدمات و جاساز</h2>
        <button onClick={onClose} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800">
          <X size={18} />
        </button>
      </div>
      <div className="p-3 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {catalog.operations.map((service) => (
          <div
            key={service.id}
            onClick={() => onToggle(service.id)}
            className={`cursor-pointer bg-white border-2 rounded-xl overflow-hidden flex flex-col aspect-[2/3] max-w-[150px] w-full justify-self-center transition-all ${selectedServices[service.id] ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex-1 flex items-center justify-center relative p-1">
              <OperationIcon title={service.title} iconFile={service.iconFile} />
              {selectedServices[service.id] && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                  <CheckCircle2 size={12} />
                </div>
              )}
            </div>
            <div className="min-h-12 px-2 py-2 text-center text-[10px] leading-4 font-bold border-t border-slate-100 text-slate-700 flex items-center justify-center">
              {service.title}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-slate-100">
        <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-3 rounded-xl text-sm font-black shadow-md">
          تایید انتخاب‌ها
        </button>
      </div>
    </div>
  </div>
);
