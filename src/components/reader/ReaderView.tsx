/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  List,
  Bookmark as BookmarkIcon,
  Sliders,
  Share2,
  Check,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Book, Bookmark, ReadingSettings, ParsedBookContent, TOCItem } from '../../types/reader';
import {
  getBookFileData,
  updateBookProgress,
  addBookmarkToBook,
  removeBookmarkFromBook,
  recordReadingSession,
} from '../../services/db';
import { parseEpub } from '../../utils/epubParser';
import { parseMobi } from '../../utils/mobiParser';
import { PdfReader } from './PdfReader';
import { ChapterReader } from './ChapterReader';
import { ReadingSettingsModal } from './ReadingSettingsModal';
import { BookmarksModal } from './BookmarksModal';
import { TableOfContentsModal } from './TableOfContentsModal';
import { THEMES } from '../../utils/themeStyles';

interface ReaderViewProps {
  book: Book;
  settings: ReadingSettings;
  onUpdateSettings: (settings: ReadingSettings) => void;
  onBackToLibrary: () => void;
  onBookUpdated: (updatedBook: Book) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  settings,
  onUpdateSettings,
  onBackToLibrary,
  onBookUpdated,
}) => {
  const [parsedContent, setParsedContent] = useState<ParsedBookContent | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [currentPos, setCurrentPos] = useState<number>(book.currentPosition || (book.format === 'pdf' ? 1 : 0));
  const [totalUnits, setTotalUnits] = useState<number>(book.totalUnits || 1);
  const [progressPercent, setProgressPercent] = useState<number>(book.progress || 0);
  const [latestSnippet, setLatestSnippet] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showChrome, setShowChrome] = useState<boolean>(true); // Header and footer controls visibility

  // Modals
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [showTOC, setShowTOC] = useState<boolean>(false);
  const [showBookmarkSuccess, setShowBookmarkSuccess] = useState<boolean>(false);

  const currentTheme = THEMES[settings.theme] || THEMES.sepia;

  // Load and parse book content from IndexedDB
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const loadBook = async () => {
      try {
        const fileData = await getBookFileData(book.id);
        if (!fileData) {
          throw new Error('Book file data not found in local offline storage.');
        }

        if (book.format === 'pdf') {
          const uint8 = fileData instanceof Blob ? new Uint8Array(await fileData.arrayBuffer()) : new Uint8Array(fileData);
          if (!isCancelled) {
            setPdfData(uint8);
            setIsLoading(false);
          }
        } else if (book.format === 'epub') {
          const content = await parseEpub(fileData);
          if (!isCancelled) {
            setParsedContent(content);
            setTotalUnits(content.totalPagesOrChapters);
            setIsLoading(false);
          }
        } else if (book.format === 'mobi') {
          const content = await parseMobi(fileData);
          if (!isCancelled) {
            setParsedContent(content);
            setTotalUnits(content.totalPagesOrChapters);
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error opening book:', err);
          setErrorMsg(err.message || 'Failed to open book.');
          setIsLoading(false);
        }
      }
    };

    loadBook();
    return () => {
      isCancelled = true;
    };
  }, [book.id, book.format]);

  // Track active reading session
  const sessionStartTime = useRef<number>(Date.now());
  const pagesReadCount = useRef<number>(1);

  useEffect(() => {
    sessionStartTime.current = Date.now();
    pagesReadCount.current = 1;

    return () => {
      const durationSeconds = Math.round((Date.now() - sessionStartTime.current) / 1000);
      if (durationSeconds >= 5) {
        recordReadingSession({
          id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: book.userId || 'local_guest',
          bookId: book.id,
          bookTitle: book.title,
          format: book.format,
          startTime: sessionStartTime.current,
          endTime: Date.now(),
          durationSeconds,
          pagesRead: Math.max(1, pagesReadCount.current),
        }).catch((err) => console.warn('Reading session save warning:', err));
      }
    };
  }, [book.id, book.title, book.format, book.userId]);

  // Sync progress back to IndexedDB
  const handlePositionUpdate = useCallback(
    async (newPos: number, total: number) => {
      pagesReadCount.current += 1;
      setCurrentPos(newPos);
      setTotalUnits(total);

      const calculatedPercent =
        book.format === 'pdf'
          ? Math.min(100, Math.round((newPos / Math.max(1, total)) * 100))
          : Math.min(100, Math.round(((newPos + 1) / Math.max(1, total)) * 100));

      setProgressPercent(calculatedPercent);

      try {
        await updateBookProgress(book.id, calculatedPercent, newPos);
        onBookUpdated({
          ...book,
          currentPosition: newPos,
          progress: calculatedPercent,
          totalUnits: total,
          lastReadAt: Date.now(),
        });
      } catch (e) {
        console.warn('Could not save progress', e);
      }
    },
    [book, onBookUpdated]
  );

  // Quick One-Tap Bookmark
  const handleQuickBookmark = async () => {
    const existing = (book.bookmarks || []).find((b) => b.pageOrChapter === currentPos);

    if (existing) {
      // Remove bookmark
      const updated = await removeBookmarkFromBook(book.id, existing.id);
      onBookUpdated(updated);
    } else {
      // Add bookmark
      const newBm: Bookmark = {
        id: `bm-${Date.now()}`,
        bookId: book.id,
        pageOrChapter: currentPos,
        progressPercent,
        label: `${book.format === 'pdf' ? `Page ${currentPos}` : `Section ${currentPos + 1}`}`,
        snippet: latestSnippet,
        createdAt: Date.now(),
        color: '#F59E0B',
      };
      const updated = await addBookmarkToBook(book.id, newBm);
      onBookUpdated(updated);

      setShowBookmarkSuccess(true);
      setTimeout(() => setShowBookmarkSuccess(false), 1500);
    }
  };

  const isCurrentBookmarked = (book.bookmarks || []).some(
    (b) => b.pageOrChapter === currentPos
  );

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden transition-colors duration-200 select-none"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {/* Top iOS Reader Header (Tap center to toggle) */}
      <header
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2.5 backdrop-blur-md transition-all duration-300 shadow-xs border-b ${
          showChrome ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: `${currentTheme.surface}e6`,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1 px-2 py-1.5 -ml-1 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Library</span>
          </button>

          <div className="truncate pl-1">
            <h1 className="text-xs font-semibold truncate max-w-[140px] sm:max-w-xs leading-tight">
              {book.title}
            </h1>
            <p className="text-[10px] opacity-60 truncate max-w-[140px]">
              {book.author} • {book.format.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Table of contents */}
          <button
            onClick={() => setShowTOC(true)}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Quick Bookmark Toggle */}
          <button
            onClick={handleQuickBookmark}
            className={`p-2 rounded-xl transition-all relative ${
              isCurrentBookmarked
                ? 'text-amber-500 fill-amber-500'
                : 'hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            title={isCurrentBookmarked ? 'Remove Bookmark' : 'Bookmark Page'}
          >
            <BookmarkIcon
              className="w-4 h-4"
              fill={isCurrentBookmarked ? 'currentColor' : 'none'}
            />
            {showBookmarkSuccess && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold shadow-md whitespace-nowrap animate-bounce">
                Saved!
              </span>
            )}
          </button>

          {/* Bookmarks List */}
          <button
            onClick={() => setShowBookmarks(true)}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative"
            title="All Bookmarks & Notes"
          >
            <BookmarkIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            {(book.bookmarks || []).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Settings / Typography */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Theme & Typography Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reader Content Body */}
      <main className="flex-1 w-full h-full flex flex-col overflow-hidden relative">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
            <p className="text-xs opacity-75">Loading {book.format.toUpperCase()} book...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              onClick={onBackToLibrary}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
            >
              Return to Library
            </button>
          </div>
        ) : book.format === 'pdf' && pdfData ? (
          <PdfReader
            pdfData={pdfData}
            currentPage={currentPos}
            onPageChange={handlePositionUpdate}
            settings={settings}
            onTapCenter={() => setShowChrome((v) => !v)}
            onTextExtracted={(txt) => setLatestSnippet(txt)}
          />
        ) : parsedContent?.chapters ? (
          <ChapterReader
            chapters={parsedContent.chapters}
            currentChapterIndex={currentPos}
            onChapterChange={(idx) => handlePositionUpdate(idx, parsedContent.totalPagesOrChapters)}
            settings={settings}
            onTapCenter={() => setShowChrome((v) => !v)}
            onTextExtracted={(txt) => setLatestSnippet(txt)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs opacity-60">
            No readable content found.
          </div>
        )}
      </main>

      {/* Bottom iOS Progress Slider & Footer (Tap center to toggle) */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-30 px-4 py-2.5 backdrop-blur-md transition-all duration-300 border-t shadow-xs ${
          showChrome ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: `${currentTheme.surface}e6`,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        <div className="max-w-md mx-auto space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
            <span>
              {book.format === 'pdf' ? `Page ${currentPos}` : `Section ${currentPos + 1}`} of {totalUnits}
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {progressPercent}%
            </span>
          </div>

          {/* Scrub Slider */}
          <input
            type="range"
            min={book.format === 'pdf' ? 1 : 0}
            max={book.format === 'pdf' ? Math.max(1, totalUnits) : Math.max(0, totalUnits - 1)}
            value={currentPos}
            onChange={(e) => {
              const val = Number(e.target.value);
              handlePositionUpdate(val, totalUnits);
            }}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-black/10 dark:bg-white/20 accent-blue-600"
          />
        </div>
      </footer>

      {/* Sub Modals */}
      <ReadingSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      <BookmarksModal
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        book={book}
        currentPosition={currentPos}
        currentProgress={progressPercent}
        currentSnippet={latestSnippet}
        onSelectBookmark={(pos) => handlePositionUpdate(pos, totalUnits)}
        onAddBookmark={async (bm) => {
          const updated = await addBookmarkToBook(book.id, bm);
          onBookUpdated(updated);
        }}
        onDeleteBookmark={async (bmId) => {
          const updated = await removeBookmarkFromBook(book.id, bmId);
          onBookUpdated(updated);
        }}
        themeId={settings.theme}
      />

      <TableOfContentsModal
        isOpen={showTOC}
        onClose={() => setShowTOC(false)}
        toc={parsedContent?.toc || []}
        currentIndex={currentPos}
        onSelectChapter={(idx) => handlePositionUpdate(idx, totalUnits)}
        themeId={settings.theme}
        bookTitle={book.title}
      />
    </div>
  );
};
