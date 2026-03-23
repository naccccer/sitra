import { useEffect, useMemo, useRef, useState } from 'react';
import { salesApi } from '../services/salesApi';
import {
  clampHoleValue,
  DEFAULT_HOLE_DIAMETER_CM,
  getHoleCenterCm,
  HOLE_STEP_CM,
  MAX_HOLE_COUNT,
  normalizeHole,
  normalizeHoleMap,
  parseDimensionCm,
  validateHoleMap,
} from './useSettingsModalHoleMapUtils';

const MAX_PATTERN_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const useSettingsModalLogic = ({ config, setConfig, setModalMode, dimensions }) => {
  const [view, setView] = useState('main');
  const [selectedServices, setSelectedServices] = useState({ ...config.operations });
  const [pattern, setPattern] = useState(() => {
    const source = config?.pattern && typeof config.pattern === 'object' ? config.pattern : { type: 'none', fileName: '' };
    if ((source?.type || 'none') === 'hole_map') {
      return { type: 'hole_map' };
    }
    return source;
  });
  const [holeMapDraft, setHoleMapDraft] = useState(() => normalizeHoleMap(config?.pattern?.holeMap));
  const [activeHoleId, setActiveHoleId] = useState(() => {
    const normalized = normalizeHoleMap(config?.pattern?.holeMap);
    return normalized.holes[0]?.id || '';
  });
  const [isUploadingPattern, setIsUploadingPattern] = useState(false);

  const fileInputRef = useRef(null);
  const widthCm = parseDimensionCm(dimensions?.width);
  const heightCm = parseDimensionCm(dimensions?.height);

  useEffect(() => {
    if (!activeHoleId) {
      if (holeMapDraft.holes[0]?.id) setActiveHoleId(holeMapDraft.holes[0].id);
      return;
    }
    if (!holeMapDraft.holes.some((hole) => hole.id === activeHoleId)) {
      setActiveHoleId(holeMapDraft.holes[0]?.id || '');
    }
  }, [activeHoleId, holeMapDraft.holes]);

  useEffect(() => {
    if (pattern.type !== 'hole_map') return;
    if (holeMapDraft.holes.length > 0) return;
    if (widthCm <= 0 || heightCm <= 0) return;

    const firstHole = normalizeHole({
      diameterCm: DEFAULT_HOLE_DIAMETER_CM,
      fromYEdge: 'top',
      fromZEdge: 'left',
      distanceYCm: heightCm / 2,
      distanceZCm: widthCm / 2,
    }, 0);

    setHoleMapDraft((prev) => {
      if (prev.holes.length > 0) return prev;
      return { ...prev, holes: [firstHole] };
    });
    setActiveHoleId(firstHole.id);
  }, [pattern.type, holeMapDraft.holes.length, widthCm, heightCm]);

  const holeMapValidation = useMemo(
    () => validateHoleMap(holeMapDraft, widthCm, heightCm),
    [holeMapDraft, widthCm, heightCm],
  );

  const activeHole = useMemo(
    () => holeMapDraft.holes.find((hole) => hole.id === activeHoleId) || null,
    [holeMapDraft.holes, activeHoleId],
  );

  const previewHoles = useMemo(() => {
    if (widthCm <= 0 || heightCm <= 0) {
      return holeMapDraft.holes.map((hole) => ({ hole, xPercent: 50, yPercent: 50, sizePercent: 4 }));
    }

    return holeMapDraft.holes.map((hole) => {
      const { centerX, centerY } = getHoleCenterCm(hole, widthCm, heightCm);
      const xPercent = Math.min(100, Math.max(0, (centerX / widthCm) * 100));
      const yPercent = Math.min(100, Math.max(0, (centerY / heightCm) * 100));
      const sizePercent = Math.max(2.4, Math.min(14, (Number(hole.diameterCm || 0) / Math.max(widthCm, heightCm)) * 100));
      return { hole, xPercent, yPercent, sizePercent };
    });
  }, [holeMapDraft.holes, widthCm, heightCm]);

  const canSave = pattern.type !== 'hole_map' || holeMapValidation.isValid;

  const toggleService = (id) => {
    setSelectedServices((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  };

  const openHoleMapDesigner = () => {
    setPattern({ type: 'hole_map' });
    setView('holeMap');
  };

  const readPreviewDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PATTERN_FILE_SIZE_BYTES) {
      alert('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');
      e.target.value = '';
      return;
    }

    setIsUploadingPattern(true);
    try {
      const [uploadResult, previewDataUrl] = await Promise.all([
        salesApi.uploadPatternFile(file),
        readPreviewDataUrl(file),
      ]);

      setPattern({
        type: 'upload',
        fileName: uploadResult?.originalName || file.name,
        previewDataUrl: typeof previewDataUrl === 'string' ? previewDataUrl : '',
        filePath: uploadResult?.filePath || '',
        mimeType: uploadResult?.mimeType || file.type || '',
        size: Number(uploadResult?.size || file.size || 0),
      });
    } catch (error) {
      console.error('Pattern file upload failed.', error);
      alert(error?.message || 'آپلود فایل الگو ناموفق بود.');
    } finally {
      setIsUploadingPattern(false);
      e.target.value = '';
    }
  };

  const addHole = (holeInput) => {
    setHoleMapDraft((prev) => {
      if (prev.holes.length >= MAX_HOLE_COUNT) return prev;
      const nextHole = normalizeHole(holeInput, prev.holes.length);
      setActiveHoleId(nextHole.id);
      return { ...prev, holes: [...prev.holes, nextHole] };
    });
  };

  const addHoleAtCenter = () => {
    if (widthCm <= 0 || heightCm <= 0) return;
    addHole({
      diameterCm: DEFAULT_HOLE_DIAMETER_CM,
      fromYEdge: 'top',
      fromZEdge: 'left',
      distanceYCm: heightCm / 2,
      distanceZCm: widthCm / 2,
    });
  };

  const handlePreviewClick = (event) => {
    if (widthCm <= 0 || heightCm <= 0) return;
    if (holeMapDraft.holes.length >= MAX_HOLE_COUNT) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
    const relativeY = Math.min(Math.max(0, event.clientY - rect.top), rect.height);
    const zDistance = (relativeX / rect.width) * widthCm;
    const yDistance = (relativeY / rect.height) * heightCm;

    addHole({
      diameterCm: DEFAULT_HOLE_DIAMETER_CM,
      fromYEdge: 'top',
      fromZEdge: 'left',
      distanceYCm: yDistance,
      distanceZCm: zDistance,
    });
  };

  const updateActiveHoleField = (field, value) => {
    if (!activeHoleId) return;
    setHoleMapDraft((prev) => ({
      ...prev,
      holes: prev.holes.map((hole) => {
        if (hole.id !== activeHoleId) return hole;
        if (field === 'fromYEdge') {
          return { ...hole, fromYEdge: value === 'bottom' ? 'bottom' : 'top' };
        }
        if (field === 'fromZEdge') {
          return { ...hole, fromZEdge: value === 'right' ? 'right' : 'left' };
        }
        if (field === 'diameterCm') {
          return { ...hole, diameterCm: clampHoleValue(value, HOLE_STEP_CM) };
        }
        if (field === 'distanceYCm') {
          return { ...hole, distanceYCm: clampHoleValue(value, 0) };
        }
        if (field === 'distanceZCm') {
          return { ...hole, distanceZCm: clampHoleValue(value, 0) };
        }
        return hole;
      }),
    }));
  };

  const deleteHole = (holeId) => {
    setHoleMapDraft((prev) => ({
      ...prev,
      holes: prev.holes.filter((hole) => hole.id !== holeId),
    }));
    if (activeHoleId === holeId) {
      const fallback = holeMapDraft.holes.find((hole) => hole.id !== holeId);
      setActiveHoleId(fallback?.id || '');
    }
  };

  const handleSave = () => {
    if (pattern.type === 'hole_map' && !holeMapValidation.isValid) return;

    const nextServices = { ...selectedServices };
    const nextPattern = pattern.type === 'hole_map'
      ? { type: 'hole_map', holeMap: normalizeHoleMap(holeMapDraft) }
      : { ...pattern };

    setConfig((prev) => ({
      ...prev,
      operations: nextServices,
      pattern: nextPattern,
    }));
    setModalMode(null);
  };

  return {
    view,
    setView,
    pattern,
    setPattern,
    selectedServices,
    holeMapDraft,
    activeHoleId,
    setActiveHoleId,
    isUploadingPattern,
    fileInputRef,
    widthCm,
    heightCm,
    holeMapValidation,
    activeHole,
    previewHoles,
    canSave,
    toggleService,
    openHoleMapDesigner,
    addHoleAtCenter,
    handlePreviewClick,
    updateActiveHoleField,
    deleteHole,
    handleFileUpload,
    handleSave,
  };
};

// Re-export helper utilities so consumers can import everything from this hook file.
export {
  formatCm,
  formatCmFa,
  edgeYLabel,
  edgeZLabel,
  HOLE_STEP_CM,
  MAX_HOLE_COUNT,
} from './useSettingsModalHoleMapUtils';
