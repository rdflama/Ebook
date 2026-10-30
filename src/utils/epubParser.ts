/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ParsedBookContent, ParsedChapter, TOCItem } from '../types/reader';

export async function parseEpub(data: Blob | ArrayBuffer): Promise<ParsedBookContent> {
  const zip = await JSZip.loadAsync(data);

  // 1. Find rootfile from META-INF/container.xml
  const containerXmlStr = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXmlStr) {
    throw new Error('Invalid EPUB: META-INF/container.xml missing');
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXmlStr, 'application/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');
  if (!opfPath) {
    throw new Error('Invalid EPUB: OPF rootfile path not found');
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfStr = await zip.file(opfPath)?.async('string');
  if (!opfStr) {
    throw new Error(`Invalid EPUB: Cannot read OPF file at ${opfPath}`);
  }

  const opfDoc = parser.parseFromString(opfStr, 'application/xml');

  // 2. Extract Metadata
  const title =
    opfDoc.querySelector('metadata > title, metadata > dc\\:title')?.textContent?.trim() ||
    'Untitled Book';
  const author =
    opfDoc.querySelector('metadata > creator, metadata > dc\\:creator')?.textContent?.trim() ||
    'Unknown Author';

  // 3. Extract Manifest
  const manifestItems = new Map<string, { href: string; mediaType: string; properties?: string }>();
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    const properties = item.getAttribute('properties') || '';
    if (id && href) {
      manifestItems.set(id, { href, mediaType, properties });
    }
  });

  // 4. Extract Cover Image if available
  let coverUrl: string | undefined = undefined;
  let coverBlob: Blob | undefined = undefined;

  // Check manifest for cover
  for (const [, item] of manifestItems) {
    if (
      item.properties?.includes('cover-image') ||
      item.href.toLowerCase().includes('cover') && item.mediaType.startsWith('image/')
    ) {
      const fullImgPath = resolveZipPath(opfDir, item.href);
      const imgFile = zip.file(fullImgPath);
      if (imgFile) {
        coverBlob = await imgFile.async('blob');
        coverUrl = URL.createObjectURL(coverBlob);
        break;
      }
    }
  }

  // 5. Pre-cache image assets as Object URLs for chapter rendering
  const assetUrlMap = new Map<string, string>();
  for (const [, item] of manifestItems) {
    if (item.mediaType.startsWith('image/')) {
      const fullPath = resolveZipPath(opfDir, item.href);
      const imgFile = zip.file(fullPath);
      if (imgFile) {
        try {
          const blob = await imgFile.async('blob');
          const objUrl = URL.createObjectURL(blob);
          assetUrlMap.set(item.href, objUrl);
          assetUrlMap.set(fullPath, objUrl);
          // Also map basename
          const baseName = item.href.split('/').pop();
          if (baseName) {
            assetUrlMap.set(baseName, objUrl);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 6. Extract Spine
  const spineItemRefs: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((el) => {
    const idref = el.getAttribute('idref');
    if (idref) spineItemRefs.push(idref);
  });

  // 7. Extract TOC if present (NCX or Nav)
  const toc: TOCItem[] = [];
  const ncxItem = Array.from(manifestItems.values()).find(
    (it) => it.mediaType === 'application/x-dtbncx+xml' || it.href.endsWith('.ncx')
  );

  if (ncxItem) {
    const ncxPath = resolveZipPath(opfDir, ncxItem.href);
    const ncxStr = await zip.file(ncxPath)?.async('string');
    if (ncxStr) {
      const ncxDoc = parser.parseFromString(ncxStr, 'application/xml');
      const navPoints = ncxDoc.querySelectorAll('navMap > navPoint');
      navPoints.forEach((np, idx) => {
        const label = np.querySelector('navLabel > text')?.textContent?.trim() || `Chapter ${idx + 1}`;
        const src = np.querySelector('content')?.getAttribute('src') || '';
        toc.push({
          id: `toc-${idx}`,
          title: label,
          targetIndex: idx,
        });
      });
    }
  }

  // 8. Parse Chapters in spine order
  const chapters: ParsedChapter[] = [];

  for (let i = 0; i < spineItemRefs.length; i++) {
    const idref = spineItemRefs[i];
    const manifestItem = manifestItems.get(idref);
    if (!manifestItem) continue;

    const chapterPath = resolveZipPath(opfDir, manifestItem.href);
    const chapterHtmlRaw = await zip.file(chapterPath)?.async('string');
    if (!chapterHtmlRaw) continue;

    // Parse and sanitize chapter HTML
    const chapterDoc = parser.parseFromString(chapterHtmlRaw, 'text/html');

    // Remove script tags
    chapterDoc.querySelectorAll('script').forEach((s) => s.remove());

    // Replace images with blob URLs
    chapterDoc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (src) {
        const resolved =
          assetUrlMap.get(src) ||
          assetUrlMap.get(resolveZipPath(chapterPath.substring(0, chapterPath.lastIndexOf('/') + 1), src)) ||
          assetUrlMap.get(src.split('/').pop() || '');
        if (resolved) {
          img.setAttribute('src', resolved);
        }
      }
      img.setAttribute('loading', 'lazy');
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '1rem auto';
      img.style.borderRadius = '0.5rem';
    });

    // Detect chapter title
    const detectedHeading =
      chapterDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() ||
      `Section ${i + 1}`;

    const bodyContent = chapterDoc.body ? chapterDoc.body.innerHTML : chapterHtmlRaw;
    const plainText = chapterDoc.body ? chapterDoc.body.textContent || '' : '';

    chapters.push({
      id: idref,
      title: detectedHeading,
      contentHtml: bodyContent,
      plainText: plainText.trim(),
      order: i,
    });
  }

  // If no TOC from NCX, build TOC from chapters
  if (toc.length === 0 && chapters.length > 0) {
    chapters.forEach((ch, idx) => {
      toc.push({
        id: ch.id,
        title: ch.title,
        targetIndex: idx,
      });
    });
  }

  return {
    title,
    author,
    coverBlob,
    coverUrl,
    format: 'epub',
    totalPagesOrChapters: Math.max(1, chapters.length),
    chapters,
    toc,
  };
}

function resolveZipPath(baseDir: string, relativePath: string): string {
  if (!baseDir || relativePath.startsWith('/')) {
    return relativePath.replace(/^\//, '');
  }
  const parts = (baseDir + relativePath).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}
