/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjsLib from 'pdfjs-dist';
import { ParsedBookContent, TOCItem } from '../types/reader';

// Set worker source for pdfjs-dist
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('PDF.js worker initialization warning:', err);
  }
}

export async function parsePdf(data: Blob | ArrayBuffer): Promise<ParsedBookContent> {
  const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const uint8Data = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Data,
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  let title = 'PDF Document';
  let author = 'Unknown Author';

  try {
    const meta = await pdf.getMetadata();
    const info = (meta?.info as Record<string, any>) || {};
    if (info.Title && typeof info.Title === 'string' && info.Title.trim()) {
      title = info.Title.trim();
    }
    if (info.Author && typeof info.Author === 'string' && info.Author.trim()) {
      author = info.Author.trim();
    }
  } catch (e) {
    console.warn('Could not read PDF metadata', e);
  }

  // Generate thumbnail from Page 1
  let coverUrl: string | undefined = undefined;
  let coverBlob: Blob | undefined = undefined;

  try {
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page1.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      coverUrl = canvas.toDataURL('image/jpeg', 0.8);
      const res = await fetch(coverUrl);
      coverBlob = await res.blob();
    }
  } catch (e) {
    console.warn('Could not generate PDF cover', e);
  }

  // Extract Outline / TOC
  const toc: TOCItem[] = [];
  try {
    const outline = await pdf.getOutline();
    if (outline && outline.length > 0) {
      for (let i = 0; i < outline.length; i++) {
        const item = outline[i];
        let targetIndex = 1;
        if (item.dest) {
          try {
            const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
            if (dest && dest[0]) {
              const pageRef = dest[0];
              const pageIdx = await pdf.getPageIndex(pageRef);
              targetIndex = pageIdx + 1;
            }
          } catch {
            // ignore
          }
        }
        toc.push({
          id: `pdf-toc-${i}`,
          title: item.title || `Section ${i + 1}`,
          targetIndex,
        });
      }
    }
  } catch {
    // ignore
  }

  return {
    title,
    author,
    coverBlob,
    coverUrl,
    format: 'pdf',
    totalPagesOrChapters: totalPages,
    pdfData: uint8Data,
    toc,
  };
}

export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  ctx.restore();
}

export async function extractPageText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();
  } catch {
    return '';
  }
}
