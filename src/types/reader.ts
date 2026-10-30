/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BookFormat = 'pdf' | 'epub' | 'mobi';

export type ThemeId = 'light' | 'sepia' | 'dark' | 'black' | 'nord' | 'sage';

export type FontId = 'system' | 'serif' | 'merriweather' | 'charter' | 'mono' | 'dyslexic';

export type ReadingMode = 'paginated' | 'scroll';

export interface Bookmark {
  id: string;
  bookId: string;
  pageOrChapter: number;
  progressPercent: number;
  label: string;
  snippet?: string;
  note?: string;
  createdAt: number;
  color?: string;
}

export interface Book {
  id: string;
  userId?: string;
  title: string;
  author: string;
  format: BookFormat;
  size: number; // bytes
  coverUrl?: string;
  addedAt: number;
  lastReadAt: number;
  progress: number; // 0 to 100
  currentPosition: number; // Page number for PDF, chapter index or scroll position for EPUB/MOBI
  totalUnits: number; // Total pages for PDF, total chapters for EPUB/MOBI
  bookmarks: Bookmark[];
  tags?: string[];
  isFavorite?: boolean;
  isCompleted?: boolean;
  completedAt?: number;
  googleDriveFileId?: string;
  isSynced?: boolean;
  syncedAt?: number;
  offlineAvailable: boolean;
  description?: string;
}

export interface ReadingSettings {
  theme: ThemeId;
  fontFamily: FontId;
  fontSize: number; // 12 to 32px
  lineHeight: number; // 1.2 to 2.2
  textAlign: 'left' | 'justify';
  marginWidth: 'compact' | 'normal' | 'wide';
  brightness: number; // 30 to 100
  readingMode: ReadingMode;
  simulatedPhoneFrame: boolean;
  twoPageSpread: boolean;
  autoBookmarkOnExit: boolean;
}

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  format: BookFormat;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  pagesRead: number;
}

export interface CompletedBook {
  id: string;
  userId: string;
  bookId: string;
  title: string;
  author: string;
  format: BookFormat;
  coverUrl?: string;
  completedAt: number;
  totalTimeSeconds: number;
  rating?: number;
  reviewNotes?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  dailyGoalMinutes: number;
  yearlyGoalBooks: number;
  favoriteGenre?: string;
  createdAt: number;
  isAnonymous?: boolean;
}

export interface ReadingStatsSummary {
  totalReadingTimeSeconds: number;
  totalPagesRead: number;
  avgReadingSpeedPagesPerHour: number;
  avgReadingSpeedWpm: number;
  currentStreakDays: number;
  bestStreakDays: number;
  todayReadingMinutes: number;
  weekReadingMinutes: number;
  completedBooksCount: number;
  sessionsCount: number;
}

export interface TOCItem {
  id: string;
  title: string;
  targetIndex: number; // page or chapter index
  level?: number;
  subItems?: TOCItem[];
}

export interface ParsedChapter {
  id: string;
  title: string;
  contentHtml: string;
  plainText: string;
  order: number;
}

export interface ParsedBookContent {
  title: string;
  author: string;
  coverBlob?: Blob;
  coverUrl?: string;
  format: BookFormat;
  totalPagesOrChapters: number;
  chapters?: ParsedChapter[];
  toc?: TOCItem[];
  pdfData?: Uint8Array;
}
