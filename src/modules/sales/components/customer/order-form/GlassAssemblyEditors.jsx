import React, { Fragment } from 'react'
import { ChevronDown, CircleAlert, Flame, Layers, Plus, Ruler, Trash2 } from 'lucide-react'
import { toPN } from '@/utils/helpers'
import { glassProcess } from '@/modules/sales/components/customer/order-form/orderFormUtils'

const getCatalogDefaults = (catalog) => ({
  glasses: Array.isArray(catalog?.glasses) ? catalog.glasses : [],
  thicknesses: Array.isArray(catalog?.thicknesses) ? catalog.thicknesses : [],
  spacers: Array.isArray(catalog?.connectors?.spacers) ? catalog.connectors.spacers : [],
  interlayers: Array.isArray(catalog?.connectors?.interlayers) ? catalog.connectors.interlayers : [],
})

export const GlassRow = ({
  data,
  onChange,
  catalog,
  layerKey,
  unavailableState = null,
  onRemove = null,
}) => {
  const defaults = getCatalogDefaults(catalog)
  const targetProcess = data.isSekurit ? 'sekurit' : 'raw'
  const glassOptions = defaults.glasses.filter((glass) => glassProcess(glass) === targetProcess)
  const selectedGlass = defaults.glasses.find((glass) => glass.id === data.glassId)
  const selectedExists = glassOptions.some((glass) => glass.id === data.glassId)
  const thicknessOptions = defaults.thicknesses.map((thickness) => ({
    value: thickness,
    isAvailable: selectedGlass
      ? Object.prototype.hasOwnProperty.call(selectedGlass?.prices || {}, thickness)
      : true,
  }))
  const selectedThicknessAvailable = selectedGlass
    ? Object.prototype.hasOwnProperty.call(selectedGlass?.prices || {}, data.thick)
    : true
  const isGlassUnavailable = unavailableState === 'unavailable_glass'

  return (
    <div data-layer-key={layerKey} className={`relative mx-1 flex flex-col overflow-hidden rounded-xl border shadow-sm sm:h-11 sm:flex-row ${isGlassUnavailable ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
      <div className={`${isGlassUnavailable ? 'bg-red-600' : 'bg-slate-900'} flex h-7 w-full shrink-0 items-center justify-center text-[10px] font-black text-white sm:h-auto sm:w-8 sm:[writing-mode:vertical-rl]`}>
        <span className="sm:rotate-180">شیشه</span>
      </div>
      <div className={`flex flex-1 flex-wrap items-center gap-1.5 p-1 ${isGlassUnavailable ? 'bg-red-50/20' : 'bg-white'}`}>
        <select value={data.glassId} onChange={(event) => onChange('glassId', event.target.value)} className={`h-8 min-w-0 grow basis-[130px] rounded-lg border bg-slate-50 px-2 py-1.5 text-[11px] font-black outline-none ${isGlassUnavailable ? 'border-red-300 text-red-700' : 'border-slate-200'}`}>
          {!selectedExists && selectedGlass && <option value={selectedGlass.id}>{selectedGlass.title}</option>}
          {glassOptions.map((glass) => <option key={glass.id} value={glass.id}>{glass.title}</option>)}
        </select>
        <div className="relative">
          <select
            value={data.thick}
            onChange={(event) => onChange('thick', Number.parseInt(event.target.value, 10))}
            className={`h-8 w-32 appearance-none rounded-lg border bg-slate-50 py-1.5 pr-3 pl-14 text-center text-[11px] font-black outline-none ${selectedThicknessAvailable ? 'border-slate-200 text-slate-900' : 'border-red-300 bg-red-50 text-red-700'}`}
          >
            {!selectedThicknessAvailable && <option value={data.thick}>{toPN(data.thick)} میل</option>}
            {thicknessOptions.map((thickness) => (
              <option
                key={thickness.value}
                value={thickness.value}
                style={{ color: thickness.isAvailable ? '#0f172a' : '#dc2626' }}
              >
                {toPN(thickness.value)} میل
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1.5">
            {!selectedThicknessAvailable && <CircleAlert size={14} className="shrink-0 text-red-500" />}
            <ChevronDown size={15} className={`shrink-0 ${selectedThicknessAvailable ? 'text-slate-500' : 'text-red-500'}`} />
          </div>
        </div>
        <label className={`flex h-8 grow basis-[95px] cursor-pointer items-center justify-center gap-1 rounded-lg border text-[10px] font-black ${data.isSekurit ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-400'}`}>
          <input type="checkbox" checked={data.isSekurit} onChange={(event) => onChange('isSekurit', event.target.checked)} className="hidden" />
          <Flame size={12} />
          سکوریت
        </label>
        <label className={`flex h-8 grow basis-[95px] cursor-pointer items-center justify-center gap-1 rounded-lg border text-[10px] font-black ${data.hasEdge ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-400'}`}>
          <input type="checkbox" checked={data.hasEdge} onChange={(event) => onChange('hasEdge', event.target.checked)} className="hidden" />
          <Ruler size={12} />
          ابزار
        </label>
        {onRemove && (
          <button type="button" onClick={onRemove} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100" aria-label="حذف لایه شیشه">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export const ConnectorRow = () => {
  return (
    <div className="flex justify-center py-1">
      <div className="h-1.5 w-24 rounded-full bg-indigo-200 opacity-60" />
    </div>
  )
}

export const SpacerConnectorRow = ({ value, onChange, catalog }) => {
  const defaults = getCatalogDefaults(catalog)
  return (
    <div className="relative z-20 -my-2 flex justify-center py-2">
      <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 shadow-sm">
        <Layers size={14} className="text-blue-500" />
        <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent text-xs font-black text-blue-700 outline-none">
          {defaults.spacers.map((spacer) => <option key={spacer.id} value={spacer.id}>{spacer.title}</option>)}
        </select>
      </div>
    </div>
  )
}

export const LaminatedPaneEditor = ({ assembly, paneKey, config, updateConfigLayer, catalog, unavailableLayers }) => {
  const paneData = config[assembly][paneKey]
  const layer1Key = `${assembly}.${paneKey}.glass1`
  const layer2Key = `${assembly}.${paneKey}.glass2`
  return (
    <div className="relative z-10 mb-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-black text-slate-800">{paneKey === 'pane1' ? 'جداره بیرونی' : 'جداره داخلی'}</span>
        <label className="flex cursor-pointer flex-row-reverse items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">تبدیل به لمینت</span>
          <input type="checkbox" checked={paneData.isLaminated} onChange={(event) => updateConfigLayer(assembly, paneKey, 'isLaminated', event.target.checked)} className="hidden" />
          <div className={`flex h-4.5 w-8 rounded-full p-0.5 transition-all ${paneData.isLaminated ? 'bg-indigo-400' : 'bg-slate-300'}`}>
            <div className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm ${paneData.isLaminated ? '-translate-x-3.5' : ''}`} />
          </div>
        </label>
      </div>
      <div className={`bg-slate-50/50 p-2.5 ${paneData.isLaminated ? 'space-y-1.5' : ''}`}>
        <GlassRow layerKey={layer1Key} unavailableState={unavailableLayers[layer1Key] || null} data={paneData.glass1} onChange={(field, value) => updateConfigLayer(assembly, paneKey, 'glass1', value, field)} catalog={catalog} />
        {paneData.isLaminated && (
          <>
            <ConnectorRow />
            <GlassRow layerKey={layer2Key} unavailableState={unavailableLayers[layer2Key] || null} data={paneData.glass2} onChange={(field, value) => updateConfigLayer(assembly, paneKey, 'glass2', value, field)} catalog={catalog} />
          </>
        )}
      </div>
    </div>
  )
}

export const LaminateLayersEditor = ({
  laminateConfig,
  catalog,
  unavailableLayers,
  updateConfigLayer,
  onAddLaminateLayer,
  onRemoveLaminateLayer,
}) => {
  const layers = Array.isArray(laminateConfig?.layers) ? laminateConfig.layers : []
  const canAddLayer = layers.length < 5

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
      <div className="space-y-1.5">
        {layers.map((layer, index) => (
          <Fragment key={`laminate-layer-${index}`}>
            <GlassRow
              layerKey={`laminate.layers.${index}`}
              unavailableState={unavailableLayers[`laminate.layers.${index}`] || null}
              data={layer}
              onChange={(field, value) => updateConfigLayer('laminate', index, field, value)}
              catalog={catalog}
              onRemove={index > 1 ? () => onRemoveLaminateLayer(index) : null}
            />
            {index < layers.length - 1 && <ConnectorRow />}
          </Fragment>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onAddLaminateLayer}
          disabled={!canAddLayer}
          className={`inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-xs font-black transition-colors ${canAddLayer ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}
        >
          <Plus size={14} />
          افزودن شیشه
        </button>
      </div>
    </div>
  )
}
