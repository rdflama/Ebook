/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  Search,
  ExternalLink,
  Trash2,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Book, Bookmark } from '../../types/reader';

interface BookmarksViewProps {
  books: Book[];
  onOpenBookmark: (book: Book, position: number) => void;
  onDeleteBookmark: (bookId: string, bookmarkId: string) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  books,
  onOpenBookmark,
  onDeleteBookmark,
}) => {
  const [query, setQuery] = useState('');

  // Collect all bookmarks across all books
  const allBookmarks: Array<{ book: Book; bookmark: Bookmark }> = [];
  for (const b of books) {
    for (const bm of b.bookmarks || []) {
      allBookmarks.push({ book: b, bookmark: bm });
    }
  }

  // Sort descending by date
  allBookmarks.sort((a, b) => b.bookmark.createdAt - a.bookmark.createdAt);

  const filtered = allBookmarks.filter(({ book, bookmark }) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      bookmark.label.toLowerCase().includes(q) ||
      (bookmark.note && bookmark.note.toLowerCase().includes(q)) ||
      (bookmark.snippet && bookmark.snippet.toLowerCase().includes(q)) ||
      book.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-zinc-950 text-white select-none pb-20">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <div>
          <div className="text-xs text-amber-400 font-semibold tracking-wider uppercase mb-0.5">
            Reading Annotations
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">All Bookmarks & Notes</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {allBookmarks.length} saved bookmarks across {books.length} books
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search in bookmarks, quotes, or notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <BookmarkIcon className="w-10 h-10 mx-auto text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">No bookmarks found</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Tap the bookmark ribbon while reading any book to save thoughts, quotes, and your reading place.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ book, bookmark }) => (
              <div
                key={bookmark.id}
                onClick={() => onOpenBookmark(book, bookmark.pageOrChapter)}
                className="group relative p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer shadow-md active:scale-[0.99] flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: bookmark.color || '#F59E0B' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 group-hover:text-blue-400 transition-colors truncate">
                          {bookmark.label}
                        </span>
                        <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-200" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                        <span className="font-semibold text-zinc-300 truncate max-w-[140px]">
                          {book.title}
                        </span>
                        <span>•</span>
                        <span>
                          {book.format === 'pdf'
                            ? `Page ${bookmark.pageOrChapter}`
                            : `Section ${bookmark.pageOrChapter + 1}`}
                        </span>
                        <span>•</span>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(book.id, bookmark.id);
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    title="Delete Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {bookmark.snippet && (
                  <p className="text-xs italic text-zinc-300 pl-5 border-l border-amber-500/40 line-clamp-2">
                    "{bookmark.snippet}"
                  </p>
                )}

                {bookmark.note && (
                  <div className="text-xs p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-blue-300 pl-3">
                    <span className="font-semibold mr-1.5 text-zinc-400">Reflection:</span>
                    {bookmark.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
