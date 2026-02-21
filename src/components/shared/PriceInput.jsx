import React from 'react';
import { toPN } from '../../utils/helpers';

export const PriceInput = ({ value, onChange, placeholder = "-" }) => {
  const displayValue = value ? value.toLocaleString() : '';
  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '').replace(/\D/g, '');
    onChange(raw ? parseInt(raw, 10) : '');
  };
  return (
    <input 
      type="text" 
      value={toPN(displayValue)} 
      onChange={handleChange} 
      placeholder={placeholder} 
      className="w-full h-full text-center outline-none bg-transparent font-bold text-blue-700 placeholder-slate-300 focus:bg-blue-50/50 py-2 rounded-lg" 
      dir="ltr" 
    />
  );
};