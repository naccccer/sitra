import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Edit3, Archive, Printer } from 'lucide-react';
import { toPN } from '../../utils/helpers';
import { StructureDetails } from '../shared/StructureDetails';
import { PrintInvoice } from '../shared/PrintInvoice';

export const AdminOrdersView = ({ orders, setOrders, catalog, onEditOrder }) => {
  const [activeOrdersTab, setActiveOrdersTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);

  const updateOrderStatus = (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const handleArchiveOrder = (id) => {
    updateOrderStatus(id, 'archived');
    if(expandedOrderId === id) setExpandedOrderId(null);
  };

  const toggleOrderExpansion = (id) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const filteredOrders = orders.filter(o => {
    const matchesTab = activeOrdersTab === 'all' ? o.status !== 'archived' : o.status === activeOrdersTab;
    const matchesSearch = o.customerName.includes(searchQuery) || o.phone.includes(searchQuery) || (o.orderCode || '').includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-4 print-hide animate-in slide-in-from-left-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar gap-1">
           {[
             {id: 'all', label: 'همه سفارش‌ها'}, 
             {id: 'pending', label: 'در انتظار'}, 
             {id: 'processing', label: 'در حال تولید'}, 
             {id: 'delivered', label: 'تحویل شده'},
             {id: 'archived', label: 'آرشیو'}
           ].map(t => (
             <button key={t.id} onClick={() => setActiveOrdersTab(t.id)} className={`whitespace-nowrap px-3 py-2 text-[11px] sm:text-xs font-bold rounded-md transition-all ${activeOrdersTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
           ))}
        </div>
        <div className="relative w-full md:w-72 shrink-0">
          <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
          <input type="text" placeholder="جستجو کد، نام یا موبایل..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-4 py-2 text-xs font-bold outline-none focus:border-blue-400" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-black text-center border-l border-slate-100 w-10">ردیف</th>
                <th className="p-3 font-black text-center border-l border-slate-100">کد رهگیری</th>
                <th className="p-3 font-black border-l border-slate-100">نام مشتری</th>
                <th className="p-3 font-black border-l border-slate-100">موبایل</th>
                <th className="p-3 font-black text-center border-l border-slate-100">تاریخ ثبت</th>
                <th className="p-3 font-black text-center border-l border-slate-100">مبلغ کل (تومان)</th>
                <th className="p-3 font-black text-center border-l border-slate-100">وضعیت</th>
                <th className="p-3 font-black text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-bold">هیچ سفارشی یافت نشد.</td></tr>
              ) : filteredOrders.map((o, index) => (
                <React.Fragment key={o.id}>
                  <tr className={`hover:bg-slate-50 transition-colors ${o.status === 'archived' ? 'opacity-50 grayscale' : ''} ${expandedOrderId === o.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-3 text-center font-bold text-slate-400 border-l border-slate-50 tabular-nums">{toPN(index+1)}</td>
                    <td className="p-3 text-center font-black text-blue-700 tabular-nums border-l border-slate-50 tracking-wider" dir="ltr">{toPN(o.orderCode)}</td>
                    <td className="p-3 font-black text-slate-800 border-l border-slate-50">{o.customerName} <span className="text-[10px] text-slate-400 font-normal mr-1">({toPN(Array.isArray(o.items) ? o.items.length : o.items)} قلم)</span></td>
                    <td className="p-3 font-bold text-slate-600 tabular-nums border-l border-slate-50" dir="ltr">{toPN(o.phone)}</td>
                    <td className="p-3 text-center font-bold text-slate-500 border-l border-slate-50">{toPN(o.date)}</td>
                    <td className="p-3 text-center font-black text-slate-900 tabular-nums border-l border-slate-50">{toPN(o.total.toLocaleString())}</td>
                    <td className="p-3 text-center border-l border-slate-50">
                       {o.status === 'archived' ? (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">آرشیو شده</span>
                       ) : (
                         <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className={`text-[10px] font-black px-2 py-1.5 rounded-md outline-none cursor-pointer appearance-none text-center ${o.status === 'pending' ? 'bg-amber-100 text-amber-700' : o.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            <option value="pending">در انتظار</option>
                            <option value="processing">در حال تولید</option>
                            <option value="delivered">تحویل شده</option>
                         </select>
                       )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                         <button onClick={() => toggleOrderExpansion(o.id)} className={`p-1.5 rounded transition-colors ${expandedOrderId === o.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50'}`} title="مشاهده آیتم‌ها">
                           {expandedOrderId === o.id ? <ChevronUp size={14}/> : <ChevronDown size={14} />}
                         </button>
                         {o.status !== 'archived' && (
                           <>
                             <button onClick={() => onEditOrder(o)} className="text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 p-1.5 rounded transition-colors" title="ویرایش سفارش"><Edit3 size={14} /></button>
                             <button onClick={() => handleArchiveOrder(o.id)} className="text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-1.5 rounded transition-colors" title="بایگانی"><Archive size={14} /></button>
                           </>
                         )}
                         {o.status === 'archived' && (
                           <button onClick={() => updateOrderStatus(o.id, 'pending')} className="text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-1.5 rounded text-[10px] font-bold transition-colors">بازیابی</button>
                         )}
                      </div>
                    </td>
                  </tr>
                  {/* ACCORDION EXPANDED DETAILS */}
                  {expandedOrderId === o.id && (
                    <tr className="bg-slate-50/80 animate-in fade-in">
                      <td colSpan="8" className="p-0 border-b-2 border-slate-200">
                         <div className="p-4 m-3 bg-white rounded-xl shadow-inner border border-slate-200">
                            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                               <span className="font-black text-sm text-slate-800">ریز اقلام سفارش</span>
                               <button onClick={() => { setViewingOrder(o); setTimeout(()=> window.print(), 100); }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex gap-1 items-center font-bold shadow-sm transition-colors"><Printer size={12}/> چاپ برای تولید</button>
                            </div>
                            <table className="w-full text-right text-sm border-collapse mt-2">
                                <thead className="bg-slate-50 text-slate-500 text-xs border-y border-slate-200 rounded-lg">
                                    <tr>
                                        <th className="p-2 font-bold w-12 text-center border-l border-slate-200/50">ردیف</th>
                                        <th className="p-2 font-bold w-36 border-l border-slate-200/50">نوع ساختار</th>
                                        <th className="p-2 font-bold border-l border-slate-200/50">پیکربندی و خدمات</th>
                                        <th className="p-2 font-bold w-24 text-center border-l border-slate-200/50">ابعاد (cm)</th>
                                        <th className="p-2 font-bold w-16 text-center border-l border-slate-200/50">تعداد</th>
                                        <th className="p-2 font-bold w-28 text-center border-l border-slate-200/50">فی نهایی (تومان)</th>
                                        <th className="p-2 font-bold w-32 text-left pl-4">مبلغ کل (تومان)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Array.isArray(o.items) && o.items.map((item, ii) => (
                                        <tr key={item.id} className="hover:bg-blue-50/20 transition-colors even:bg-slate-50/50">
                                            <td className="p-2 text-center font-bold text-slate-400 border-l border-slate-100 tabular-nums">{toPN(ii+1)}</td>
                                            <td className="p-2 border-l border-slate-100"><span className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-[9px] font-black whitespace-nowrap shadow-sm">{item.title}</span></td>
                                            <td className="p-2 border-l border-slate-100"><StructureDetails item={item} catalog={catalog} /></td>
                                            <td className="p-2 text-center font-bold text-slate-600 border-l border-slate-100 tabular-nums" dir="ltr">{toPN(item.dimensions.width)} × {toPN(item.dimensions.height)}</td>
                                            <td className="p-2 text-center font-black text-slate-800 tabular-nums">{toPN(item.dimensions.count)}</td>
                                            <td className="p-2 text-center font-bold text-slate-500 border-l border-slate-100 tabular-nums">{toPN(item.unitPrice.toLocaleString())}</td>
                                            <td className="p-2 text-left pl-4 font-black text-slate-900 bg-blue-50/30 text-[13px] tabular-nums">{toPN(item.totalPrice.toLocaleString())}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- HIDDEN PRINT TEMPLATE FOR ADMIN (PRODUCTION INVOICE) --- */}
      {/* فاکتور تولید مخصوص ادمین */}
      {viewingOrder && (
        <PrintInvoice 
          items={viewingOrder.items} 
          catalog={catalog} 
          customerName={viewingOrder.customerName}
          orderCode={viewingOrder.orderCode}
          date={viewingOrder.date}
          type="factory" 
        />
      )}
    </div>
  );
};