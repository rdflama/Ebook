/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, List, Check, Book } from 'lucide-react';
import { TOCItem, ThemeId } from '../../types/reader';
import { THEMES } from '../../utils/themeStyles';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TOCItem[];
  currentIndex: number;
  onSelectChapter: (index: number) => void;
  themeId: ThemeId;
  bookTitle: string;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  onClose,
  toc,
  currentIndex,
  onSelectChapter,
  themeId,
  bookTitle,
}) => {
  if (!isOpen) return null;

  const currentTheme = THEMES[themeId] || THEMES.sepia;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl border transition-all max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{ borderColor: currentTheme.border }}
        >
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-base tracking-tight">Table of Contents</h3>
              <p className="text-[11px] opacity-60 truncate max-w-[220px]">{bookTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chapters list */}
        <div className="flex-1 overflow-y-auto py-2 divide-y" style={{ borderColor: currentTheme.border }}>
          {toc.length === 0 ? (
            <div className="py-8 text-center text-xs opacity-60">
              <Book className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
              <p>No table of contents defined for this book.</p>
            </div>
          ) : (
            toc.map((item, idx) => {
              const isSelected = item.targetIndex === currentIndex || idx === currentIndex;

              return (
                <button
                  key={item.id || idx}
                  onClick={() => {
                    onSelectChapter(item.targetIndex);
                    onClose();
                  }}
                  className={`w-full py-3 px-2 flex items-center justify-between text-left transition-colors text-xs ${
                    isSelected
                      ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-xl'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 rounded-xl'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="text-[10px] opacity-50 font-mono w-5">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>

                  {isSelected && <Check className="w-4 h-4 shrink-0 text-blue-500" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t text-right" style={{ borderColor: currentTheme.border }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
