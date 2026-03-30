import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export const PdfPagePreview = ({ src, className = '' }) => {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState(src ? 'loading' : 'idle');

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;
    let pdfDocument = null;
    let renderTask = null;

    const renderPreview = async () => {
      if (!src || !canvasRef.current) {
        setStatus('idle');
        return;
      }

      setStatus('loading');

      try {
        const response = await fetch(src, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF preview (${response.status}).`);
        }

        const pdfBytes = new Uint8Array(await response.arrayBuffer());
        loadingTask = getDocument({ data: pdfBytes });
        pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Canvas rendering is unavailable.');
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (error) {
        console.error('PDF preview rendering failed.', error);
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
      if (renderTask?.cancel) renderTask.cancel();
      if (loadingTask?.destroy) loadingTask.destroy();
      if (pdfDocument?.destroy) pdfDocument.destroy();
    };
  }, [src]);

  if (status === 'error') {
    return (
      <div className={`${className} flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[10px] font-bold text-slate-500`.trim()}>
        پیش‌نمایش PDF در مرورگر قابل رندر نبود.
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden rounded-lg border border-slate-200 bg-white`.trim()}>
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <canvas ref={canvasRef} className="pdf-preview-canvas block max-h-full max-w-full" />
      </div>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 text-[10px] font-bold text-slate-500">
          در حال آماده‌سازی پیش‌نمایش PDF...
        </div>
      )}
    </div>
  );
};
