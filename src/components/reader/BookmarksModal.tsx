/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Bookmark as BookmarkIcon,
  Trash2,
  ExternalLink,
  Plus,
  StickyNote,
  Clock,
  Check,
} from 'lucide-react';
import { Bookmark, Book, ThemeId } from '../../types/reader';
import { THEMES } from '../../utils/themeStyles';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  currentPosition: number;
  currentProgress: number;
  currentSnippet?: string;
  onSelectBookmark: (position: number) => void;
  onAddBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  themeId: ThemeId;
}

const COLOR_OPTIONS = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'];

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  book,
  currentPosition,
  currentProgress,
  currentSnippet = '',
  onSelectBookmark,
  onAddBookmark,
  onDeleteBookmark,
  themeId,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  if (!isOpen) return null;

  const currentTheme = THEMES[themeId] || THEMES.sepia;
  const bookmarks = book.bookmarks || [];

  const handleCreateBookmark = () => {
    const newBookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bookId: book.id,
      pageOrChapter: currentPosition,
      progressPercent: currentProgress,
      label: label.trim() || `Bookmark at ${book.format === 'pdf' ? `Page ${currentPosition}` : `Section ${currentPosition + 1}`}`,
      snippet: currentSnippet.substring(0, 150),
      note: note.trim() || undefined,
      createdAt: Date.now(),
      color: selectedColor,
    };

    onAddBookmark(newBookmark);
    setLabel('');
    setNote('');
    setIsAdding(false);
  };

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
            <BookmarkIcon className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            <div>
              <h3 className="font-semibold text-base tracking-tight">Bookmarks & Notes</h3>
              <p className="text-[11px] opacity-60 truncate max-w-[220px]">{book.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List / Form */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* Add Bookmark Quick Banner */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-amber-500/50 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Bookmark at Current Position (
              {book.format === 'pdf' ? `Page ${currentPosition}` : `Section ${currentPosition + 1}`})
            </button>
          ) : (
            <div
              className="p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 space-y-3"
              style={{ borderColor: currentTheme.border }}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>New Bookmark</span>
                <span className="opacity-60 text-[10px]">
                  {book.format === 'pdf' ? `Page ${currentPosition}` : `Section ${currentPosition + 1}`} ({currentProgress}%)
                </span>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Bookmark Label / Title"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ borderColor: currentTheme.border }}
                  autoFocus
                />
              </div>

              <div>
                <textarea
                  placeholder="Add a personal note or reflection (optional)..."
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  style={{ borderColor: currentTheme.border }}
                />
              </div>

              {/* Color ribbon picker */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] opacity-60">Ribbon Color:</span>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-transform"
                      style={{ backgroundColor: col }}
                    >
                      {selectedColor === col && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-1.5 rounded-lg border text-xs hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: currentTheme.border }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBookmark}
                  className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-xs"
                >
                  Save Bookmark
                </button>
              </div>
            </div>
          )}

          {/* Bookmarks List */}
          {bookmarks.length === 0 ? (
            <div className="py-8 text-center text-xs opacity-60">
              <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
              <p>No bookmarks in this book yet.</p>
              <p className="text-[10px] mt-1">Tap above or the bookmark icon while reading to save your spot.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="group relative p-3 rounded-2xl border transition-all hover:shadow-xs flex flex-col gap-1.5"
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => {
                        onSelectBookmark(bm.pageOrChapter);
                        onClose();
                      }}
                      className="flex-1 text-left flex items-start gap-2"
                    >
                      <div
                        className="w-2.5 h-6 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: bm.color || '#F59E0B' }}
                      />
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-2">
                          <span>{bm.label}</span>
                          <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[10px] opacity-60 flex items-center gap-1.5 mt-0.5">
                          <span>
                            {book.format === 'pdf' ? `Page ${bm.pageOrChapter}` : `Section ${bm.pageOrChapter + 1}`}
                          </span>
                          <span>•</span>
                          <span>{bm.progressPercent}%</span>
                          <span>•</span>
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(bm.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
                      className="p-1 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Delete Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {bm.snippet && (
                    <p className="text-[11px] italic opacity-75 line-clamp-2 pl-4 border-l-2 border-amber-500/30">
                      "{bm.snippet}"
                    </p>
                  )}

                  {bm.note && (
                    <div className="text-[11px] p-2 rounded-lg bg-black/5 dark:bg-white/5 pl-2 text-blue-600 dark:text-blue-300">
                      <span className="font-semibold mr-1">Note:</span>
                      {bm.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t text-center" style={{ borderColor: currentTheme.border }}>
          <p className="text-[10px] opacity-50">Bookmarks are stored offline and synced with Google Drive</p>
        </div>
      </div>
    </div>
  );
};
