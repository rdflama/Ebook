/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedBookContent, ParsedChapter, TOCItem } from '../types/reader';

// PalmDOC LZ77 Decompressor
function decompressPalmDoc(data: Uint8Array): Uint8Array {
  const output: number[] = [];
  let i = 0;
  const len = data.length;

  while (i < len) {
    const byte = data[i++];
    if (byte === 0x00) {
      output.push(0x00);
    } else if (byte >= 0x01 && byte <= 0x08) {
      // Copy literal bytes
      for (let j = 0; j < byte && i < len; j++) {
        output.push(data[i++]);
      }
    } else if (byte <= 0x7f) {
      // Literal single byte
      output.push(byte);
    } else if (byte >= 0xc0) {
      // Space + char
      output.push(0x20);
      output.push(byte ^ 0x80);
    } else {
      // 0x80 - 0xBF: 2-byte distance/length pair
      if (i >= len) break;
      const next = data[i++];
      const distance = ((byte & 0x3f) << 3) | (next >> 5);
      const length = (next & 0x07) + 3;

      for (let k = 0; k < length; k++) {
        const srcIndex = output.length - distance;
        if (srcIndex >= 0 && srcIndex < output.length) {
          output.push(output[srcIndex]);
        }
      }
    }
  }

  return new Uint8Array(output);
}

export async function parseMobi(data: Blob | ArrayBuffer): Promise<ParsedBookContent> {
  const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Read Palm Database Header
  // Palm DB name (32 bytes null-terminated ASCII)
  let palmName = '';
  for (let i = 0; i < 32; i++) {
    const charCode = bytes[i];
    if (charCode === 0) break;
    palmName += String.fromCharCode(charCode);
  }

  // Number of records at offset 76 (2 bytes, big-endian)
  const numRecords = view.getUint16(76, false);
  if (numRecords === 0) {
    throw new Error('Invalid MOBI: No records found');
  }

  // Read Record Offsets (8 bytes each: 4 bytes offset, 4 bytes attributes/id)
  const recordOffsets: number[] = [];
  for (let r = 0; r < numRecords; r++) {
    const offset = view.getUint32(78 + r * 8, false);
    recordOffsets.push(offset);
  }

  // 2. Read Record 0 (PalmDOC & MOBI Header)
  const rec0Offset = recordOffsets[0];
  const compression = view.getUint16(rec0Offset, false);
  const textRecordCount = view.getUint16(rec0Offset + 8, false);

  let bookTitle = palmName || 'MOBI Book';
  let bookAuthor = 'Unknown Author';
  let firstImageIndex = -1;

  // Check for MOBI identifier 'MOBI' at rec0Offset + 16
  const mobiMagic =
    String.fromCharCode(bytes[rec0Offset + 16]) +
    String.fromCharCode(bytes[rec0Offset + 17]) +
    String.fromCharCode(bytes[rec0Offset + 18]) +
    String.fromCharCode(bytes[rec0Offset + 19]);

  if (mobiMagic === 'MOBI') {
    // MOBI header length at rec0Offset + 20
    const mobiHeaderLen = view.getUint32(rec0Offset + 20, false);
    // Full name offset & length
    const fullNameOffset = view.getUint32(rec0Offset + 84, false);
    const fullNameLen = view.getUint32(rec0Offset + 88, false);

    if (fullNameOffset > 0 && fullNameLen > 0 && rec0Offset + fullNameOffset + fullNameLen <= arrayBuffer.byteLength) {
      const decoder = new TextDecoder('utf-8');
      const titleBytes = bytes.slice(rec0Offset + fullNameOffset, rec0Offset + fullNameOffset + fullNameLen);
      const decodedTitle = decoder.decode(titleBytes).trim();
      if (decodedTitle) bookTitle = decodedTitle;
    }

    // First image index at rec0Offset + 108
    if (mobiHeaderLen > 108) {
      firstImageIndex = view.getUint32(rec0Offset + 108, false);
    }

    // Check for EXTH header
    const exthFlag = view.getUint32(rec0Offset + 128, false);
    if (exthFlag & 0x40) {
      const exthOffset = rec0Offset + 16 + mobiHeaderLen;
      if (
        exthOffset + 12 <= arrayBuffer.byteLength &&
        String.fromCharCode(bytes[exthOffset]) === 'E' &&
        String.fromCharCode(bytes[exthOffset + 1]) === 'X' &&
        String.fromCharCode(bytes[exthOffset + 2]) === 'T' &&
        String.fromCharCode(bytes[exthOffset + 3]) === 'H'
      ) {
        const exthCount = view.getUint32(exthOffset + 8, false);
        let currExth = exthOffset + 12;

        for (let e = 0; e < exthCount; e++) {
          if (currExth + 8 > arrayBuffer.byteLength) break;
          const recType = view.getUint32(currExth, false);
          const recLen = view.getUint32(currExth + 4, false);
          const valLen = recLen - 8;

          if (valLen > 0 && currExth + recLen <= arrayBuffer.byteLength) {
            const valBytes = bytes.slice(currExth + 8, currExth + recLen);
            const decoder = new TextDecoder('utf-8');

            if (recType === 100) {
              // Author
              bookAuthor = decoder.decode(valBytes).trim();
            } else if (recType === 201) {
              // Cover record offset
              // Sometimes uint32 index
              if (valLen === 4) {
                const coverOffsetNum = new DataView(valBytes.buffer, valBytes.byteOffset).getUint32(0, false);
                if (firstImageIndex >= 0 && firstImageIndex + coverOffsetNum < numRecords) {
                  // Cover will be extracted below
                }
              }
            }
          }
          currExth += recLen;
        }
      }
    }
  }

  // 3. Decompress Text Records
  const decompressedChunks: Uint8Array[] = [];
  const countToRead = Math.min(textRecordCount || (numRecords - 1), numRecords - 1);

  for (let r = 1; r <= countToRead; r++) {
    const start = recordOffsets[r];
    const end = r < numRecords - 1 ? recordOffsets[r + 1] : arrayBuffer.byteLength;
    const chunk = bytes.slice(start, end);

    if (compression === 1) {
      // Uncompressed
      decompressedChunks.push(chunk);
    } else if (compression === 2) {
      // PalmDOC LZ77
      decompressedChunks.push(decompressPalmDoc(chunk));
    } else {
      // Other compression, try raw fallback
      decompressedChunks.push(chunk);
    }
  }

  // Merge text chunks
  const totalTextBytes = decompressedChunks.reduce((acc, cur) => acc + cur.length, 0);
  const fullTextBytes = new Uint8Array(totalTextBytes);
  let pos = 0;
  for (const chunk of decompressedChunks) {
    fullTextBytes.set(chunk, pos);
    pos += chunk.length;
  }

  const decoder = new TextDecoder('utf-8');
  let rawHtml = decoder.decode(fullTextBytes);

  // Fallback to latin1 if utf8 produced invalid chars
  if (rawHtml.includes('\uFFFD') && !rawHtml.includes('<')) {
    const latin1Decoder = new TextDecoder('iso-8859-1');
    rawHtml = latin1Decoder.decode(fullTextBytes);
  }

  // Extract cover image if firstImageIndex is valid
  let coverUrl: string | undefined = undefined;
  let coverBlob: Blob | undefined = undefined;

  if (firstImageIndex > 0 && firstImageIndex < numRecords) {
    const imgStart = recordOffsets[firstImageIndex];
    const imgEnd = firstImageIndex + 1 < numRecords ? recordOffsets[firstImageIndex + 1] : arrayBuffer.byteLength;
    const imgBytes = bytes.slice(imgStart, imgEnd);

    // Check for JPEG (FF D8 FF) or PNG (89 50 4E 47) or GIF (47 49 46)
    if (imgBytes[0] === 0xff && imgBytes[1] === 0xd8) {
      coverBlob = new Blob([imgBytes], { type: 'image/jpeg' });
      coverUrl = URL.createObjectURL(coverBlob);
    } else if (imgBytes[0] === 0x89 && imgBytes[1] === 0x50) {
      coverBlob = new Blob([imgBytes], { type: 'image/png' });
      coverUrl = URL.createObjectURL(coverBlob);
    }
  }

  // 4. Split HTML into Chapters / Sections
  const chapters: ParsedChapter[] = [];
  const toc: TOCItem[] = [];

  // Split on <mbp:pagebreak/>, <pagebreak/>, <hr>, or <h1> / <h2> tags
  const rawSections = rawHtml.split(/<mbp:pagebreak\s*\/?>|<pagebreak\s*\/?>/i);

  const sectionsToUse =
    rawSections.length > 1
      ? rawSections
      : rawHtml.split(/(?=<h[1-2][^>]*>)/i).filter((s) => s.trim().length > 50);

  const domParser = new DOMParser();

  if (sectionsToUse.length > 0) {
    sectionsToUse.forEach((sectionHtml, idx) => {
      if (!sectionHtml.trim()) return;

      const doc = domParser.parseFromString(sectionHtml, 'text/html');
      doc.querySelectorAll('script').forEach((s) => s.remove());

      const heading =
        doc.querySelector('h1, h2, h3, h4, title')?.textContent?.trim() ||
        `Section ${idx + 1}`;

      const plainText = doc.body?.textContent || '';

      chapters.push({
        id: `mobi-sec-${idx}`,
        title: heading.length > 60 ? `${heading.substring(0, 60)}...` : heading,
        contentHtml: doc.body?.innerHTML || sectionHtml,
        plainText: plainText.trim(),
        order: idx,
      });

      toc.push({
        id: `toc-mobi-${idx}`,
        title: heading.length > 60 ? `${heading.substring(0, 60)}...` : heading,
        targetIndex: idx,
      });
    });
  }

  // If no sections separated, create a single chapter
  if (chapters.length === 0) {
    const doc = domParser.parseFromString(rawHtml, 'text/html');
    const plainText = doc.body?.textContent || rawHtml;
    chapters.push({
      id: 'mobi-sec-0',
      title: bookTitle,
      contentHtml: doc.body?.innerHTML || rawHtml,
      plainText: plainText.trim(),
      order: 0,
    });
    toc.push({
      id: 'toc-0',
      title: bookTitle,
      targetIndex: 0,
    });
  }

  return {
    title: bookTitle,
    author: bookAuthor,
    coverBlob,
    coverUrl,
    format: 'mobi',
    totalPagesOrChapters: chapters.length,
    chapters,
    toc,
  };
}
