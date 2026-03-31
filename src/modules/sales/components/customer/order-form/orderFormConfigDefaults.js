export const resolveCatalogDefaults = (catalog) => ({
  glasses: Array.isArray(catalog?.glasses) ? catalog.glasses : [],
  pvbLogic: Array.isArray(catalog?.pvbLogic) ? catalog.pvbLogic : [],
  spacers: Array.isArray(catalog?.connectors?.spacers) ? catalog.connectors.spacers : [],
  interlayers: Array.isArray(catalog?.connectors?.interlayers) ? catalog.connectors.interlayers : [],
});

export const buildInitialConfig = (catalog) => {
  const defaults = resolveCatalogDefaults(catalog);

  const suggestInterlayer = (totalThick) => {
    const rule = defaults.pvbLogic.find((item) => (
      totalThick >= item.minTotalThickness && totalThick <= item.maxTotalThickness
    ));
    return rule ? rule.defaultInterlayerId : defaults.interlayers[0]?.id;
  };

  return {
    operations: {},
    pattern: { type: 'none', fileName: '' },
    single: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
    laminate: {
      glass1: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
      interlayerId: suggestInterlayer(8),
      glass2: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
    },
    double: {
      spacerId: defaults.spacers[0]?.id,
      pane1: {
        isLaminated: false,
        glass1: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
        interlayerId: suggestInterlayer(8),
        glass2: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
      },
      pane2: {
        isLaminated: false,
        glass1: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
        interlayerId: suggestInterlayer(8),
        glass2: { glassId: defaults.glasses[0]?.id || '', thick: 4, isSekurit: false, hasEdge: false },
      },
    },
  };
};

