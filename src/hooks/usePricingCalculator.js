import { useMemo } from 'react';

export const usePricingCalculator = (dimensions, activeTab, config, catalog) => {
  const validationErrors = useMemo(() => {
    const errors = [];
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const maxLimits = catalog.factoryLimits;
    if (maxLimits && ((w > maxLimits.maxWidth && h > maxLimits.maxHeight) || (w > maxLimits.maxHeight && h > maxLimits.maxWidth))) {
      errors.push(`ابعاد از حداکثر ظرفیت کارخانه (${maxLimits.maxWidth}×${maxLimits.maxHeight}) بیشتر است.`);
    }
    return errors;
  }, [dimensions, catalog.factoryLimits]);

  const pricingDetails = useMemo(() => {
    const w = parseFloat(dimensions.width) || 0;
    const h = parseFloat(dimensions.height) || 0;
    const count = parseInt(dimensions.count) || 1;
    const effectiveArea = w > 0 && h > 0 ? Math.max(0.25, (w * h) / 10000) : 0;
    const perimeter = w > 0 && h > 0 ? (2 * (w + h)) / 100 : 0;

    if (effectiveArea === 0 || count < 1 || validationErrors.length > 0) return { unitPrice: 0, total: 0 };

    let unitTotal = 0;
    const getGlassPrice = (gId, thk, isSek) => {
      const glass = catalog.glasses.find(g => g.id === gId) || catalog.glasses[0];
      const p = glass?.prices[thk] || 0;
      return p * (isSek ? 1.5 : 1);
    };

    const calcPane = (pane) => {
      if (!pane.isLaminated) return getGlassPrice(pane.glass1.glassId, pane.glass1.thick, pane.glass1.isSekurit) * effectiveArea;
      const g1 = getGlassPrice(pane.glass1.glassId, pane.glass1.thick, pane.glass1.isSekurit) * effectiveArea;
      const g2 = getGlassPrice(pane.glass2.glassId, pane.glass2.thick, pane.glass2.isSekurit) * effectiveArea;
      const pvbUnit = catalog.connectors.interlayers.find(i => i.id === pane.interlayerId)?.unit || 'm_square';
      const pvbPriceBase = catalog.connectors.interlayers.find(i => i.id === pane.interlayerId)?.price || 0;
      const pvbPrice = pvbUnit === 'm_square' ? pvbPriceBase * effectiveArea : pvbPriceBase;
      const asmUnit = catalog.fees.laminating.unit || 'm_square';
      const asmPrice = asmUnit === 'm_square' ? catalog.fees.laminating.price * effectiveArea : catalog.fees.laminating.price;
      return g1 + g2 + pvbPrice + asmPrice + catalog.fees.laminating.fixedOrderPrice;
    };

    if (activeTab === 'single') unitTotal += calcPane({ isLaminated: false, glass1: config.single });
    else if (activeTab === 'double') {
      unitTotal += calcPane(config.double.pane1) + calcPane(config.double.pane2);
      const spacerUnit = catalog.connectors.spacers.find(s => s.id === config.double.spacerId)?.unit || 'm_length';
      const spacerPriceBase = catalog.connectors.spacers.find(s => s.id === config.double.spacerId)?.price || 0;
      unitTotal += spacerUnit === 'm_length' ? spacerPriceBase * perimeter : spacerPriceBase * effectiveArea;
      const dblUnit = catalog.fees.doubleGlazing.unit || 'm_square';
      unitTotal += dblUnit === 'm_square' ? catalog.fees.doubleGlazing.price * effectiveArea : catalog.fees.doubleGlazing.price;
      unitTotal += catalog.fees.doubleGlazing.fixedOrderPrice;
    } else if (activeTab === 'laminate') {
      unitTotal += calcPane({ isLaminated: true, ...config.laminate });
    }

    Object.entries(config.operations || {}).forEach(([opId, qty]) => {
      const op = catalog.operations.find(o => o.id === opId);
      if(op) unitTotal += op.unit === 'qty' ? op.price * qty : op.price * effectiveArea;
    });
    
    if (config.pattern?.type && config.pattern.type !== 'none') {
      const patUnit = catalog.fees.pattern.unit || 'order';
      unitTotal += patUnit === 'qty' ? catalog.fees.pattern.price * count : catalog.fees.pattern.price;
    }

    const maxDim = Math.max(w, h);
    const applicableJumbo = catalog.jumboRules.filter(r => maxDim >= r.minDim && (r.maxDim === 0 || maxDim <= r.maxDim)).sort((a,b) => b.addedPercentage - a.addedPercentage)[0];
    if (applicableJumbo) {
      if(applicableJumbo.type === 'fixed') unitTotal += applicableJumbo.value;
      else unitTotal += unitTotal * (applicableJumbo.value / 100);
    }

    const roundedUnitPrice = Math.ceil(unitTotal / catalog.roundStep) * catalog.roundStep;
    return { unitPrice: roundedUnitPrice, total: roundedUnitPrice * count, effectiveArea };
  }, [dimensions, activeTab, config, catalog, validationErrors]);

  return { validationErrors, pricingDetails };
};