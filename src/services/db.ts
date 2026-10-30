/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Book,
  Bookmark,
  ReadingSettings,
  ReadingSession,
  CompletedBook,
  UserProfile,
  ReadingStatsSummary,
} from '../types/reader';

const DB_NAME = 'LuminaReaderDB_v2';
const DB_VERSION = 2;
const BOOKS_STORE = 'books';
const FILES_STORE = 'book_files';
const SETTINGS_STORE = 'settings';
const SESSIONS_STORE = 'reading_sessions';
const COMPLETED_STORE = 'completed_books';
const PROFILES_STORE = 'user_profiles';

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'sepia',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.65,
  textAlign: 'left',
  marginWidth: 'normal',
  brightness: 100,
  readingMode: 'paginated',
  simulatedPhoneFrame: true,
  twoPageSpread: false,
  autoBookmarkOnExit: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  uid: 'local_guest',
  email: 'reader@lumina.app',
  displayName: 'Lumina Reader',
  bio: 'Avid reader & digital book collector',
  dailyGoalMinutes: 30,
  yearlyGoalBooks: 15,
  favoriteGenre: 'Philosophy & Fiction',
  createdAt: Date.now() - 86400000 * 14,
  isAnonymous: true,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        const bookStore = db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
        bookStore.createIndex('format', 'format', { unique: false });
        bookStore.createIndex('lastReadAt', 'lastReadAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'bookId' });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        sessionStore.createIndex('userId', 'userId', { unique: false });
        sessionStore.createIndex('startTime', 'startTime', { unique: false });
        sessionStore.createIndex('bookId', 'bookId', { unique: false });
      }

      if (!db.objectStoreNames.contains(COMPLETED_STORE)) {
        const completedStore = db.createObjectStore(COMPLETED_STORE, { keyPath: 'id' });
        completedStore.createIndex('userId', 'userId', { unique: false });
        completedStore.createIndex('completedAt', 'completedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(PROFILES_STORE)) {
        db.createObjectStore(PROFILES_STORE, { keyPath: 'uid' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ------------------- BOOKS -------------------

export async function getAllBooks(): Promise<Book[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, 'readonly');
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const books: Book[] = request.result || [];
      books.sort((a, b) => b.lastReadAt - a.lastReadAt);
      resolve(books);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getBook(id: string): Promise<Book | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, 'readonly');
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBook(book: Book, fileData?: Blob | ArrayBuffer): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BOOKS_STORE, FILES_STORE], 'readwrite');
    const bookStore = transaction.objectStore(BOOKS_STORE);
    const fileStore = transaction.objectStore(FILES_STORE);

    bookStore.put(book);

    if (fileData) {
      fileStore.put({
        bookId: book.id,
        data: fileData,
        format: book.format,
        updatedAt: Date.now(),
      });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getBookFileData(bookId: string): Promise<Blob | ArrayBuffer | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.get(bookId);

    request.onsuccess = () => {
      if (request.result && request.result.data) {
        resolve(request.result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateBookProgress(
  bookId: string,
  progress: number,
  currentPosition: number
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKS_STORE);
    const getRequest = store.get(bookId);

    getRequest.onsuccess = () => {
      const book = getRequest.result as Book | undefined;
      if (book) {
        const newProgress = Math.min(100, Math.max(0, Math.round(progress)));
        book.progress = newProgress;
        book.currentPosition = currentPosition;
        book.lastReadAt = Date.now();

        if (newProgress >= 100 && !book.isCompleted) {
          book.isCompleted = true;
          book.completedAt = Date.now();
        }

        store.put(book);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function markBookCompleted(
  bookId: string,
  rating?: number,
  reviewNotes?: string
): Promise<Book | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BOOKS_STORE, COMPLETED_STORE], 'readwrite');
    const bookStore = transaction.objectStore(BOOKS_STORE);
    const completedStore = transaction.objectStore(COMPLETED_STORE);
    const getRequest = bookStore.get(bookId);

    getRequest.onsuccess = () => {
      const book = getRequest.result as Book | undefined;
      if (!book) {
        resolve(null);
        return;
      }

      book.isCompleted = true;
      book.progress = 100;
      book.completedAt = Date.now();
      bookStore.put(book);

      const completedRecord: CompletedBook = {
        id: `comp-${book.id}-${Date.now()}`,
        userId: book.userId || 'local_guest',
        bookId: book.id,
        title: book.title,
        author: book.author,
        format: book.format,
        coverUrl: book.coverUrl,
        completedAt: Date.now(),
        totalTimeSeconds: 3600 * 2, // default 2 hours if estimate
        rating: rating || 5,
        reviewNotes: reviewNotes || 'Inspiring read finished in Lumina.',
      };
      completedStore.put(completedRecord);

      resolve(book);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function addBookmarkToBook(bookId: string, bookmark: Bookmark): Promise<Book> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKS_STORE);
    const getRequest = store.get(bookId);

    getRequest.onsuccess = () => {
      const book = getRequest.result as Book | undefined;
      if (!book) {
        reject(new Error(`Book not found: ${bookId}`));
        return;
      }
      const existing = book.bookmarks || [];
      const updated = [bookmark, ...existing.filter((b) => b.id !== bookmark.id)];
      book.bookmarks = updated;
      store.put(book);
      resolve(book);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function removeBookmarkFromBook(bookId: string, bookmarkId: string): Promise<Book> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BOOKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKS_STORE);
    const getRequest = store.get(bookId);

    getRequest.onsuccess = () => {
      const book = getRequest.result as Book | undefined;
      if (!book) {
        reject(new Error(`Book not found: ${bookId}`));
        return;
      }
      book.bookmarks = (book.bookmarks || []).filter((b) => b.id !== bookmarkId);
      store.put(book);
      resolve(book);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BOOKS_STORE, FILES_STORE], 'readwrite');
    transaction.objectStore(BOOKS_STORE).delete(bookId);
    transaction.objectStore(FILES_STORE).delete(bookId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ------------------- SETTINGS -------------------

export async function getSettings(): Promise<ReadingSettings> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get('user_settings');

    request.onsuccess = () => {
      if (request.result && request.result.value) {
        resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    request.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function saveSettings(settings: ReadingSettings): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    store.put({ key: 'user_settings', value: settings });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ------------------- READING SESSIONS & STATS -------------------

export async function recordReadingSession(session: ReadingSession): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    store.put(session);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllReadingSessions(): Promise<ReadingSession[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSIONS_STORE, 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const sessions: ReadingSession[] = request.result || [];
      sessions.sort((a, b) => b.startTime - a.startTime);
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
  });
}

// ------------------- COMPLETED BOOKS -------------------

export async function recordCompletedBook(completedBook: CompletedBook): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMPLETED_STORE, 'readwrite');
    const store = transaction.objectStore(COMPLETED_STORE);
    store.put(completedBook);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllCompletedBooks(): Promise<CompletedBook[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COMPLETED_STORE, 'readonly');
    const store = transaction.objectStore(COMPLETED_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const records: CompletedBook[] = request.result || [];
      records.sort((a, b) => b.completedAt - a.completedAt);
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

// ------------------- USER PROFILES -------------------

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    const transaction = db.transaction(PROFILES_STORE, 'readonly');
    const store = transaction.objectStore(PROFILES_STORE);
    const request = store.get(uid);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROFILES_STORE, 'readwrite');
    const store = transaction.objectStore(PROFILES_STORE);
    store.put(profile);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ------------------- CALCULATE STATISTICS -------------------

export async function calculateReadingStatsSummary(): Promise<ReadingStatsSummary> {
  const sessions = await getAllReadingSessions();
  const completed = await getAllCompletedBooks();

  let totalReadingTimeSeconds = 0;
  let totalPagesRead = 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 6 * 86400000;

  let todayReadingMinutes = 0;
  let weekReadingMinutes = 0;

  // Active reading days for streak calculation
  const daySet = new Set<string>();

  for (const s of sessions) {
    totalReadingTimeSeconds += s.durationSeconds;
    totalPagesRead += s.pagesRead;

    if (s.startTime >= startOfToday) {
      todayReadingMinutes += Math.round(s.durationSeconds / 60);
    }
    if (s.startTime >= startOfWeek) {
      weekReadingMinutes += Math.round(s.durationSeconds / 60);
    }

    const dayKey = new Date(s.startTime).toISOString().split('T')[0];
    daySet.add(dayKey);
  }

  // Calculate Streak
  let currentStreakDays = 0;
  let checkDate = new Date();
  while (true) {
    const key = checkDate.toISOString().split('T')[0];
    if (daySet.has(key)) {
      currentStreakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today hasn't had a session yet, check yesterday before breaking
      if (currentStreakDays === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yKey = checkDate.toISOString().split('T')[0];
        if (daySet.has(yKey)) {
          currentStreakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  // Average Reading Speed (Pages per Hour and Words per Minute)
  const totalHours = totalReadingTimeSeconds / 3600;
  const avgReadingSpeedPagesPerHour = totalHours > 0 ? Math.round(totalPagesRead / totalHours) : 38;
  const avgReadingSpeedWpm = Math.round(avgReadingSpeedPagesPerHour * 4.2); // ~250 words per page

  return {
    totalReadingTimeSeconds,
    totalPagesRead,
    avgReadingSpeedPagesPerHour: Math.max(12, avgReadingSpeedPagesPerHour),
    avgReadingSpeedWpm: Math.max(120, avgReadingSpeedWpm),
    currentStreakDays: Math.max(1, currentStreakDays),
    bestStreakDays: Math.max(7, currentStreakDays),
    todayReadingMinutes,
    weekReadingMinutes,
    completedBooksCount: completed.length,
    sessionsCount: sessions.length,
  };
}

export async function seedDemoStatsIfEmpty(): Promise<void> {
  const sessions = await getAllReadingSessions();
  if (sessions.length === 0) {
    const demoSessions: ReadingSession[] = [
      {
        id: 'sess-demo-1',
        userId: 'local_guest',
        bookId: 'sample-epub-art-of-war',
        bookTitle: 'The Art of War',
        format: 'epub',
        startTime: Date.now() - 3600000 * 2,
        endTime: Date.now() - 3600000 * 1.5,
        durationSeconds: 1800,
        pagesRead: 14,
      },
      {
        id: 'sess-demo-2',
        userId: 'local_guest',
        bookId: 'sample-pdf-pleasures',
        bookTitle: 'The Pleasures of Reading',
        format: 'pdf',
        startTime: Date.now() - 86400000 - 3600000 * 3,
        endTime: Date.now() - 86400000 - 3600000 * 2.2,
        durationSeconds: 2880,
        pagesRead: 22,
      },
      {
        id: 'sess-demo-3',
        userId: 'local_guest',
        bookId: 'sample-mobi-alice',
        bookTitle: "Alice's Adventures in Wonderland",
        format: 'mobi',
        startTime: Date.now() - 86400000 * 2 - 3600000 * 4,
        endTime: Date.now() - 86400000 * 2 - 3600000 * 3.3,
        durationSeconds: 2520,
        pagesRead: 18,
      },
      {
        id: 'sess-demo-4',
        userId: 'local_guest',
        bookId: 'sample-epub-art-of-war',
        bookTitle: 'The Art of War',
        format: 'epub',
        startTime: Date.now() - 86400000 * 3 - 3600000 * 1,
        endTime: Date.now() - 86400000 * 3 - 3600000 * 0.4,
        durationSeconds: 2160,
        pagesRead: 16,
      },
    ];

    for (const s of demoSessions) {
      await recordReadingSession(s);
    }

    const demoCompleted: CompletedBook = {
      id: 'comp-demo-1',
      userId: 'local_guest',
      bookId: 'sample-pdf-pleasures',
      title: 'The Pleasures of Reading',
      author: 'Arthur Balfour',
      format: 'pdf',
      completedAt: Date.now() - 86400000 * 4,
      totalTimeSeconds: 4200,
      rating: 5,
      reviewNotes: 'A sublime reflection on tranquil reading and intellectual stillness.',
    };
    await recordCompletedBook(demoCompleted);
  }
}

export async function getStorageInfo(): Promise<{ usedBytes: number; quotaBytes: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usedBytes: est.usage || 0,
        quotaBytes: est.quota || 0,
      };
    } catch {
      // fallback
    }
  }
  return { usedBytes: 0, quotaBytes: 0 };
}
