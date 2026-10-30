/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ReadingSettings } from '../../types/reader';

interface PdfReaderProps {
  pdfData: Uint8Array | ArrayBuffer;
  currentPage: number;
  onPageChange: (page: number, total: number) => void;
  settings: ReadingSettings;
  onTextExtracted?: (snippet: string) => void;
  onTapCenter?: () => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  pdfData,
  currentPage,
  onPageChange,
  settings,
  onTextExtracted,
  onTapCenter,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const loadDoc = async () => {
      try {
        const uint8 = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData);
        const task = pdfjsLib.getDocument({
          data: uint8,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await task.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setIsLoading(false);
          onPageChange(currentPage || 1, doc.numPages);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load PDF:', err);
          setErrorMsg(err.message || 'Error loading PDF document');
          setIsLoading(false);
        }
      }
    };

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [pdfData]);

  // Render Current Page
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const pageNum = Math.min(Math.max(1, currentPage), totalPages);
      const page = await pdfDoc.getPage(pageNum);

      // Extract text snippet for bookmarking
      if (onTextExtracted) {
        page.getTextContent().then((content) => {
          const text = content.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .join(' ')
            .trim();
          onTextExtracted(text.substring(0, 180));
        }).catch(() => {});
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const viewport = page.getViewport({ scale: zoomScale });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      ctx.restore();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF Page Render notice:', err);
      }
    }
  }, [pdfDoc, currentPage, zoomScale, totalPages, onTextExtracted]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1, totalPages);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1, totalPages);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs opacity-70">Rendering PDF document...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
        <p className="text-sm font-semibold text-red-500">Could not display PDF</p>
        <p className="text-xs opacity-70 max-w-xs">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full h-full flex flex-col overflow-hidden select-none">
      {/* Zoom / Scaling Ribbon */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 text-xs">
        <div className="flex items-center gap-1.5 opacity-80">
          <span>Page</span>
          <span className="font-semibold">{currentPage}</span>
          <span>of</span>
          <span className="font-semibold">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomScale((s) => Math.max(0.6, s - 0.2))}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] w-9 text-center font-mono">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale((s) => Math.min(2.5, s + 0.2))}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomScale(1.2)}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-3 relative cursor-pointer"
        onClick={(e) => {
          // If clicked in center 40% horizontally, toggle header/footer
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const width = rect.width;

          if (clickX < width * 0.25) {
            handlePrevPage();
          } else if (clickX > width * 0.75) {
            handleNextPage();
          } else {
            onTapCenter?.();
          }
        }}
      >
        <div className="shadow-lg rounded-sm overflow-hidden bg-white max-w-full">
          <canvas ref={canvasRef} className="block max-w-full" />
        </div>

        {/* Floating Left/Right Nav Arrows for Desktop/Tablet */}
        {currentPage > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevPage();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-opacity shadow-md"
            title="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {currentPage < totalPages && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextPage();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-opacity shadow-md"
            title="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
