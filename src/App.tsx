/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Book, Bookmark, ReadingSettings, UserProfile } from './types/reader';
import {
  getAllBooks,
  getSettings,
  saveSettings,
  deleteBook,
  saveBook,
  removeBookmarkFromBook,
  seedDemoStatsIfEmpty,
  DEFAULT_PROFILE,
} from './services/db';
import {
  seedSampleBooksIfEmpty,
  createSampleEpub,
  createSampleMobi,
  createSamplePdf,
} from './utils/sampleBooks';
import { initDriveAuth } from './services/driveService';
import { subscribeToAuth } from './services/authService';
import { IPhoneFrame } from './components/iphone/IPhoneFrame';
import { TabBar, TabId } from './components/navigation/TabBar';
import { LibraryView } from './components/library/LibraryView';
import { ReaderView } from './components/reader/ReaderView';
import { BookmarksView } from './components/bookmarks/BookmarksView';
import { StatsView } from './components/stats/StatsView';
import { DriveSyncModal } from './components/sync/DriveSyncModal';
import { SettingsView } from './components/settings/SettingsView';
import { AdminUploadModal } from './components/admin/AdminUploadModal';
import { AuthProfileModal } from './components/auth/AuthProfileModal';
import { THEMES } from './utils/themeStyles';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [settings, setSettings] = useState<ReadingSettings>({
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
  });

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(DEFAULT_PROFILE);
  const [isAdminUploadOpen, setIsAdminUploadOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDriveSyncOpen, setIsDriveSyncOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load books, settings, and seed demo stats on app startup
  const refreshLibrary = useCallback(async () => {
    try {
      await seedSampleBooksIfEmpty();
      const allBooks = await getAllBooks();
      setBooks(allBooks);

      if (activeBook) {
        const found = allBooks.find((b) => b.id === activeBook.id);
        if (found) setActiveBook(found);
      }
    } catch (e) {
      console.error('Failed to load books:', e);
    }
  }, [activeBook]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const loadedSettings = await getSettings();
        if (mounted) setSettings(loadedSettings);

        await seedSampleBooksIfEmpty();
        await seedDemoStatsIfEmpty();
        const loadedBooks = await getAllBooks();
        if (mounted) {
          setBooks(loadedBooks);
          if (loadedBooks.length > 0) {
            setActiveBook(loadedBooks[0]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (mounted) setIsLoading(false);
      }
    }

    initialize();

    // Listen for Google Auth state
    const unsubscribeDriveAuth = initDriveAuth(
      (currentUser) => {
        if (mounted) setUser(currentUser);
      },
      () => {
        if (mounted) setUser(null);
      }
    );

    // Listen for User Profile state
    const unsubscribeAuth = subscribeToAuth((profile) => {
      if (mounted) setUserProfile(profile);
    });

    return () => {
      mounted = false;
      unsubscribeDriveAuth();
      unsubscribeAuth();
    };
  }, []);

  const handleUpdateSettings = async (newSettings: ReadingSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleSelectBook = (book: Book) => {
    setActiveBook(book);
    setActiveTab('reader');
  };

  const handleDeleteBook = async (bookId: string) => {
    await deleteBook(bookId);
    if (activeBook?.id === bookId) {
      setActiveBook(null);
      setActiveTab('library');
    }
    await refreshLibrary();
  };

  const handleBookUploaded = async (newBook: Book) => {
    await refreshLibrary();
    setActiveBook(newBook);
    setActiveTab('reader');
  };

  const handleResetSampleBooks = async () => {
    setIsLoading(true);
    try {
      const epub = await createSampleEpub();
      const mobi = createSampleMobi();
      const pdf = createSamplePdf();

      await saveBook(epub.book, epub.fileBlob);
      await saveBook(mobi.book, mobi.fileBlob);
      await saveBook(pdf.book, pdf.fileBlob);

      await refreshLibrary();
    } finally {
      setIsLoading(false);
    }
  };

  const totalBookmarksCount = books.reduce(
    (acc, b) => acc + (b.bookmarks?.length || 0),
    0
  );

  const currentTheme = THEMES[settings.theme] || THEMES.sepia;
  const isDarkTheme =
    activeTab === 'reader' ? currentTheme.statusBarContent === 'light' : true;

  return (
    <IPhoneFrame
      isSimulated={settings.simulatedPhoneFrame}
      onToggleSimulated={(val) =>
        handleUpdateSettings({ ...settings, simulatedPhoneFrame: val })
      }
      statusBarColor={isDarkTheme ? 'light' : 'dark'}
      onAdminUploadClick={() => setIsAdminUploadOpen(true)}
      onDriveSyncClick={() => setActiveTab('sync')}
    >
      <div className="w-full h-full flex flex-col overflow-hidden relative">
        {/* Main Tab Content */}
        <div className="flex-1 w-full h-full overflow-hidden relative">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-zinc-950 text-white space-y-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Opening Lumina Library...</p>
            </div>
          ) : activeTab === 'library' ? (
            <LibraryView
              books={books}
              onSelectBook={handleSelectBook}
              onOpenAdminUpload={() => setIsAdminUploadOpen(true)}
              onDeleteBook={handleDeleteBook}
              isDriveConnected={!!user}
              userProfile={userProfile}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          ) : activeTab === 'reader' && activeBook ? (
            <ReaderView
              book={activeBook}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onBackToLibrary={() => setActiveTab('library')}
              onBookUpdated={(updated) => {
                setActiveBook(updated);
                setBooks((prev) =>
                  prev.map((b) => (b.id === updated.id ? updated : b))
                );
              }}
            />
          ) : activeTab === 'insights' ? (
            <StatsView
              userProfile={userProfile}
              books={books}
              onOpenBook={handleSelectBook}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          ) : activeTab === 'bookmarks' ? (
            <BookmarksView
              books={books}
              onOpenBookmark={(book, pos) => {
                const bookToOpen = { ...book, currentPosition: pos };
                setActiveBook(bookToOpen);
                setActiveTab('reader');
              }}
              onDeleteBookmark={async (bookId, bmId) => {
                const updated = await removeBookmarkFromBook(bookId, bmId);
                setBooks((prev) =>
                  prev.map((b) => (b.id === updated.id ? updated : b))
                );
                if (activeBook?.id === bookId) {
                  setActiveBook(updated);
                }
              }}
            />
          ) : activeTab === 'sync' ? (
            <DriveSyncModal
              books={books}
              user={user}
              onUserChange={setUser}
              onRefreshLibrary={refreshLibrary}
            />
          ) : activeTab === 'settings' ? (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              booksCount={books.length}
              onResetSampleBooks={handleResetSampleBooks}
              onOpenAdminUpload={() => setIsAdminUploadOpen(true)}
              isDriveConnected={!!user}
              userProfile={userProfile}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onOpenDriveSync={() => setActiveTab('sync')}
            />
          ) : (
            <LibraryView
              books={books}
              onSelectBook={handleSelectBook}
              onOpenAdminUpload={() => setIsAdminUploadOpen(true)}
              onDeleteBook={handleDeleteBook}
              isDriveConnected={!!user}
              userProfile={userProfile}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          )}
        </div>

        {/* Bottom Tab Bar */}
        {activeTab !== 'reader' && (
          <TabBar
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            hasActiveBook={!!activeBook}
            totalBookmarksCount={totalBookmarksCount}
            isDriveConnected={!!user}
          />
        )}

        {/* Modals */}
        <AdminUploadModal
          isOpen={isAdminUploadOpen}
          onClose={() => setIsAdminUploadOpen(false)}
          onBookUploaded={handleBookUploaded}
          isDriveConnected={!!user}
        />

        <AuthProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userProfile={userProfile}
          onProfileUpdated={(updated) => setUserProfile(updated)}
          onLoggedOut={() => setUserProfile(DEFAULT_PROFILE)}
        />
      </div>
    </IPhoneFrame>
  );
}
