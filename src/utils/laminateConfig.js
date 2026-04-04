const DEFAULT_LAYER_THICKNESS = 4

const toThicknessNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export const createDefaultGlassLayer = (defaultGlassId = '') => ({
  glassId: defaultGlassId,
  thick: DEFAULT_LAYER_THICKNESS,
  isSekurit: false,
  hasEdge: false,
})

export const normalizeGlassLayer = (layer, fallbackLayer = createDefaultGlassLayer()) => {
  const source = layer && typeof layer === 'object' ? layer : {}
  return {
    glassId: source.glassId ?? fallbackLayer.glassId ?? '',
    thick: source.thick ?? fallbackLayer.thick ?? DEFAULT_LAYER_THICKNESS,
    isSekurit: Boolean(source.isSekurit ?? fallbackLayer.isSekurit),
    hasEdge: Boolean(source.hasEdge ?? fallbackLayer.hasEdge),
  }
}

export const sumLaminatePairThickness = (firstLayer, secondLayer) => (
  toThicknessNumber(firstLayer?.thick) + toThicknessNumber(secondLayer?.thick)
)

export const suggestInterlayer = (
  totalThick,
  pvbLogic = [],
  interlayers = [],
  fallbackId = '',
) => {
  const rule = pvbLogic.find((item) => (
    totalThick >= Number(item?.minTotalThickness ?? 0)
    && totalThick <= Number(item?.maxTotalThickness ?? 0)
  ))
  return rule?.defaultInterlayerId || fallbackId || interlayers[0]?.id || ''
}

export const normalizeLaminateConfig = (laminate, options = {}) => {
  const fallbackLayer = createDefaultGlassLayer(options.defaultGlassId || '')
  const source = laminate && typeof laminate === 'object' ? laminate : {}
  const legacyLayers = [source.glass1, source.glass2].filter(Boolean)
  const rawLayers = Array.isArray(source.layers) && source.layers.length > 0 ? source.layers : legacyLayers
  const layers = rawLayers.map((layer) => normalizeGlassLayer(layer, fallbackLayer))

  while (layers.length < 2) {
    layers.push(createDefaultGlassLayer(fallbackLayer.glassId))
  }

  const rawInterlayerIds = Array.isArray(source.interlayerIds)
    ? source.interlayerIds
    : (source.interlayerId ? [source.interlayerId] : [])

  const interlayerIds = Array.from({ length: Math.max(0, layers.length - 1) }, (_, index) => {
    const explicitId = rawInterlayerIds[index]
    if (explicitId !== undefined && explicitId !== null && String(explicitId) !== '') {
      return explicitId
    }
    return suggestInterlayer(
      sumLaminatePairThickness(layers[index], layers[index + 1]),
      options.pvbLogic,
      options.interlayers,
      options.defaultInterlayerId,
    )
  })

  return {
    layers,
    interlayerIds,
  }
}
