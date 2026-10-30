/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  FolderCheck,
  LogOut,
  HardDrive,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Book } from '../../types/reader';
import {
  googleSignIn,
  logoutDrive,
  syncBookFileToDrive,
  syncLibraryManifestToDrive,
  listDriveLibraryFiles,
  downloadBookFileFromDrive,
  getDriveStorageQuota,
} from '../../services/driveService';
import { getBookFileData, saveBook } from '../../services/db';

interface DriveSyncModalProps {
  books: Book[];
  user: User | null;
  onUserChange: (user: User | null) => void;
  onRefreshLibrary: () => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  books,
  user,
  onUserChange,
  onRefreshLibrary,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<{ limit?: string; usage?: string } | null>(null);
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string }>>([]);

  // Destructive confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (user) {
      loadDriveDetails();
    }
  }, [user]);

  const loadDriveDetails = async () => {
    try {
      const quota = await getDriveStorageQuota();
      if (quota) setStorageQuota(quota);

      const files = await listDriveLibraryFiles();
      setDriveFiles(files);
    } catch (e) {
      console.warn('Could not load drive details', e);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onUserChange(res.user);
        setSyncStatus('Connected to Google Drive successfully.');
      }
    } catch (err: any) {
      console.error('Sign In Error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutDrive();
      onUserChange(null);
      setSyncStatus(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign out');
    }
  };

  // Sync All Books to Google Drive
  const handleSyncAll = async () => {
    if (!user) return;

    setIsSyncing(true);
    setErrorMessage(null);
    setSyncStatus('Starting Google Drive synchronization...');

    try {
      let syncedCount = 0;

      for (const book of books) {
        setSyncStatus(`Syncing "${book.title}"...`);
        const fileData = await getBookFileData(book.id);
        if (fileData) {
          try {
            const uploadRes = await syncBookFileToDrive(book, fileData);
            book.googleDriveFileId = uploadRes.driveFileId;
            book.isSynced = true;
            book.syncedAt = Date.now();
            await saveBook(book);
            syncedCount++;
          } catch (e) {
            console.warn(`Failed to sync book ${book.title}`, e);
          }
        }
      }

      setSyncStatus('Backing up reading positions, bookmarks, and manifest...');
      await syncLibraryManifestToDrive(books);

      setSyncStatus(`Sync complete! ${syncedCount} books and bookmarks secured in Google Drive.`);
      onRefreshLibrary();
      await loadDriveDetails();
    } catch (err: any) {
      console.error('Sync error:', err);
      setErrorMessage(err.message || 'Error syncing with Google Drive');
    } finally {
      setIsSyncing(false);
    }
  };

  // Restore/Download Books from Google Drive
  const handleRestoreFromDrive = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Books from Google Drive?',
      description:
        'This will download all books and bookmarks stored in your Lumina Reader Drive folder to this device for offline reading.',
      onConfirm: async () => {
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        setIsRestoring(true);
        setErrorMessage(null);
        setSyncStatus('Scanning Google Drive for books...');

        try {
          const files = await listDriveLibraryFiles();
          const bookFiles = files.filter(
            (f) =>
              f.name.endsWith('.pdf') ||
              f.name.endsWith('.epub') ||
              f.name.endsWith('.mobi')
          );

          let restoredCount = 0;
          for (const file of bookFiles) {
            const alreadyExists = books.some(
              (b) => b.googleDriveFileId === file.id || b.title === file.name.replace(/\.[^/.]+$/, '')
            );

            if (!alreadyExists) {
              setSyncStatus(`Downloading "${file.name}"...`);
              const arrayBuffer = await downloadBookFileFromDrive(file.id);

              const ext = file.name.split('.').pop()?.toLowerCase();
              const format = ext === 'pdf' ? 'pdf' : ext === 'epub' ? 'epub' : 'mobi';

              const newBook: Book = {
                id: `drive-${file.id}`,
                title: file.name.replace(/\.[^/.]+$/, ''),
                author: 'Synced from Drive',
                format,
                size: arrayBuffer.byteLength,
                addedAt: Date.now(),
                lastReadAt: Date.now(),
                progress: 0,
                currentPosition: format === 'pdf' ? 1 : 0,
                totalUnits: 1,
                bookmarks: [],
                googleDriveFileId: file.id,
                isSynced: true,
                syncedAt: Date.now(),
                offlineAvailable: true,
              };

              await saveBook(newBook, arrayBuffer);
              restoredCount++;
            }
          }

          setSyncStatus(`Restore finished: ${restoredCount} new books imported.`);
          onRefreshLibrary();
        } catch (err: any) {
          console.error('Restore error:', err);
          setErrorMessage(err.message || 'Failed to restore books from Drive');
        } finally {
          setIsRestoring(false);
        }
      },
    });
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 bg-zinc-950 text-white select-none">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Google Drive Cloud Sync</h2>
            <p className="text-xs text-zinc-400">
              Backup library, bookmarks, & reading positions
            </p>
          </div>
        </div>

        {/* User Card or Google Sign-In */}
        {!user ? (
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Connect Google Drive</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Sign in to sync your PDF, EPUB, and MOBI books, reading progress, and bookmarks securely across all your devices.
              </p>
            </div>

            {/* Official Google Sign-In Button */}
            <div className="pt-2">
              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
            {/* User Profile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-sm">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-zinc-100">
                      {user.displayName || 'Google Account'}
                    </p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Drive Storage Quota */}
            {storageQuota && (
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span className="text-zinc-400">Google Drive:</span>
                </div>
                <span className="font-mono text-zinc-300">
                  {storageQuota.usage
                    ? `${(Number(storageQuota.usage) / 1024 / 1024 / 1024).toFixed(1)} GB used`
                    : 'Active'}
                </span>
              </div>
            )}

            {/* Sync Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Sync Library</span>
              </button>

              <button
                onClick={handleRestoreFromDrive}
                disabled={isRestoring}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all active:scale-95"
              >
                {isRestoring ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Restore from Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* Sync Status Feedback */}
        {syncStatus && (
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span className="leading-tight">{syncStatus}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Library Sync Status List */}
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>Books in Offline Library</span>
            <span className="text-[11px] text-zinc-500">{books.length} items</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {books.map((b) => (
              <div
                key={b.id}
                className="p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      b.format === 'pdf'
                        ? 'bg-rose-500/20 text-rose-300'
                        : b.format === 'epub'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {b.format}
                  </span>
                  <span className="truncate font-medium text-zinc-200">{b.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {b.isSynced ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                      <FolderCheck className="w-3.5 h-3.5" />
                      Synced
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Local Only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">How Lumina Cloud Sync Works:</p>
          <p>
            • All books are stored locally on your iPhone in offline storage.
          </p>
          <p>
            • When connected, a dedicated <code className="text-blue-400">Lumina Reader Library</code> folder in Google Drive preserves your books and reading progress.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog (Mandatory per Workspace Integration rules for destructive actions) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-5 bg-zinc-900 border border-zinc-800 text-white shadow-2xl space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold">{confirmDialog.title}</h3>
            <p className="text-xs text-zinc-400">{confirmDialog.description}</p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((c) => ({ ...c, isOpen: false }))}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
