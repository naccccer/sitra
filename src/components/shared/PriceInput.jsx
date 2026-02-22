import React from 'react';
import { normalizeDigitsToLatin, toPN } from '../../utils/helpers';

export const PriceInput = ({ value, onChange, placeholder = "-" }) => {
  const hasValue = value !== undefined && value !== null && value !== '';
  const numericValue = hasValue ? Number(value) : null;
  const displayValue = Number.isFinite(numericValue) ? numericValue.toLocaleString() : '';

  const handleChange = (e) => {
    const normalized = normalizeDigitsToLatin(e.target.value);
    const raw = normalized
      .replace(/[,\u066C\u060C\s]/g, '')
      .replace(/[^\d]/g, '');

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
