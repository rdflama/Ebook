/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { Book } from '../types/reader';
import { saveBook } from '../services/db';

export async function createSampleEpub(): Promise<{ book: Book; fileBlob: Blob }> {
  const zip = new JSZip();

  // mimetype must be uncompressed and first
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // OEBPS/content.opf
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>The Art of War</dc:title>
    <dc:creator>Sun Tzu</dc:creator>
    <dc:language>en</dc:language>
    <dc:description>Ancient Chinese military treatise attributed to Sun Tzu, a high-ranking military general, strategist and tactician.</dc:description>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter4" href="chapter4.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
    <itemref idref="chapter4"/>
  </spine>
</package>`
  );

  // OEBPS/toc.ncx
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <docTitle><text>The Art of War</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>I. Laying Plans</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-2" playOrder="2">
      <navLabel><text>II. Waging War</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-3" playOrder="3">
      <navLabel><text>III. Attack by Stratagem</text></navLabel>
      <content src="chapter3.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-4" playOrder="4">
      <navLabel><text>IV. Tactical Dispositions</text></navLabel>
      <content src="chapter4.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`
  );

  // Chapter 1
  zip.file(
    'OEBPS/chapter1.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter I: Laying Plans</title></head>
<body>
  <h1>Chapter I: Laying Plans</h1>
  <p>Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.</p>
  <p>The moral law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.</p>
  <p>Heaven signifies night and day, cold and heat, times and the seasons. Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death.</p>
  <p>The Commander stands for the virtues of wisdom, sincerely, benevolence, strictness, and courage.</p>
  <p>All warfare is based on deception. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near.</p>
</body>
</html>`
  );

  // Chapter 2
  zip.file(
    'OEBPS/chapter2.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter II: Waging War</title></head>
<body>
  <h1>Chapter II: Waging War</h1>
  <p>Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with food sufficient to carry them a hundred leagues, the expenditure at home and at the front will reach the sum of a thousand ounces of silver per day.</p>
  <p>When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength.</p>
  <p>Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity.</p>
  <p>In war, then, let your great object be victory, not lengthy campaigns.</p>
</body>
</html>`
  );

  // Chapter 3
  zip.file(
    'OEBPS/chapter3.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter III: Attack by Stratagem</title></head>
<body>
  <h1>Chapter III: Attack by Stratagem</h1>
  <p>Sun Tzu said: In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it.</p>
  <p>Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting.</p>
  <p>Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities.</p>
  <p>If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.</p>
</body>
</html>`
  );

  // Chapter 4
  zip.file(
    'OEBPS/chapter4.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter IV: Tactical Dispositions</title></head>
<body>
  <h1>Chapter IV: Tactical Dispositions</h1>
  <p>Sun Tzu said: The good fighters of old first put themselves beyond the possibility of defeat, and then waited for an opportunity of defeating the enemy.</p>
  <p>To secure ourselves against defeat lies in our own hands, but the opportunity of defeating the enemy is provided by the enemy himself.</p>
  <p>Hence the skillful fighter puts himself into a position which makes defeat impossible, and does not miss the moment for defeating the enemy.</p>
</body>
</html>`
  );

  const fileBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });

  const book: Book = {
    id: 'sample-epub-art-of-war',
    title: 'The Art of War',
    author: 'Sun Tzu',
    format: 'epub',
    size: fileBlob.size,
    addedAt: Date.now() - 86400000 * 2,
    lastReadAt: Date.now() - 3600000 * 4,
    progress: 35,
    currentPosition: 1,
    totalUnits: 4,
    bookmarks: [
      {
        id: 'bm-1',
        bookId: 'sample-epub-art-of-war',
        pageOrChapter: 1,
        progressPercent: 25,
        label: 'Supreme Excellence Quote',
        snippet: 'Supreme excellence consists in breaking the enemy\'s resistance without fighting.',
        createdAt: Date.now() - 7200000,
        color: '#EAB308',
      },
    ],
    tags: ['Philosophy', 'Strategy', 'Classics'],
    isFavorite: true,
    offlineAvailable: true,
    description: 'Ancient Chinese military treatise attributed to Sun Tzu.',
  };

  return { book, fileBlob };
}

export function createSampleMobi(): { book: Book; fileBlob: Blob } {
  // Generate a valid Palm Database MOBI file
  const title = "Alice's Adventures in Wonderland";
  const author = 'Lewis Carroll';

  const htmlContent = `<html>
<head><title>Alice's Adventures in Wonderland</title></head>
<body>
<h1>Chapter I: Down the Rabbit-Hole</h1>
<p>Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"</p>
<p>So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.</p>
<p>There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!"</p>
<mbp:pagebreak/>
<h1>Chapter II: The Pool of Tears</h1>
<p>"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I'm opening out like the largest telescope that ever was! Good-bye, feet!"</p>
<p>Just at this moment her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.</p>
<mbp:pagebreak/>
<h1>Chapter III: A Caucus-Race and a Long Tale</h1>
<p>They were indeed a queer-looking party that assembled on the bank—the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.</p>
<p>The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life.</p>
</body>
</html>`;

  const encoder = new TextEncoder();
  const textBytes = encoder.encode(htmlContent);

  // Build a PalmDOC database
  // Header: 78 bytes + record entries
  const numRecords = 2; // Record 0 (header) + Record 1 (text)
  const headerSize = 78 + numRecords * 8;
  const rec0Size = 256; // Standard MOBI Record 0 size
  const rec1Size = textBytes.length;

  const totalSize = headerSize + rec0Size + rec1Size;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Palm Name (32 bytes)
  const nameBytes = encoder.encode('Alice_in_Wonderland');
  for (let i = 0; i < Math.min(31, nameBytes.length); i++) {
    bytes[i] = nameBytes[i];
  }

  // Type: 'BOOK', Creator: 'MOBI'
  bytes[60] = 'B'.charCodeAt(0);
  bytes[61] = 'O'.charCodeAt(0);
  bytes[62] = 'O'.charCodeAt(0);
  bytes[63] = 'K'.charCodeAt(0);
  bytes[64] = 'M'.charCodeAt(0);
  bytes[65] = 'O'.charCodeAt(0);
  bytes[66] = 'B'.charCodeAt(0);
  bytes[67] = 'I'.charCodeAt(0);

  // Num records
  view.setUint16(76, numRecords, false);

  // Record 0 offset
  const rec0Offset = headerSize;
  view.setUint32(78, rec0Offset, false);

  // Record 1 offset
  const rec1Offset = rec0Offset + rec0Size;
  view.setUint32(86, rec1Offset, false);

  // Write Record 0:
  // Compression = 1 (none)
  view.setUint16(rec0Offset, 1, false);
  // Uncompressed text length
  view.setUint32(rec0Offset + 4, rec1Size, false);
  // Text record count = 1
  view.setUint16(rec0Offset + 8, 1, false);
  // Record size = 4096
  view.setUint16(rec0Offset + 10, 4096, false);

  // MOBI Identifier 'MOBI' at offset 16
  bytes[rec0Offset + 16] = 'M'.charCodeAt(0);
  bytes[rec0Offset + 17] = 'O'.charCodeAt(0);
  bytes[rec0Offset + 18] = 'B'.charCodeAt(0);
  bytes[rec0Offset + 19] = 'I'.charCodeAt(0);

  // MOBI Header length = 232
  view.setUint32(rec0Offset + 20, 232, false);

  // Title offset and length
  const titleOffset = 232;
  const titleBytes = encoder.encode(title);
  view.setUint32(rec0Offset + 84, titleOffset, false);
  view.setUint32(rec0Offset + 88, titleBytes.length, false);

  // Write title at rec0Offset + titleOffset
  for (let t = 0; t < titleBytes.length && rec0Offset + titleOffset + t < rec1Offset; t++) {
    bytes[rec0Offset + titleOffset + t] = titleBytes[t];
  }

  // Write Record 1 (text content)
  bytes.set(textBytes, rec1Offset);

  const fileBlob = new Blob([buffer], { type: 'application/x-mobipocket-ebook' });

  const book: Book = {
    id: 'sample-mobi-alice',
    title,
    author,
    format: 'mobi',
    size: fileBlob.size,
    addedAt: Date.now() - 86400000,
    lastReadAt: Date.now() - 3600000 * 24,
    progress: 15,
    currentPosition: 0,
    totalUnits: 3,
    bookmarks: [
      {
        id: 'bm-2',
        bookId: 'sample-mobi-alice',
        pageOrChapter: 0,
        progressPercent: 10,
        label: 'White Rabbit',
        snippet: 'Oh dear! Oh dear! I shall be late!',
        createdAt: Date.now() - 3600000 * 20,
        color: '#3B82F6',
      },
    ],
    tags: ['Fiction', 'Fantasy', 'Classics'],
    isFavorite: false,
    offlineAvailable: true,
    description: 'The story of Alice falling through a rabbit hole into a fantasy world.',
  };

  return { book, fileBlob };
}

export function createSamplePdf(): { book: Book; fileBlob: Blob } {
  // Construct a valid PDF-1.4 file
  const title = 'The Pleasures of Reading';
  const author = 'Arthur Balfour';

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Length 285 >>
stream
BT
/F1 24 Tf
50 720 Td
(The Pleasures of Reading) Tj
/F1 12 Tf
0 -30 Td
(By Arthur Balfour - lumina Reader Edition) Tj
0 -40 Td
(Reading is the quiet contemplation of wisdom across the boundaries of time.) Tj
0 -24 Td
(Books are the compasses, telescopes, sextants, and charts which other men) Tj
0 -20 Td
(have prepared to help us navigate the dangerous seas of human life.) Tj
0 -30 Td
(A great book should leave you with many experiences, and slightly exhausted) Tj
0 -20 Td
(at the end. You live several lives while reading.) Tj
ET
endstream
endobj
7 0 obj
<< /Length 260 >>
stream
BT
/F1 20 Tf
50 720 Td
(Page 2: The Art of Quiet Focus) Tj
/F1 12 Tf
0 -35 Td
(In an age of distraction, opening an e-book on your iPhone is an act of intention.) Tj
0 -25 Td
(With customizable typography, gentle paper tones, and bookmarking,) Tj
0 -20 Td
(your digital device becomes a serene sanctuary for literature.) Tj
0 -30 Td
(Take a moment to adjust your font, select your favorite color palette,) Tj
0 -20 Td
(and synchronize your journey to the cloud.) Tj
ET
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000125 00000 n 
0000000252 00000 n 
0000000379 00000 n 
0000000455 00000 n 
0000000793 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
1106
%%EOF`;

  const fileBlob = new Blob([pdfString], { type: 'application/pdf' });

  const book: Book = {
    id: 'sample-pdf-pleasures',
    title,
    author,
    format: 'pdf',
    size: fileBlob.size,
    addedAt: Date.now() - 86400000 * 3,
    lastReadAt: Date.now() - 3600000 * 48,
    progress: 50,
    currentPosition: 1,
    totalUnits: 2,
    bookmarks: [
      {
        id: 'bm-3',
        bookId: 'sample-pdf-pleasures',
        pageOrChapter: 1,
        progressPercent: 50,
        label: 'Navigation of Life',
        snippet: 'Books are the compasses, telescopes, sextants, and charts...',
        createdAt: Date.now() - 3600000 * 40,
        color: '#10B981',
      },
    ],
    tags: ['Essays', 'Literature'],
    isFavorite: true,
    offlineAvailable: true,
    description: 'An essay on the profound tranquility and power of literature.',
  };

  return { book, fileBlob };
}

export async function seedSampleBooksIfEmpty(): Promise<void> {
  try {
    const { getAllBooks } = await import('../services/db');
    const existing = await getAllBooks();
    if (existing.length === 0) {
      const epub = await createSampleEpub();
      const mobi = createSampleMobi();
      const pdf = createSamplePdf();

      await saveBook(epub.book, epub.fileBlob);
      await saveBook(mobi.book, mobi.fileBlob);
      await saveBook(pdf.book, pdf.fileBlob);
    }
  } catch (err) {
    console.error('Failed to seed sample books', err);
  }
}
