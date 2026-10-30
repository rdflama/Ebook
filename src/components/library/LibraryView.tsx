/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Bookmark as BookmarkIcon,
  Trash2,
  Cloud,
  CheckCircle,
  MoreVertical,
  Flame,
  LayoutGrid,
  List as ListIcon,
  Filter,
  Sparkles,
} from 'lucide-react';
import { Book, BookFormat, UserProfile } from '../../types/reader';

interface LibraryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenAdminUpload: () => void;
  onDeleteBook: (bookId: string) => void;
  isDriveConnected: boolean;
  userProfile?: UserProfile | null;
  onOpenProfile?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onOpenAdminUpload,
  onDeleteBook,
  isDriveConnected,
  userProfile,
  onOpenProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);

  // Find most recently read book for "Continue Reading" banner
  const mostRecentBook = useMemo(() => {
    if (books.length === 0) return null;
    return [...books].sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
  }, [books]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
        const matchesFormat =
          selectedFormat === 'all' || book.format === selectedFormat;
        const matchesQuery =
          !searchQuery.trim() ||
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (book.tags || []).some((t) =>
            t.toLowerCase().includes(searchQuery.toLowerCase())
          );
        return matchesFormat && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return b.lastReadAt - a.lastReadAt;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'progress') return b.progress - a.progress;
        return 0;
      });
  }, [books, selectedFormat, searchQuery, sortBy]);

  const totalBookmarks = books.reduce((acc, b) => acc + (b.bookmarks?.length || 0), 0);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-zinc-950 text-white select-none pb-20">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
        {/* iOS Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-0.5">
              <span>Apple Books Style</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                Reading Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Library</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAdminUpload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              title="Upload PDF, EPUB, or MOBI book"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Upload</span>
            </button>

            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                title="Account & Profile"
              >
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-xs">
                    {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Continue Reading Hero Banner */}
        {mostRecentBook && (
          <div
            onClick={() => onSelectBook(mostRecentBook)}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700/60 p-4 sm:p-5 shadow-xl cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              {/* Cover */}
              <div className="relative w-16 h-22 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-zinc-800 shadow-md shrink-0 border border-zinc-700">
                {mostRecentBook.coverUrl ? (
                  <img
                    src={mostRecentBook.coverUrl}
                    alt={mostRecentBook.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-blue-900/40 to-zinc-900">
                    <BookOpen className="w-6 h-6 text-blue-400 mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300">
                      {mostRecentBook.format}
                    </span>
                  </div>
                )}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold uppercase backdrop-blur-xs">
                  {mostRecentBook.format}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">
                    Current Reading
                  </span>
                  {mostRecentBook.isSynced && (
                    <Cloud className="w-3 h-3 text-emerald-400" />
                  )}
                </div>

                <h3 className="text-base font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {mostRecentBook.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {mostRecentBook.author}
                </p>

                {/* Progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      {mostRecentBook.format === 'pdf'
                        ? `Page ${mostRecentBook.currentPosition} of ${mostRecentBook.totalUnits}`
                        : `Section ${mostRecentBook.currentPosition + 1} of ${mostRecentBook.totalUnits}`}
                    </span>
                    <span className="font-semibold text-blue-400">
                      {mostRecentBook.progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(4, mostRecentBook.progress)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar & Format Filter Pills */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search books, authors, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Formats' },
                { id: 'pdf', label: 'PDF' },
                { id: 'epub', label: 'EPUB' },
                { id: 'mobi', label: 'MOBI' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedFormat(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedFormat === pill.id
                      ? 'bg-zinc-200 text-zinc-950 font-semibold shadow-xs'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg ${
                  viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg ${
                  viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="List View"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Books Collection Grid or List */}
        {filteredBooks.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">No books found</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              {searchQuery
                ? 'Try a different search term or clear filters.'
                : 'Upload a PDF, EPUB, or MOBI book to begin your reading collection.'}
            </p>
            <button
              onClick={onOpenAdminUpload}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white"
            >
              <Plus className="w-4 h-4" />
              Upload Book
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredBooks.map((book) => {
              const formatColor =
                book.format === 'pdf'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : book.format === 'epub'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

              return (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/80 p-3 hover:border-zinc-700 transition-all cursor-pointer shadow-md hover:shadow-xl active:scale-[0.98]"
                >
                  {/* Book Cover Frame */}
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-zinc-950 mb-2.5 shadow-sm border border-zinc-800">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-zinc-800 to-zinc-950">
                        <BookOpen className="w-8 h-8 text-zinc-500 mb-2 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[10px] font-bold text-zinc-400 line-clamp-2">
                          {book.title}
                        </span>
                      </div>
                    )}

                    {/* Format Badge */}
                    <span
                      className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase backdrop-blur-xs ${formatColor}`}
                    >
                      {book.format}
                    </span>

                    {/* Bookmarks Counter if any */}
                    {(book.bookmarks || []).length > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 text-amber-400 text-[10px] font-semibold backdrop-blur-xs">
                        <BookmarkIcon className="w-2.5 h-2.5 fill-amber-400" />
                        {book.bookmarks.length}
                      </span>
                    )}
                  </div>

                  {/* Title & Author */}
                  <h4 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{book.author}</p>

                  {/* Progress bar */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{book.progress}% done</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${book.title}" from your offline library?`)) {
                          onDeleteBook(book.id);
                        }
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Book"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-14 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-zinc-800 text-zinc-300">
                        {book.format}
                      </span>
                      <h4 className="text-xs font-semibold text-zinc-100 truncate">
                        {book.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{book.author}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                      <span>{book.progress}% read</span>
                      <span>•</span>
                      <span>{(book.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove "${book.title}" from your offline library?`)) {
                        onDeleteBook(book.id);
                      }
                    }}
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                    title="Delete Book"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
