import { findMatchingGlassByTitleAndProcess } from '@/modules/sales/components/customer/order-form/orderFormUtils';
import {
  createDefaultGlassLayer,
  normalizeLaminateConfig,
  suggestInterlayer,
  sumLaminatePairThickness,
} from '@/utils/laminateConfig';

const cloneConfig = (value) => JSON.parse(JSON.stringify(value));

const normalizeLaminateForForm = (laminate, catalogDefaults) => normalizeLaminateConfig(laminate, {
  defaultGlassId: catalogDefaults.glasses[0]?.id || '',
  defaultInterlayerId: catalogDefaults.interlayers[0]?.id,
  pvbLogic: catalogDefaults.pvbLogic,
  interlayers: catalogDefaults.interlayers,
});

const suggestPairInterlayer = (firstLayer, secondLayer, catalogDefaults) => suggestInterlayer(
  sumLaminatePairThickness(firstLayer, secondLayer),
  catalogDefaults.pvbLogic,
  catalogDefaults.interlayers,
  catalogDefaults.interlayers[0]?.id,
);

const syncLaminateInterlayers = (laminate, catalogDefaults) => ({
  ...laminate,
  interlayerIds: Array.from({ length: Math.max(0, laminate.layers.length - 1) }, (_, index) => (
    suggestPairInterlayer(laminate.layers[index], laminate.layers[index + 1], catalogDefaults)
  )),
});

const syncLayerProcessBySekurit = (glassLayer, catalog) => {
  const targetProcess = glassLayer.isSekurit ? 'sekurit' : 'raw';
  const matchedGlass = findMatchingGlassByTitleAndProcess(glassLayer.glassId, targetProcess, catalog);
  if (matchedGlass) glassLayer.glassId = matchedGlass.id;
};

export const createConfigLayerUpdater = ({ setConfig, catalogDefaults, catalog }) => (
  (assembly, paneKey, subField, value, innerField = null) => {
    setConfig((previous) => {
      const nextConfig = cloneConfig(previous);

      if (assembly === 'laminate' && typeof paneKey === 'number' && subField) {
        const nextLaminate = normalizeLaminateForForm(nextConfig.laminate, catalogDefaults);
        nextLaminate.layers[paneKey][subField] = value;

        if (subField === 'isSekurit') {
          syncLayerProcessBySekurit(nextLaminate.layers[paneKey], catalog);
        }

        nextConfig.laminate = subField === 'thick'
          ? syncLaminateInterlayers(nextLaminate, catalogDefaults)
          : nextLaminate;
        return nextConfig;
      }

      if (innerField) nextConfig[assembly][paneKey][subField][innerField] = value;
      else if (subField) nextConfig[assembly][paneKey][subField] = value;
      else nextConfig[assembly][paneKey] = value;

      const isSekuritToggle = innerField === 'isSekurit'
        || subField === 'isSekurit'
        || (assembly === 'single' && paneKey === 'isSekurit');
      if (isSekuritToggle) {
        let glassLayer = null;
        if (assembly === 'single') glassLayer = nextConfig.single;
        else if (assembly === 'double' && (subField === 'glass1' || subField === 'glass2')) glassLayer = nextConfig.double[paneKey][subField];

        if (glassLayer) syncLayerProcessBySekurit(glassLayer, catalog);
      }

      if ((innerField === 'thick' || subField === 'thick') && assembly === 'double' && nextConfig.double[paneKey].isLaminated) {
        nextConfig.double[paneKey].interlayerId = suggestPairInterlayer(
          nextConfig.double[paneKey].glass1,
          nextConfig.double[paneKey].glass2,
          catalogDefaults,
        );
      }

      return nextConfig;
    });
  }
);

export const createLaminateLayerAdder = ({ setConfig, catalogDefaults }) => () => {
  setConfig((previous) => {
    const nextConfig = cloneConfig(previous);
    const nextLaminate = normalizeLaminateForForm(nextConfig.laminate, catalogDefaults);
    if (nextLaminate.layers.length >= 5) return nextConfig;

    const newLayer = createDefaultGlassLayer(catalogDefaults.glasses[0]?.id || '');
    nextLaminate.layers.push(newLayer);
    nextLaminate.interlayerIds.push(
      suggestPairInterlayer(nextLaminate.layers[nextLaminate.layers.length - 2], newLayer, catalogDefaults),
    );
    nextConfig.laminate = nextLaminate;
    return nextConfig;
  });
};

export const createLaminateLayerRemover = ({ setConfig, catalogDefaults }) => (layerIndex) => {
  setConfig((previous) => {
    const nextConfig = cloneConfig(previous);
    const nextLaminate = normalizeLaminateForForm(nextConfig.laminate, catalogDefaults);
    if (nextLaminate.layers.length <= 2 || layerIndex < 2 || layerIndex >= nextLaminate.layers.length) {
      return nextConfig;
    }

    nextLaminate.layers.splice(layerIndex, 1);
    nextConfig.laminate = syncLaminateInterlayers(nextLaminate, catalogDefaults);
    return nextConfig;
  });
};

export const buildManualErrors = ({
  manualBaseAmount,
  manualDiscountRaw,
  manualDraft,
  manualQtyRaw,
  manualUnitPriceRaw,
}) => {
  const next = {};
  if (String(manualDraft.title || '').trim() === '') next.title = 'Ø¹Ù†ÙˆØ§Ù† Ø¢ÛŒØªÙ… Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.';
  if (manualQtyRaw === null || manualQtyRaw < 1) next.qty = 'ØªØ¹Ø¯Ø§Ø¯ Ø¨Ø§ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ 1 Ø¨Ø§Ø´Ø¯.';
  if (manualUnitPriceRaw === null || manualUnitPriceRaw <= 0) next.unitPrice = 'Ù‚ÛŒÙ…Øª ÙÛŒ Ø¨Ø§ÛŒØ¯ Ø¨ÛŒØ´ØªØ± Ø§Ø² ØµÙØ± Ø¨Ø§Ø´Ø¯.';
  if (manualDraft.discountType === 'percent') {
    if (manualDiscountRaw === null) next.discountValue = 'Ø¯Ø±ØµØ¯ ØªØ®ÙÛŒÙ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.';
    else if (manualDiscountRaw < 0 || manualDiscountRaw > 100) next.discountValue = 'Ø¯Ø±ØµØ¯ ØªØ®ÙÛŒÙ Ø¨Ø§ÛŒØ¯ Ø¨ÛŒÙ† 0 ØªØ§ 100 Ø¨Ø§Ø´Ø¯.';
  }
  if (manualDraft.discountType === 'fixed') {
    if (manualDiscountRaw === null) next.discountValue = 'Ù…Ø¨Ù„Øº ØªØ®ÙÛŒÙ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.';
    else if (manualDiscountRaw < 0) next.discountValue = 'Ù…Ø¨Ù„Øº ØªØ®ÙÛŒÙ Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯.';
    else if (manualDiscountRaw > manualBaseAmount) next.discountValue = 'ØªØ®ÙÛŒÙ Ø«Ø§Ø¨Øª Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨ÛŒØ´ØªØ± Ø§Ø² Ù…Ø¨Ù„Øº Ù¾Ø§ÛŒÙ‡ Ø¨Ø§Ø´Ø¯.';
  }
  return next;
};
