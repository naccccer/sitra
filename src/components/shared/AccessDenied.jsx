import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied = ({ message }) => (
  <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
    <div className="mb-3 inline-flex rounded-xl bg-amber-100 p-2 text-amber-700">
      <ShieldAlert size={18} />
    </div>
    <h2 className="text-sm font-black text-amber-900">{message}</h2>
  </div>
);
