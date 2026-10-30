/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Tag,
  UserCheck,
  ShieldCheck,
  FolderSync,
} from 'lucide-react';
import { Book, BookFormat } from '../../types/reader';
import { parseEpub } from '../../utils/epubParser';
import { parseMobi } from '../../utils/mobiParser';
import { parsePdf } from '../../utils/pdfParser';
import { saveBook } from '../../services/db';
import { syncBookFileToDrive } from '../../services/driveService';

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookUploaded: (book: Book) => void;
  isDriveConnected: boolean;
}

export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({
  isOpen,
  onClose,
  onBookUploaded,
  isDriveConnected,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<BookFormat | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('Personal, Uploaded');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [totalPagesOrChapters, setTotalUnits] = useState<number>(1);
  const [syncToDrive, setSyncToDrive] = useState<boolean>(isDriveConnected);

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let format: BookFormat | null = null;

    if (ext === 'pdf') format = 'pdf';
    else if (ext === 'epub') format = 'epub';
    else if (ext === 'mobi' || ext === 'prc' || ext === 'azw') format = 'mobi';

    if (!format) {
      setErrorMessage('Unsupported file format. Please upload a .pdf, .epub, or .mobi file.');
      return;
    }

    setSelectedFile(file);
    setDetectedFormat(format);
    setErrorMessage(null);
    setIsParsing(true);
    setStatusMessage('Analyzing book structure and metadata...');

    try {
      const buffer = await file.arrayBuffer();

      if (format === 'epub') {
        const parsed = await parseEpub(buffer);
        setTitle(parsed.title || file.name.replace(/\.[^/.]+$/, ''));
        setAuthor(parsed.author || 'Self / Personal');
        setTotalUnits(parsed.totalPagesOrChapters);
        if (parsed.coverUrl) setCoverUrl(parsed.coverUrl);
      } else if (format === 'mobi') {
        const parsed = await parseMobi(buffer);
        setTitle(parsed.title || file.name.replace(/\.[^/.]+$/, ''));
        setAuthor(parsed.author || 'Self / Personal');
        setTotalUnits(parsed.totalPagesOrChapters);
        if (parsed.coverUrl) setCoverUrl(parsed.coverUrl);
      } else if (format === 'pdf') {
        const parsed = await parsePdf(buffer);
        setTitle(parsed.title !== 'PDF Document' ? parsed.title : file.name.replace(/\.[^/.]+$/, ''));
        setAuthor(parsed.author !== 'Unknown Author' ? parsed.author : 'Self / Personal');
        setTotalUnits(parsed.totalPagesOrChapters);
        if (parsed.coverUrl) setCoverUrl(parsed.coverUrl);
      }

      setStatusMessage('File verified and ready to save.');
    } catch (err: any) {
      console.warn('Metadata inspection fallback:', err);
      // Fallback: use file name
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      setAuthor('Self / Personal');
      setStatusMessage('Basic file loaded. You can refine title and author below.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !detectedFormat) return;

    setIsSaving(true);
    setStatusMessage('Saving book to offline device storage...');
    setErrorMessage(null);

    try {
      const bookId = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const newBook: Book = {
        id: bookId,
        title: title.trim() || selectedFile.name,
        author: author.trim() || 'Personal',
        format: detectedFormat,
        size: selectedFile.size,
        coverUrl,
        addedAt: Date.now(),
        lastReadAt: Date.now(),
        progress: 0,
        currentPosition: detectedFormat === 'pdf' ? 1 : 0,
        totalUnits: totalPagesOrChapters || 1,
        bookmarks: [],
        tags: tagList,
        isFavorite: false,
        offlineAvailable: true,
      };

      // 1. Save to local IndexedDB
      await saveBook(newBook, selectedFile);

      // 2. Optionally sync to Google Drive
      if (syncToDrive && isDriveConnected) {
        setStatusMessage('Syncing to Google Drive Lumina folder...');
        try {
          const syncRes = await syncBookFileToDrive(newBook, selectedFile);
          newBook.googleDriveFileId = syncRes.driveFileId;
          newBook.isSynced = true;
          newBook.syncedAt = Date.now();
          await saveBook(newBook);
        } catch (syncErr: any) {
          console.warn('Google Drive sync error during upload:', syncErr);
          // Book is still safely saved locally!
        }
      }

      onBookUploaded(newBook);
      onClose();
    } catch (err: any) {
      console.error('Failed to save book:', err);
      setErrorMessage(err.message || 'Failed to save book to storage.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 bg-zinc-900 border border-zinc-800 text-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Admin Book Upload</h2>
              <p className="text-xs text-zinc-400">Add personal PDF, EPUB, or MOBI books</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Dropzone */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-zinc-700 hover:border-blue-500/70 rounded-2xl p-7 text-center cursor-pointer transition-all bg-zinc-950/40 hover:bg-zinc-800/20 group"
            >
              <UploadCloud className="w-10 h-10 mx-auto mb-3 text-zinc-400 group-hover:text-blue-400 transition-colors" />
              <p className="text-sm font-medium text-zinc-200">
                Click to browse or drop your book file here
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supports <span className="text-blue-400 font-semibold">.PDF</span>,{' '}
                <span className="text-emerald-400 font-semibold">.EPUB</span>, and{' '}
                <span className="text-amber-400 font-semibold">.MOBI</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.epub,.mobi,.prc,.azw"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Cover"
                    className="w-12 h-16 object-cover rounded-lg shadow-sm border border-zinc-700"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                    <FileText className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        detectedFormat === 'pdf'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : detectedFormat === 'epub'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {detectedFormat}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-200 mt-1 truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedFile(null);
                  setDetectedFormat(null);
                  setCoverUrl(undefined);
                }}
                className="text-xs text-zinc-400 hover:text-red-400 p-2"
              >
                Change
              </button>
            </div>
          )}

          {/* Metadata Fields */}
          {selectedFile && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master and Margarita"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Author / Creator
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Mikhail Bulgakov"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Tags & Categories
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. Fiction, History, Personal"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Sync to Google Drive Toggle */}
              {isDriveConnected && (
                <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderSync className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-xs font-medium text-blue-200">
                        Auto-sync to Google Drive
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Uploads file copy to your Lumina Drive folder
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncToDrive}
                    onChange={(e) => setSyncToDrive(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Feedback & Progress Status */}
          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile || isParsing || isSaving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-semibold text-white transition-colors shadow-md flex items-center gap-1.5"
          >
            {isSaving ? 'Storing Book...' : 'Add to My Books'}
          </button>
        </div>
      </div>
    </div>
  );
};
