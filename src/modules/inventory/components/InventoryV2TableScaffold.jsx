import { Card } from '@/components/shared/ui'

export const InventoryV2TableScaffold = ({ title, description, columns = [], rows = [] }) => {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm font-black text-slate-900">{title}</div>
        <div className="mt-1 text-xs font-bold text-slate-500">{description}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white text-slate-600">
              {columns.map((column) => (
                <th key={column} className="border-b border-slate-200 px-3 py-2 text-start text-xs font-black">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={`row-${idx}`} className="border-b border-slate-100">
                  {row.map((cell, cellIdx) => (
                    <td key={`cell-${idx}-${cellIdx}`} className="px-3 py-2 text-start text-xs font-bold text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-xs font-bold text-slate-400">
                  داده‌ای برای نمایش ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
