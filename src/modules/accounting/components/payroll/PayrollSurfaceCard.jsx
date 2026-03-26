import { createElement } from 'react'

const DENSITY_CLASS = {
  compact: 'p-2',
  comfy: 'p-3',
  spacious: 'p-4',
}

export function PayrollSurfaceCard({ as = 'div', children, className = '', density = 'comfy', tone = 'default' }) {
  const paddingClass = DENSITY_CLASS[density] || DENSITY_CLASS.comfy
  const toneClass = tone === 'muted' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
  return createElement(as, { className: `rounded-2xl border ${toneClass} ${paddingClass} ${className}`.trim() }, children)
}
