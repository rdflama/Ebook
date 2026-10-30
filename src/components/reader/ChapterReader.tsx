/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { ParsedChapter, ReadingSettings } from '../../types/reader';
import { getReaderStyle } from '../../utils/themeStyles';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChapterReaderProps {
  chapters: ParsedChapter[];
  currentChapterIndex: number;
  onChapterChange: (index: number) => void;
  settings: ReadingSettings;
  onTapCenter?: () => void;
  onTextExtracted?: (snippet: string) => void;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  chapters,
  currentChapterIndex,
  onChapterChange,
  settings,
  onTapCenter,
  onTextExtracted,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentChapter = chapters[currentChapterIndex] || chapters[0];
  const { containerStyle, paddingClass } = getReaderStyle(settings);

  // Extract snippet for bookmark when chapter changes
  useEffect(() => {
    if (currentChapter && onTextExtracted) {
      const cleanSnippet = currentChapter.plainText.substring(0, 180);
      onTextExtracted(cleanSnippet);
    }
    // Scroll container to top on chapter change
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentChapter, onTextExtracted]);

  const handlePrev = () => {
    if (currentChapterIndex > 0) {
      onChapterChange(currentChapterIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      onChapterChange(currentChapterIndex + 1);
    }
  };

  if (!currentChapter) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-xs opacity-60">
        No chapter content available.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-y-auto overflow-x-hidden select-text transition-colors duration-200"
      style={containerStyle}
      onClick={(e) => {
        // Tap center to toggle navigation, or tap left/right thirds to turn chapter
        const target = e.target as HTMLElement;
        // If clicking a link or interactive element, ignore
        if (target.tagName === 'A' || target.closest('a') || target.tagName === 'BUTTON') return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.2) {
          handlePrev();
        } else if (clickX > width * 0.8) {
          handleNext();
        } else {
          onTapCenter?.();
        }
      }}
    >
      <div className={`max-w-2xl mx-auto ${paddingClass} min-h-full flex flex-col justify-between`}>
        {/* Chapter Content */}
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Chapter Heading */}
          {currentChapter.title && (
            <div className="mb-6 pb-2 border-b border-black/10 dark:border-white/10">
              <span className="text-[11px] font-sans uppercase tracking-widest opacity-50 block mb-1">
                Section {(currentChapterIndex + 1).toString().padStart(2, '0')} of {chapters.length}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight m-0">
                {currentChapter.title}
              </h2>
            </div>
          )}

          {/* Body Html */}
          <div
            className="reader-content leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: currentChapter.contentHtml }}
          />
        </div>

        {/* Chapter Navigation Footer */}
        <div className="mt-12 pt-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs opacity-75 select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={currentChapterIndex === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
              currentChapterIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-[11px] font-sans opacity-60">
            {currentChapterIndex + 1} / {chapters.length}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={currentChapterIndex >= chapters.length - 1}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
              currentChapterIndex >= chapters.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
