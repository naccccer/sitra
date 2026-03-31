import { findMatchingGlassByTitleAndProcess } from '@/modules/sales/components/customer/order-form/orderFormUtils';

export const createConfigLayerUpdater = ({ setConfig, catalogDefaults, catalog }) => {
  const suggestInterlayer = (totalThick) => {
    const rule = catalogDefaults.pvbLogic.find((item) => (
      totalThick >= item.minTotalThickness && totalThick <= item.maxTotalThickness
    ));
    return rule ? rule.defaultInterlayerId : catalogDefaults.interlayers[0]?.id;
  };

  return (assembly, paneKey, subField, value, innerField = null) => {
    setConfig((previous) => {
      const nextConfig = JSON.parse(JSON.stringify(previous));
      if (innerField) nextConfig[assembly][paneKey][subField][innerField] = value;
      else if (subField) nextConfig[assembly][paneKey][subField] = value;
      else nextConfig[assembly][paneKey] = value;

      const isSekuritToggle = innerField === 'isSekurit'
        || subField === 'isSekurit'
        || (assembly === 'single' && paneKey === 'isSekurit');
      if (isSekuritToggle) {
        let glassLayer = null;
        if (assembly === 'single') glassLayer = nextConfig.single;
        else if (assembly === 'laminate' && (paneKey === 'glass1' || paneKey === 'glass2')) glassLayer = nextConfig.laminate[paneKey];
        else if (assembly === 'double' && (subField === 'glass1' || subField === 'glass2')) glassLayer = nextConfig.double[paneKey][subField];

        if (glassLayer) {
          const targetProcess = glassLayer.isSekurit ? 'sekurit' : 'raw';
          const matchedGlass = findMatchingGlassByTitleAndProcess(glassLayer.glassId, targetProcess, catalog);
          if (matchedGlass) glassLayer.glassId = matchedGlass.id;
        }
      }

      if ((innerField === 'thick' || subField === 'thick') && (assembly === 'laminate' || (assembly === 'double' && nextConfig.double[paneKey].isLaminated))) {
        if (assembly === 'laminate') {
          const total = nextConfig.laminate.glass1.thick + nextConfig.laminate.glass2.thick;
          nextConfig.laminate.interlayerId = suggestInterlayer(total);
        }
        if (assembly === 'double') {
          const total = nextConfig.double[paneKey].glass1.thick + nextConfig.double[paneKey].glass2.thick;
          nextConfig.double[paneKey].interlayerId = suggestInterlayer(total);
        }
      }
      return nextConfig;
    });
  };
};

export const buildManualErrors = ({
  manualBaseAmount,
  manualDiscountRaw,
  manualDraft,
  manualQtyRaw,
  manualUnitPriceRaw,
}) => {
  const next = {};
  if (String(manualDraft.title || '').trim() === '') next.title = 'عنوان آیتم الزامی است.';
  if (manualQtyRaw === null || manualQtyRaw < 1) next.qty = 'تعداد باید حداقل 1 باشد.';
  if (manualUnitPriceRaw === null || manualUnitPriceRaw <= 0) next.unitPrice = 'قیمت فی باید بیشتر از صفر باشد.';
  if (manualDraft.discountType === 'percent') {
    if (manualDiscountRaw === null) next.discountValue = 'درصد تخفیف را وارد کنید.';
    else if (manualDiscountRaw < 0 || manualDiscountRaw > 100) next.discountValue = 'درصد تخفیف باید بین 0 تا 100 باشد.';
  }
  if (manualDraft.discountType === 'fixed') {
    if (manualDiscountRaw === null) next.discountValue = 'مبلغ تخفیف را وارد کنید.';
    else if (manualDiscountRaw < 0) next.discountValue = 'مبلغ تخفیف نمی‌تواند منفی باشد.';
    else if (manualDiscountRaw > manualBaseAmount) next.discountValue = 'تخفیف ثابت نمی‌تواند بیشتر از مبلغ پایه باشد.';
  }
  return next;
};
