import React, { useState, useRef } from 'react';
import { X, CheckCircle2, UploadCloud, FileBox, MapPin, Plus, Trash2 } from 'lucide-react';
import { toPN, FACTORY_ADDRESS } from '../../utils/helpers';

const MAX_PATTERN_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const SettingsModal = ({ setModalMode, config, setConfig, catalog }) => {
  const [view, setView] = useState('main');
  const [selectedServices, setSelectedServices] = useState({ ...config.operations });
  const [pattern, setPattern] = useState({ ...config.pattern });
  
  const fileInputRef = useRef(null);

  const toggleService = (id) => {
    setSelectedServices(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = 1; 
      return next;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PATTERN_FILE_SIZE_BYTES) return alert('حجم فایل نباید بیشتر از 5 مگابایت باشد.');
    const reader = new FileReader();
    reader.onload = () => setPattern({ type: 'upload', fileName: file.name, previewDataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setConfig(prev => ({ ...prev, operations: { ...selectedServices }, pattern: { ...pattern } }));
    setModalMode(null);
  };

  if (view === 'catalog') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[60] flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
        <div className="bg-white w-full max-w-3xl rounded-2xl flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95">
          <div className="flex justify-between p-4 border-b border-slate-100"><h2 className="text-sm font-black">انتخاب خدمات و جاساز</h2><button onClick={()=>setView('main')} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800"><X size={18}/></button></div>
          <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {catalog.operations.map(service => (
              <div key={service.id} onClick={() => toggleService(service.id)} className={`cursor-pointer bg-white border-2 rounded-xl flex flex-col transition-all ${selectedServices[service.id] ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="h-20 flex items-center justify-center relative p-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">{service.title.charAt(0)}</div>
                  {selectedServices[service.id] && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5"><CheckCircle2 size={12}/></div>}
                </div>
                <div className="p-2 text-center text-[10px] font-bold border-t border-slate-100 text-slate-700">{service.title}</div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100"><button onClick={()=>setView('main')} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-3 rounded-xl text-sm font-black shadow-md">تایید انتخاب‌ها</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4 print-hide" dir="rtl" style={{ fontFamily: 'Vazirmatn' }}>
      <div className="bg-white w-full max-w-xl rounded-2xl flex flex-col shadow-2xl animate-in fade-in">
        <div className="flex justify-between items-center p-4 border-b border-slate-100"><h2 className="text-base font-black text-slate-800">خدمات جانبی و الگو</h2><button onClick={()=>setModalMode(null)} className="bg-slate-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-800"><X size={20}/></button></div>
        <div className="p-5 space-y-5">
          
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-800">۱. خدمات و جاساز</h3>
              {Object.keys(selectedServices).length > 0 && <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{toPN(Object.keys(selectedServices).length)} مورد انتخاب شده</span>}
            </div>
            
            {Object.keys(selectedServices).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.keys(selectedServices).map(id => {
                  const title = catalog.operations.find(o => o.id === id)?.title || 'خدمت ناشناس';
                  return (
                    <div key={id} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
                      <span className="text-xs font-bold text-slate-700 before:content-['•'] before:mr-1 before:text-blue-400 before:ml-2">{title}</span>
                      <button onClick={() => toggleService(id)} className="text-red-400 hover:text-white hover:bg-red-500 p-1.5 bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button onClick={() => setView('catalog')} className="w-full border-2 border-dashed border-blue-300 text-blue-600 bg-white hover:bg-blue-50 py-3 rounded-xl text-xs font-black flex justify-center items-center gap-2 transition-colors"><Plus size={16}/> انتخاب / ویرایش سوراخ‌ها و جاسازها</button>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 mb-4">۲. نقشه یا الگو</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => setPattern({ type: 'none', fileName: '' })} className={`py-3.5 rounded-xl text-xs font-bold border transition-all ${pattern.type === 'none' ? 'border-slate-800 shadow-md bg-white text-slate-800 ring-2 ring-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>سفارش فاقد الگو (ابعاد مشخص است)</button>
              <div className="flex gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.dwg,.dxf,.jpg,.png" />
                <button onClick={() => fileInputRef.current?.click()} className={`flex-1 py-3.5 border rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${pattern.type === 'upload' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-2 ring-blue-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2"><UploadCloud size={18}/> آپلود فایل نقشه</div>
                  {pattern.type === 'upload' && pattern.fileName && <span className="text-[9px] font-mono text-blue-500 truncate w-32 text-center bg-white px-2 py-0.5 rounded-full border border-blue-100">{pattern.fileName}</span>}
                </button>
                <button onClick={() => setPattern({ type: 'carton', fileName: '' })} className={`flex-1 py-3.5 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${pattern.type === 'carton' ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-md ring-2 ring-amber-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><FileBox size={18}/> ارسال فیزیکی الگو</button>
              </div>
              
              {pattern.type === 'carton' && (
                <div className="mt-3 bg-white border-2 border-amber-300 rounded-xl p-4 flex gap-4 items-center shadow-sm animate-in slide-in-from-top-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0"><MapPin size={24} /></div>
                  <div className="text-xs text-slate-700 leading-relaxed font-bold">
                    <span className="block text-amber-600 mb-1 text-[10px] font-black tracking-wide">آدرس کارخانه جهت ارسال فیزیکی (کارتن/شابلون):</span>
                    {FACTORY_ADDRESS}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl"><button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white py-3.5 rounded-xl text-sm font-black shadow-lg">تایید و ثبت در ردیف سفارش</button></div>
      </div>
    </div>
  );
};
