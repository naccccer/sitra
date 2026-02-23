import { useMemo } from 'react';

const glassProcess = (glass) => glass?.process || 'raw';
const normalizeGlassTitle = (title) => (title || '').toString().trim().toLowerCase();

const LABELS = {
  single: '\u0634\u06cc\u0634\u0647 \u062a\u06a9\u200c\u062c\u062f\u0627\u0631\u0647',
  pane1: '\u062c\u062f\u0627\u0631\u0647 \u0628\u06cc\u0631\u0648\u0646\u06cc',
  pane2: '\u062c\u062f\u0627\u0631\u0647 \u062f\u0627\u062e\u0644\u06cc',
  laminateGlass1: '\u0644\u0645\u06cc\u0646\u062a - \u0644\u0627\u06cc\u0647 \u0627\u0648\u0644',
  laminateGlass2: '\u0644\u0645\u06cc\u0646\u062a - \u0644\u0627\u06cc\u0647 \u062f\u0648\u0645',
  paneLayer1: '\u0644\u0627\u06cc\u0647 \u0627\u0648\u0644',
  paneLayer2: '\u0644\u0627\u06cc\u0647 \u062f\u0648\u0645',
};

export const usePricingCalculator = (dimensions, activeTab, config, catalog) => {
  const { validationErrors, summaryErrors, unavailableLayers } = useMemo(() => {
    const issues = [];
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const maxLimits = catalog.factoryLimits;

    const addIssue = (message, kind = 'summary', layerKey = null) => {
      issues.push({ message, kind, layerKey });
    };

    if (maxLimits && ((w > maxLimits.maxWidth && h > maxLimits.maxHeight) || (w > maxLimits.maxHeight && h > maxLimits.maxWidth))) {
      addIssue(`\u0627\u0628\u0639\u0627\u062f \u0627\u0632 \u062d\u062f\u0627\u06a9\u062b\u0631 \u0638\u0631\u0641\u06cc\u062a \u06a9\u0627\u0631\u062e\u0627\u0646\u0647 (${maxLimits.maxWidth}\u00d7${maxLimits.maxHeight}) \u0628\u06cc\u0634\u062a\u0631 \u0627\u0633\u062a.`);
    }

    const glasses = Array.isArray(catalog.glasses) ? catalog.glasses : [];

    const validateGlassLayer = (layer, label, layerKey) => {
      if (!layer?.glassId) {
        addIssue(`${label}: \u0646\u0648\u0639 \u0634\u06cc\u0634\u0647 \u0627\u0646\u062a\u062e\u0627\u0628 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.`);
        return;
      }

      const selectedGlass = glasses.find((g) => g.id === layer.glassId);
      if (!selectedGlass) {
        addIssue(`${label}: \u0631\u062f\u06cc\u0641 \u0634\u06cc\u0634\u0647 \u0627\u0646\u062a\u062e\u0627\u0628\u06cc \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f.`, 'unavailable', layerKey);
        return;
      }

      const expectedProcess = layer.isSekurit ? 'sekurit' : 'raw';
      const actualProcess = glassProcess(selectedGlass);

      if (actualProcess !== expectedProcess) {
        const normalizedTitle = normalizeGlassTitle(selectedGlass.title);
        const matchingVariant = glasses.find((g) => normalizeGlassTitle(g.title) === normalizedTitle && glassProcess(g) === expectedProcess);

        if (matchingVariant) {
          addIssue(`${label}: \u0646\u0648\u0639 \u0641\u0631\u0622\u06cc\u0646\u062f \u0628\u0627 \u0648\u0636\u0639\u06cc\u062a \u0633\u06a9\u0648\u0631\u06cc\u062a \u0647\u0645\u200c\u062e\u0648\u0627\u0646\u06cc \u0646\u062f\u0627\u0631\u062f.`);
        } else {
          const processLabel = expectedProcess === 'sekurit' ? '\u0633\u06a9\u0648\u0631\u06cc\u062a' : '\u062e\u0627\u0645';
          addIssue(`${label}: \u0631\u062f\u06cc\u0641 ${processLabel} \u0647\u0645\u200c\u0639\u0646\u0648\u0627\u0646 \u062f\u0631 \u0645\u0627\u062a\u0631\u06cc\u0633 \u062a\u0639\u0631\u06cc\u0641 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.`, 'unavailable', layerKey);
        }
      }

      if (!Object.prototype.hasOwnProperty.call(selectedGlass.prices || {}, layer.thick)) {
        addIssue(`${label}: \u0642\u06cc\u0645\u062a \u0636\u062e\u0627\u0645\u062a ${layer.thick} \u0645\u06cc\u0644\u06cc\u200c\u0645\u062a\u0631 \u062a\u0639\u0631\u06cc\u0641 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.`, 'unavailable', layerKey);
      }
    };

    const validatePane = (pane, paneLabel, paneKey) => {
      if (!pane) return;

      if (!pane.isLaminated) {
        validateGlassLayer(pane.glass1, paneLabel, `${paneKey}.glass1`);
        return;
      }

      validateGlassLayer(pane.glass1, `${paneLabel} - ${LABELS.paneLayer1}`, `${paneKey}.glass1`);
      validateGlassLayer(pane.glass2, `${paneLabel} - ${LABELS.paneLayer2}`, `${paneKey}.glass2`);
    };

    if (activeTab === 'single') {
      validateGlassLayer(config.single, LABELS.single, 'single.glass1');
    } else if (activeTab === 'double') {
      validatePane(config.double?.pane1, LABELS.pane1, 'double.pane1');
      validatePane(config.double?.pane2, LABELS.pane2, 'double.pane2');
    } else if (activeTab === 'laminate') {
      validateGlassLayer(config.laminate?.glass1, LABELS.laminateGlass1, 'laminate.glass1');
      validateGlassLayer(config.laminate?.glass2, LABELS.laminateGlass2, 'laminate.glass2');
    }

    const unavailableMap = {};
    issues.forEach((issue) => {
      if (issue.kind === 'unavailable' && issue.layerKey) {
        unavailableMap[issue.layerKey] = true;
      }
    });

    return {
      validationErrors: issues.map((issue) => issue.message),
      summaryErrors: issues
        .filter((issue) => issue.kind === 'summary')
        .map((issue) => issue.message),
      unavailableLayers: unavailableMap,
    };
  }, [dimensions, activeTab, config, catalog]);

  const pricingDetails = useMemo(() => {
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const count = parseInt(dimensions.count, 10) || 1;
    const effectiveArea = w > 0 && h > 0 ? Math.max(0.25, (w * h) / 10000) : 0;
    const perimeter = w > 0 && h > 0 ? (2 * (w + h)) / 100 : 0;

    if (effectiveArea === 0 || count < 1 || validationErrors.length > 0) return { unitPrice: 0, total: 0 };

    const fees = catalog.fees || {};
    const roundStep = Number(catalog.roundStep) > 0 ? Number(catalog.roundStep) : 1000;
    const interlayers = catalog.connectors?.interlayers || [];
    const spacers = catalog.connectors?.spacers || [];

    let unitTotal = 0;

    const getGlassPrice = (gId, thk) => {
      const glass = (catalog.glasses || []).find((g) => g.id === gId);
      const price = Number(glass?.prices?.[thk] ?? 0);
      return Number.isFinite(price) ? price : 0;
    };

    const calcPane = (pane) => {
      if (!pane?.isLaminated) {
        return getGlassPrice(pane?.glass1?.glassId, pane?.glass1?.thick) * effectiveArea;
      }

      const g1 = getGlassPrice(pane.glass1?.glassId, pane.glass1?.thick) * effectiveArea;
      const g2 = getGlassPrice(pane.glass2?.glassId, pane.glass2?.thick) * effectiveArea;
      const interlayer = interlayers.find((i) => i.id === pane.interlayerId);
      const pvbUnit = interlayer?.unit || 'm_square';
      const pvbPriceBase = Number(interlayer?.price || 0);
      const pvbPrice = pvbUnit === 'm_square' ? pvbPriceBase * effectiveArea : pvbPriceBase;

      const laminatingFee = fees.laminating || {};
      const asmUnit = laminatingFee.unit || 'm_square';
      const asmPriceBase = Number(laminatingFee.price || 0);
      const asmPrice = asmUnit === 'm_square' ? asmPriceBase * effectiveArea : asmPriceBase;
      const asmFixed = Number(laminatingFee.fixedOrderPrice || 0);

      return g1 + g2 + pvbPrice + asmPrice + asmFixed;
    };

    const collectLayersForEdgeWork = () => {
      if (activeTab === 'single') return [config.single];

      if (activeTab === 'laminate') {
        return [config.laminate?.glass1, config.laminate?.glass2].filter(Boolean);
      }

      if (activeTab === 'double') {
        const pane1Layers = config.double?.pane1?.isLaminated
          ? [config.double?.pane1?.glass1, config.double?.pane1?.glass2]
          : [config.double?.pane1?.glass1];

        const pane2Layers = config.double?.pane2?.isLaminated
          ? [config.double?.pane2?.glass1, config.double?.pane2?.glass2]
          : [config.double?.pane2?.glass1];

        return [...pane1Layers, ...pane2Layers].filter(Boolean);
      }

      return [];
    };

    if (activeTab === 'single') {
      unitTotal += calcPane({ isLaminated: false, glass1: config.single });
    } else if (activeTab === 'double') {
      unitTotal += calcPane(config.double?.pane1) + calcPane(config.double?.pane2);

      const spacer = spacers.find((s) => s.id === config.double?.spacerId);
      const spacerUnit = spacer?.unit || 'm_length';
      const spacerPriceBase = Number(spacer?.price || 0);
      unitTotal += spacerUnit === 'm_length' ? spacerPriceBase * perimeter : spacerPriceBase * effectiveArea;

      const doubleGlazingFee = fees.doubleGlazing || {};
      const dblUnit = doubleGlazingFee.unit || 'm_square';
      const dblPriceBase = Number(doubleGlazingFee.price || 0);
      unitTotal += dblUnit === 'm_square' ? dblPriceBase * effectiveArea : dblPriceBase;
      unitTotal += Number(doubleGlazingFee.fixedOrderPrice || 0);
    } else if (activeTab === 'laminate') {
      unitTotal += calcPane({ isLaminated: true, ...config.laminate });
    }

    Object.entries(config.operations || {}).forEach(([opId, qty]) => {
      const op = (catalog.operations || []).find((o) => o.id === opId);
      if (!op) return;

      if (op.unit === 'qty') unitTotal += Number(op.price || 0) * qty;
      else if (op.unit === 'm_length') unitTotal += Number(op.price || 0) * perimeter;
      else unitTotal += Number(op.price || 0) * effectiveArea;
    });

    const edgeWork = fees.edgeWork || { unit: 'm_length', price: 0 };
    const edgeLayersCount = collectLayersForEdgeWork().filter((layer) => layer?.hasEdge).length;
    if (edgeLayersCount > 0) {
      const edgePrice = Number(edgeWork.price || 0);
      if (edgeWork.unit === 'm_square') unitTotal += edgeLayersCount * edgePrice * effectiveArea;
      else if (edgeWork.unit === 'fixed') unitTotal += edgeLayersCount * edgePrice;
      else unitTotal += edgeLayersCount * edgePrice * perimeter;
    }

    if (config.pattern?.type && config.pattern.type !== 'none') {
      const patternFee = fees.pattern || {};
      const patUnit = patternFee.unit || 'order';
      const patternPrice = Number(patternFee.price || 0);
      unitTotal += patUnit === 'qty' ? patternPrice * count : patternPrice;
    }

    const maxDim = Math.max(w, h);
    const jumboRules = Array.isArray(catalog.jumboRules) ? catalog.jumboRules : [];
    const applicableJumbo = jumboRules
      .filter((r) => maxDim >= r.minDim && (r.maxDim === 0 || maxDim <= r.maxDim))
      .sort((a, b) => Number(b.value ?? b.addedPercentage ?? 0) - Number(a.value ?? a.addedPercentage ?? 0))[0];

    if (applicableJumbo) {
      const jumboType = applicableJumbo.type || 'percentage';
      const jumboValue = Number(applicableJumbo.value ?? applicableJumbo.addedPercentage ?? 0);
      if (jumboType === 'fixed') unitTotal += jumboValue;
      else unitTotal += unitTotal * (jumboValue / 100);
    }

    const roundedUnitPrice = Math.ceil(unitTotal / roundStep) * roundStep;
    return { unitPrice: roundedUnitPrice, total: roundedUnitPrice * count, effectiveArea };
  }, [dimensions, activeTab, config, catalog, validationErrors]);

  return { validationErrors, summaryErrors, unavailableLayers, pricingDetails };
};
