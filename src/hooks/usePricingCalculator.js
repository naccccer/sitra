import { useMemo } from 'react';

const glassProcess = (glass) => glass?.process || 'raw';
const normalizeGlassTitle = (title) => (title || '').toString().trim().toLowerCase();

export const usePricingCalculator = (dimensions, activeTab, config, catalog) => {
  const validationErrors = useMemo(() => {
    const errors = [];
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const maxLimits = catalog.factoryLimits;

    if (maxLimits && ((w > maxLimits.maxWidth && h > maxLimits.maxHeight) || (w > maxLimits.maxHeight && h > maxLimits.maxWidth))) {
      errors.push(`ابعاد از حداکثر ظرفیت کارخانه (${maxLimits.maxWidth}×${maxLimits.maxHeight}) بیشتر است.`);
    }

    const glasses = Array.isArray(catalog.glasses) ? catalog.glasses : [];

    const validateGlassLayer = (layer, label) => {
      if (!layer?.glassId) {
        errors.push(`${label}: نوع شیشه انتخاب نشده است.`);
        return;
      }

      const selectedGlass = glasses.find(g => g.id === layer.glassId);
      if (!selectedGlass) {
        errors.push(`${label}: ردیف شیشه انتخابی پیدا نشد.`);
        return;
      }

      const expectedProcess = layer.isSekurit ? 'sekurit' : 'raw';
      const actualProcess = glassProcess(selectedGlass);

      if (actualProcess !== expectedProcess) {
        const normalizedTitle = normalizeGlassTitle(selectedGlass.title);
        const matchingVariant = glasses.find(g => normalizeGlassTitle(g.title) === normalizedTitle && glassProcess(g) === expectedProcess);

        if (matchingVariant) {
          errors.push(`${label}: نوع فرآیند با وضعیت سکوریت همخوانی ندارد.`);
        } else {
          const processLabel = expectedProcess === 'sekurit' ? 'سکوریت' : 'خام';
          errors.push(`${label}: ردیف ${processLabel} هم‌عنوان در ماتریس تعریف نشده است.`);
        }
      }

      if (!Object.prototype.hasOwnProperty.call(selectedGlass.prices || {}, layer.thick)) {
        errors.push(`${label}: قیمت ضخامت ${layer.thick} میلی‌متر تعریف نشده است.`);
      }
    };

    const validatePane = (pane, paneLabel) => {
      if (!pane) return;

      if (!pane.isLaminated) {
        validateGlassLayer(pane.glass1, paneLabel);
        return;
      }

      validateGlassLayer(pane.glass1, `${paneLabel} - لایه اول`);
      validateGlassLayer(pane.glass2, `${paneLabel} - لایه دوم`);
    };

    if (activeTab === 'single') {
      validateGlassLayer(config.single, 'شیشه تک‌جداره');
    } else if (activeTab === 'double') {
      validatePane(config.double?.pane1, 'جداره بیرونی');
      validatePane(config.double?.pane2, 'جداره داخلی');
    } else if (activeTab === 'laminate') {
      validateGlassLayer(config.laminate?.glass1, 'لمینت - لایه اول');
      validateGlassLayer(config.laminate?.glass2, 'لمینت - لایه دوم');
    }

    return errors;
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
      const glass = (catalog.glasses || []).find(g => g.id === gId);
      const price = Number(glass?.prices?.[thk] ?? 0);
      return Number.isFinite(price) ? price : 0;
    };

    const calcPane = (pane) => {
      if (!pane?.isLaminated) {
        return getGlassPrice(pane?.glass1?.glassId, pane?.glass1?.thick) * effectiveArea;
      }

      const g1 = getGlassPrice(pane.glass1?.glassId, pane.glass1?.thick) * effectiveArea;
      const g2 = getGlassPrice(pane.glass2?.glassId, pane.glass2?.thick) * effectiveArea;
      const interlayer = interlayers.find(i => i.id === pane.interlayerId);
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

      const spacer = spacers.find(s => s.id === config.double?.spacerId);
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
      const op = (catalog.operations || []).find(o => o.id === opId);
      if (!op) return;

      if (op.unit === 'qty') unitTotal += Number(op.price || 0) * qty;
      else if (op.unit === 'm_length') unitTotal += Number(op.price || 0) * perimeter;
      else unitTotal += Number(op.price || 0) * effectiveArea;
    });

    const edgeWork = fees.edgeWork || { unit: 'm_length', price: 0 };
    const edgeLayersCount = collectLayersForEdgeWork().filter(layer => layer?.hasEdge).length;
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
      .filter(r => maxDim >= r.minDim && (r.maxDim === 0 || maxDim <= r.maxDim))
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

  return { validationErrors, pricingDetails };
};
