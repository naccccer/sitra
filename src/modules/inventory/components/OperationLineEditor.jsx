import { Button } from '@/components/shared/ui'

export const OperationLineEditor = ({
  line,
  index,
  products,
  config,
  sourceLocations,
  targetLocations,
  setLine,
  removeLine,
}) => (
  <div className="grid grid-cols-12 gap-2 rounded border border-slate-200 p-3">
    <div className="col-span-12 md:col-span-3">
      <label className="mb-0.5 block text-xs text-slate-500">محصول</label>
      <select
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
        value={line.productId}
        onChange={(event) => setLine(line._key, 'productId', event.target.value)}
        required
      >
        <option value="">انتخاب</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>{product.name}</option>
        ))}
      </select>
    </div>

    <div className="col-span-6 md:col-span-2">
      <label className="mb-0.5 block text-xs text-slate-500">مقدار درخواستی</label>
      <input
        type="number"
        min="0"
        step="0.001"
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
        value={line.quantityRequested}
        onChange={(event) => setLine(line._key, 'quantityRequested', event.target.value)}
        required
      />
    </div>

    <div className="col-span-6 md:col-span-2">
      <label className="mb-0.5 block text-xs text-slate-500">مقدار انجام شده</label>
      <input
        type="number"
        min="0"
        step="0.001"
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
        value={line.quantityDone}
        placeholder={line.quantityRequested}
        onChange={(event) => setLine(line._key, 'quantityDone', event.target.value)}
      />
    </div>

    <div className={`col-span-12 ${config.needsSource && config.needsTarget ? 'md:col-span-2' : 'md:col-span-3'}`}>
      <label className="mb-0.5 block text-xs text-slate-500">واحد</label>
      <input
        type="text"
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
        value={line.uom}
        onChange={(event) => setLine(line._key, 'uom', event.target.value)}
        placeholder="مثال: کیلوگرم"
      />
    </div>

    {config.needsSource ? (
      <div className={`col-span-12 ${config.needsTarget ? 'md:col-span-3' : 'md:col-span-2'}`}>
        <label className="mb-0.5 block text-xs text-slate-500">مکان مبدا</label>
        <select
          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
          value={line.sourceLocationId}
          onChange={(event) => setLine(line._key, 'sourceLocationId', event.target.value)}
          required
        >
          <option value="">انتخاب</option>
          {sourceLocations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </div>
    ) : null}

    {config.needsTarget ? (
      <div className={`col-span-12 ${config.needsSource ? 'md:col-span-3' : 'md:col-span-2'}`}>
        <label className="mb-0.5 block text-xs text-slate-500">مکان مقصد</label>
        <select
          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
          value={line.targetLocationId}
          onChange={(event) => setLine(line._key, 'targetLocationId', event.target.value)}
          required
        >
          <option value="">انتخاب</option>
          {targetLocations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </div>
    ) : null}

    <div className="col-span-12 md:col-span-10">
      <label className="mb-0.5 block text-xs text-slate-500">یادداشت خط</label>
      <input
        type="text"
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
        value={line.notes}
        onChange={(event) => setLine(line._key, 'notes', event.target.value)}
        placeholder="اختیاری"
      />
    </div>

    <div className="col-span-12 flex items-end justify-end md:col-span-2">
      {index > 0 ? (
        <Button type="button" size="xs" variant="danger" onClick={() => removeLine(line._key)}>حذف</Button>
      ) : null}
    </div>
  </div>
)
