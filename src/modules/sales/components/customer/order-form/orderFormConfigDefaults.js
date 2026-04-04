import { createDefaultGlassLayer, normalizeLaminateConfig, suggestInterlayer } from '@/utils/laminateConfig';

export const resolveCatalogDefaults = (catalog) => ({
  glasses: Array.isArray(catalog?.glasses) ? catalog.glasses : [],
  pvbLogic: Array.isArray(catalog?.pvbLogic) ? catalog.pvbLogic : [],
  spacers: Array.isArray(catalog?.connectors?.spacers) ? catalog.connectors.spacers : [],
  interlayers: Array.isArray(catalog?.connectors?.interlayers) ? catalog.connectors.interlayers : [],
});

const suggestDefaultInterlayer = (totalThick, defaults) => suggestInterlayer(
  totalThick,
  defaults.pvbLogic,
  defaults.interlayers,
  defaults.interlayers[0]?.id,
);

const normalizeDoublePane = (pane, fallbackPane) => {
  const source = pane && typeof pane === 'object' ? pane : {};
  return {
    ...fallbackPane,
    ...source,
    glass1: { ...fallbackPane.glass1, ...(source.glass1 || {}) },
    glass2: { ...fallbackPane.glass2, ...(source.glass2 || {}) },
  };
};

export const buildInitialConfig = (catalog) => {
  const defaults = resolveCatalogDefaults(catalog);
  const defaultGlassId = defaults.glasses[0]?.id || '';
  const defaultLayer = createDefaultGlassLayer(defaultGlassId);

  return {
    operations: {},
    pattern: { type: 'none', fileName: '' },
    single: { ...defaultLayer },
    laminate: normalizeLaminateConfig(null, {
      defaultGlassId,
      defaultInterlayerId: defaults.interlayers[0]?.id,
      pvbLogic: defaults.pvbLogic,
      interlayers: defaults.interlayers,
    }),
    double: {
      spacerId: defaults.spacers[0]?.id,
      pane1: {
        isLaminated: false,
        glass1: { ...defaultLayer },
        interlayerId: suggestDefaultInterlayer(8, defaults),
        glass2: { ...defaultLayer },
      },
      pane2: {
        isLaminated: false,
        glass1: { ...defaultLayer },
        interlayerId: suggestDefaultInterlayer(8, defaults),
        glass2: { ...defaultLayer },
      },
    },
  };
};

export const normalizeOrderFormConfig = (config, catalog) => {
  const defaults = resolveCatalogDefaults(catalog);
  const baseConfig = buildInitialConfig(catalog);
  const source = config && typeof config === 'object' ? config : {};

  return {
    ...baseConfig,
    ...source,
    operations: source.operations && typeof source.operations === 'object' ? source.operations : {},
    pattern: source.pattern && typeof source.pattern === 'object'
      ? { ...baseConfig.pattern, ...source.pattern }
      : baseConfig.pattern,
    single: source.single && typeof source.single === 'object'
      ? { ...baseConfig.single, ...source.single }
      : baseConfig.single,
    laminate: normalizeLaminateConfig(source.laminate, {
      defaultGlassId: defaults.glasses[0]?.id || '',
      defaultInterlayerId: defaults.interlayers[0]?.id,
      pvbLogic: defaults.pvbLogic,
      interlayers: defaults.interlayers,
    }),
    double: {
      ...baseConfig.double,
      ...(source.double || {}),
      pane1: normalizeDoublePane(source.double?.pane1, baseConfig.double.pane1),
      pane2: normalizeDoublePane(source.double?.pane2, baseConfig.double.pane2),
    },
  };
};
