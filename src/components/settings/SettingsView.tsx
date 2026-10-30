/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Sliders,
  Smartphone,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Info,
  Palette,
  Type,
  Cloud,
  User as UserIcon,
  ChevronRight,
  Target,
} from 'lucide-react';
import { ReadingSettings, ThemeId, FontId, UserProfile } from '../../types/reader';
import { THEMES, FONTS } from '../../utils/themeStyles';
import { getStorageInfo } from '../../services/db';

interface SettingsViewProps {
  settings: ReadingSettings;
  onUpdateSettings: (settings: ReadingSettings) => void;
  booksCount: number;
  onResetSampleBooks: () => void;
  onOpenAdminUpload: () => void;
  isDriveConnected: boolean;
  userProfile?: UserProfile | null;
  onOpenProfile?: () => void;
  onOpenDriveSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  booksCount,
  onResetSampleBooks,
  onOpenAdminUpload,
  isDriveConnected,
  userProfile,
  onOpenProfile,
  onOpenDriveSync,
}) => {
  const [storage, setStorage] = useState<{ usedBytes: number; quotaBytes: number }>({
    usedBytes: 0,
    quotaBytes: 0,
  });

  useEffect(() => {
    getStorageInfo().then(setStorage);
  }, [booksCount]);

  const update = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const isGuest = !userProfile || userProfile.isAnonymous || userProfile.uid === 'local_guest';

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-zinc-950 text-white select-none pb-24">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
        <div>
          <div className="text-xs text-blue-400 font-semibold tracking-wider uppercase mb-0.5">
            Preferences & Account
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        </div>

        {/* 1. Account & Profile Card */}
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-sm">
                  {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>{userProfile?.displayName || 'Guest Reader'}</span>
                  {!isGuest && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </h3>
                <p className="text-xs text-zinc-400">
                  {isGuest ? 'Local offline profile' : userProfile?.email}
                </p>
                {userProfile?.dailyGoalMinutes && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Daily Goal: {userProfile.dailyGoalMinutes} mins • Target:{' '}
                    {userProfile.yearlyGoalBooks} books/yr
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              <span>{isGuest ? 'Sign In / Up' : 'Profile'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Google Drive Cloud Sync Quick Launcher */}
        <div
          onClick={onOpenDriveSync}
          className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Google Drive Cloud Sync</h3>
              <p className="text-xs text-zinc-400">
                {isDriveConnected
                  ? 'Drive connected • Tap to backup or restore'
                  : 'Tap to connect your Google account & backup'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isDriveConnected
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isDriveConnected ? 'Connected' : 'Offline'}
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>

        {/* 3. Device Viewport Setting */}
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">iPhone Device Frame</h3>
                <p className="text-xs text-zinc-400">
                  Simulate iPhone 16 Pro chassis with Dynamic Island
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.simulatedPhoneFrame}
              onChange={(e) => update('simulatedPhoneFrame', e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Offline Storage Status */}
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Offline Cloud & Storage</h3>
              <p className="text-xs text-zinc-400">
                IndexedDB local vault with Google Drive backup
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                Books in Library
              </span>
              <p className="text-lg font-bold text-zinc-100 mt-0.5">{booksCount}</p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                Offline Space Used
              </span>
              <p className="text-lg font-bold text-zinc-100 mt-0.5">
                {(storage.usedBytes / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
        </div>

        {/* 5. Default Typography & Colors */}
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Default Reading Theme</h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(THEMES) as ThemeId[]).map((themeKey) => {
              const t = THEMES[themeKey];
              const isSelected = settings.theme === themeKey;

              return (
                <button
                  key={themeKey}
                  onClick={() => update('theme', themeKey)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 scale-[1.02]' : 'opacity-80'
                  }`}
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: isSelected ? '#3b82f6' : t.border,
                  }}
                >
                  <span className="text-xs font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-300">Default Font</span>
            <select
              value={settings.fontFamily}
              onChange={(e) => update('fontFamily', e.target.value as FontId)}
              className="px-3 py-1.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200"
            >
              {(Object.keys(FONTS) as FontId[]).map((fid) => (
                <option key={fid} value={fid}>
                  {FONTS[fid].name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Admin Tools & Reset */}
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Admin Actions</h3>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={onOpenAdminUpload}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold text-left flex items-center justify-between"
            >
              <span>Upload Personal PDF / EPUB / MOBI Books</span>
              <span className="text-[10px] text-blue-400">Admin Upload →</span>
            </button>

            <button
              onClick={() => {
                if (
                  confirm(
                    'Re-seed classic sample books (The Art of War EPUB, Alice in Wonderland MOBI, and Reading Philosophy PDF)?'
                  )
                ) {
                  onResetSampleBooks();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium text-left flex items-center justify-between"
            >
              <span>Restore Sample Books (EPUB, MOBI, PDF)</span>
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* About App */}
        <div className="text-center pt-4 text-zinc-600 text-[11px] space-y-1">
          <p className="font-semibold text-zinc-400">Lumina Reader for iPhone & Web</p>
          <p>Full support for PDF, EPUB, and MOBI e-books</p>
          <p>Offline IndexedDB storage & Google Drive Cloud Sync</p>
        </div>
      </div>
    </div>
  );
};
