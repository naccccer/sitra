import { useMemo } from 'react';
import { toPN } from '@/utils/helpers';
import { normalizeLaminateConfig } from '@/utils/laminateConfig';
import {
  findApplicableJumboRule,
  isFactoryLimitExceeded,
  normalizeFactoryLimits,
  resolvePricingDimensions,
} from '@/utils/catalogPricing';

const glassProcess = (glass) => glass?.process || 'raw';
const normalizeGlassTitle = (title) => (title || '').toString().trim().toLowerCase();

const LABELS = {
  single: '\u0634\u06cc\u0634\u0647 \u062a\u06a9\u200c\u062c\u062f\u0627\u0631\u0647',
  pane1: '\u062c\u062f\u0627\u0631\u0647 \u0628\u06cc\u0631\u0648\u0646\u06cc',
  pane2: '\u062c\u062f\u0627\u0631\u0647 \u062f\u0627\u062e\u0644\u06cc',
  paneLayer1: '\u0644\u0627\u06cc\u0647 \u0627\u0648\u0644',
  paneLayer2: '\u0644\u0627\u06cc\u0647 \u062f\u0648\u0645',
};

const getVariableUnitPrice = (unit, basePrice, effectiveArea, perimeter) => {
  if (unit === 'm_square') return basePrice * effectiveArea;
  if (unit === 'm_length') return basePrice * perimeter;
  return basePrice;
};

export const usePricingCalculator = (dimensions, activeTab, config, catalog) => {
  const { validationErrors, summaryErrors, unavailableLayers } = useMemo(() => {
    const issues = [];
    const maxLimits = normalizeFactoryLimits(catalog.factoryLimits);
    const glasses = Array.isArray(catalog.glasses) ? catalog.glasses : [];
    const interlayers = Array.isArray(catalog.connectors?.interlayers) ? catalog.connectors.interlayers : [];
    const laminateConfig = normalizeLaminateConfig(config.laminate, {
      interlayers,
    });

    const addIssue = (message, kind = 'summary', layerKey = null) => {
      issues.push({ message, kind, layerKey });
    };

    if (isFactoryLimitExceeded(dimensions, maxLimits)) {
      addIssue(`ابعاد از حداکثر ظرفیت کارخانه (عرض ${toPN(maxLimits.maxShortSideCm)} و طول ${toPN(maxLimits.maxLongSideCm)}) بیشتر است.`);
    }

    const validateGlassLayer = (layer, label, layerKey) => {
      if (!layer?.glassId) {
        addIssue(`${label}: \u0646\u0648\u0639 \u0634\u06cc\u0634\u0647 \u0627\u0646\u062a\u062e\u0627\u0628 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.`);
        return;
      }

      const selectedGlass = glasses.find((g) => g.id === layer.glassId);
      if (!selectedGlass) {
        addIssue(`${label}: \u0631\u062f\u06cc\u0641 \u0634\u06cc\u0634\u0647 \u0627\u0646\u062a\u062e\u0627\u0628\u06cc \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f.`, 'unavailable_glass', layerKey);
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
          addIssue(`${label}: \u0631\u062f\u06cc\u0641 ${processLabel} \u0647\u0645\u200c\u0639\u0646\u0648\u0627\u0646 \u062f\u0631 \u0645\u0627\u062a\u0631\u06cc\u0633 \u062a\u0639\u0631\u06cc\u0641 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.`, 'unavailable_glass', layerKey);
        }
      }

      if (!Object.prototype.hasOwnProperty.call(selectedGlass.prices || {}, layer.thick)) {
        addIssue(`${label}: ضخامت انتخاب شده موجود نیست.`, 'unavailable_thickness', layerKey);
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
      laminateConfig.layers.forEach((layer, index) => {
        validateGlassLayer(layer, `لمینت - لایه ${toPN(index + 1)}`, `laminate.layers.${index}`);
      });
    }

    const unavailableMap = {};
    issues.forEach((issue) => {
      if (issue.layerKey) {
        unavailableMap[issue.layerKey] = issue.kind;
      }
    });

    return {
      validationErrors: issues.map((issue) => issue.message),
      summaryErrors: issues
        .filter((issue) => issue.kind === 'summary' || issue.kind === 'unavailable_thickness')
        .map((issue) => issue.message),
      unavailableLayers: unavailableMap,
    };
  }, [dimensions, activeTab, config, catalog]);

  const pricingDetails = useMemo(() => {
    const resolvedDimensions = resolvePricingDimensions(dimensions, catalog.factoryLimits);
    const count = parseInt(dimensions.count, 10) || 1;
    const effectiveArea = resolvedDimensions.billableAreaM2;
    const perimeter = resolvedDimensions.perimeterM;

    if (!resolvedDimensions.hasValidDimensions || effectiveArea === 0 || count < 1 || validationErrors.length > 0) {
      return { unitPrice: 0, total: 0, effectiveArea: 0, actualArea: 0, shortSideCm: 0, longSideCm: 0 };
    }

    const fees = catalog.fees || {};
    const roundStep = Number(catalog.roundStep) > 0 ? Number(catalog.roundStep) : 1000;
    const interlayers = Array.isArray(catalog.connectors?.interlayers) ? catalog.connectors.interlayers : [];
    const spacers = Array.isArray(catalog.connectors?.spacers) ? catalog.connectors.spacers : [];
    const laminateConfig = normalizeLaminateConfig(config.laminate, {
      interlayers,
    });

    let unitTotal = 0;

    const getGlassPrice = (gId, thk) => {
      const glass = (catalog.glasses || []).find((g) => g.id === gId);
      const price = Number(glass?.prices?.[thk] ?? 0);
      return Number.isFinite(price) ? price : 0;
    };

    const calcLegacyLaminatedPane = (pane) => {
      const g1 = getGlassPrice(pane.glass1?.glassId, pane.glass1?.thick) * effectiveArea;
      const g2 = getGlassPrice(pane.glass2?.glassId, pane.glass2?.thick) * effectiveArea;
      const interlayer = interlayers.find((item) => item.id === pane.interlayerId);
      const pvbPrice = getVariableUnitPrice(interlayer?.unit || 'm_square', Number(interlayer?.price || 0), effectiveArea, perimeter);

      const laminatingFee = fees.laminating || {};
      const asmPrice = getVariableUnitPrice(laminatingFee.unit || 'm_square', Number(laminatingFee.price || 0), effectiveArea, perimeter);
      const asmFixed = Number(laminatingFee.fixedOrderPrice || 0);

      return g1 + g2 + pvbPrice + asmPrice + asmFixed;
    };

    const calcLaminateAssembly = (laminate) => {
      const layersTotal = laminate.layers.reduce((sum, layer) => (
        sum + (getGlassPrice(layer?.glassId, layer?.thick) * effectiveArea)
      ), 0);

      const interlayerTotal = laminate.interlayerIds.reduce((sum, interlayerId) => {
        const interlayer = interlayers.find((item) => item.id === interlayerId);
        return sum + getVariableUnitPrice(interlayer?.unit || 'm_square', Number(interlayer?.price || 0), effectiveArea, perimeter);
      }, 0);

      const laminatingFee = fees.laminating || {};
      const asmVariable = laminate.interlayerIds.length * getVariableUnitPrice(
        laminatingFee.unit || 'm_square',
        Number(laminatingFee.price || 0),
        effectiveArea,
        perimeter,
      );
      const asmFixed = laminate.interlayerIds.length > 0 ? Number(laminatingFee.fixedOrderPrice || 0) : 0;

      return layersTotal + interlayerTotal + asmVariable + asmFixed;
    };

    const collectLayersForEdgeWork = () => {
      if (activeTab === 'single') return [config.single];
      if (activeTab === 'laminate') return laminateConfig.layers;

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
      unitTotal += getGlassPrice(config.single?.glassId, config.single?.thick) * effectiveArea;
    } else if (activeTab === 'double') {
      unitTotal += config.double?.pane1?.isLaminated
        ? calcLegacyLaminatedPane(config.double.pane1)
        : getGlassPrice(config.double?.pane1?.glass1?.glassId, config.double?.pane1?.glass1?.thick) * effectiveArea;
      unitTotal += config.double?.pane2?.isLaminated
        ? calcLegacyLaminatedPane(config.double.pane2)
        : getGlassPrice(config.double?.pane2?.glass1?.glassId, config.double?.pane2?.glass1?.thick) * effectiveArea;

      const spacer = spacers.find((s) => s.id === config.double?.spacerId);
      const spacerPriceBase = Number(spacer?.price || 0);
      unitTotal += getVariableUnitPrice(spacer?.unit || 'm_length', spacerPriceBase, effectiveArea, perimeter);

      const doubleGlazingFee = fees.doubleGlazing || {};
      unitTotal += getVariableUnitPrice(doubleGlazingFee.unit || 'm_square', Number(doubleGlazingFee.price || 0), effectiveArea, perimeter);
      unitTotal += Number(doubleGlazingFee.fixedOrderPrice || 0);
    } else if (activeTab === 'laminate') {
      unitTotal += calcLaminateAssembly(laminateConfig);
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

    const applicableJumbo = catalog?.jumboRulesEnabled === false
      ? null
      : findApplicableJumboRule(dimensions, catalog.jumboRules);

    if (applicableJumbo) {
      const jumboType = applicableJumbo.adjustmentType || 'percentage';
      const jumboValue = Number(applicableJumbo.adjustmentValue ?? 0);
      if (jumboType === 'fixed') unitTotal += jumboValue;
      else unitTotal += unitTotal * (jumboValue / 100);
    }

    const roundedUnitPrice = Math.ceil(unitTotal / roundStep) * roundStep;
    return {
      unitPrice: roundedUnitPrice,
      total: roundedUnitPrice * count,
      effectiveArea,
      actualArea: resolvedDimensions.actualAreaM2,
      shortSideCm: resolvedDimensions.shortSideCm,
      longSideCm: resolvedDimensions.longSideCm,
    };
  }, [dimensions, activeTab, config, catalog, validationErrors]);

  return { validationErrors, summaryErrors, unavailableLayers, pricingDetails };
};
