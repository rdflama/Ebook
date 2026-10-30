/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Sun,
  Moon,
  AlignLeft,
  AlignJustify,
  Sliders,
  Type,
  LayoutTemplate,
  ScrollText,
  BookOpen,
} from 'lucide-react';
import { ReadingSettings, ThemeId, FontId, ReadingMode } from '../../types/reader';
import { THEMES, FONTS } from '../../utils/themeStyles';

interface ReadingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReadingSettings;
  onUpdateSettings: (newSettings: ReadingSettings) => void;
}

export const ReadingSettingsModal: React.FC<ReadingSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const currentTheme = THEMES[settings.theme] || THEMES.sepia;

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K]
  ) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl border transition-all max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: currentTheme.border }}>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-base tracking-tight">Theme & Typography</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-4">
          {/* 1. Theme Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2.5 opacity-70">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(Object.keys(THEMES) as ThemeId[]).map((themeKey) => {
                const t = THEMES[themeKey];
                const isSelected = settings.theme === themeKey;

                return (
                  <button
                    key={themeKey}
                    onClick={() => updateSetting('theme', themeKey)}
                    className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all shadow-xs ${
                      isSelected
                        ? 'ring-2 ring-blue-500 scale-[1.02] font-semibold'
                        : 'hover:border-zinc-400 opacity-90'
                    }`}
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: isSelected ? '#3b82f6' : t.border,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full border shadow-inner flex items-center justify-center text-xs"
                      style={{ backgroundColor: t.surface, borderColor: t.border }}
                    >
                      Aa
                    </div>
                    <span className="text-xs">{t.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Brightness Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2 opacity-70">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                Reading Brightness
              </span>
              <span>{settings.brightness}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 opacity-50" />
              <input
                type="range"
                min="30"
                max="100"
                value={settings.brightness}
                onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-300 dark:bg-zinc-700 accent-blue-600"
              />
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          {/* 3. Font Family Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2.5 opacity-70 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Typeface
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FONTS) as FontId[]).map((fontKey) => {
                const f = FONTS[fontKey];
                const isSelected = settings.fontFamily === fontKey;

                return (
                  <button
                    key={fontKey}
                    onClick={() => updateSetting('fontFamily', fontKey)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    <div
                      className="text-sm truncate"
                      style={{ fontFamily: f.fontFamily }}
                    >
                      {f.name}
                    </div>
                    <div className="text-[10px] opacity-60">{f.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Font Size Adjuster */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2 opacity-70">
              <span>Font Size</span>
              <span>{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateSetting('fontSize', Math.max(12, settings.fontSize - 1))
                }
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-sm"
              >
                A-
              </button>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-300 dark:bg-zinc-700 accent-blue-600"
              />
              <button
                onClick={() =>
                  updateSetting('fontSize', Math.min(32, settings.fontSize + 1))
                }
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-base"
              >
                A+
              </button>
            </div>
          </div>

          {/* 5. Line Height & Text Alignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2 opacity-70">
                Line Spacing
              </label>
              <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                {[
                  { val: 1.4, label: 'Tight' },
                  { val: 1.65, label: 'Normal' },
                  { val: 2.0, label: 'Wide' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => updateSetting('lineHeight', item.val)}
                    className={`flex-1 py-1.5 text-xs text-center transition-colors ${
                      settings.lineHeight === item.val
                        ? 'bg-blue-600 text-white font-medium'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2 opacity-70">
                Alignment
              </label>
              <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                <button
                  onClick={() => updateSetting('textAlign', 'left')}
                  className={`flex-1 py-1.5 flex items-center justify-center transition-colors ${
                    settings.textAlign === 'left'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateSetting('textAlign', 'justify')}
                  className={`flex-1 py-1.5 flex items-center justify-center transition-colors ${
                    settings.textAlign === 'justify'
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title="Justify"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 6. Reading Mode (Paginated vs Scroll) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2 opacity-70">
              Reading Flow
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSetting('readingMode', 'paginated')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingMode === 'paginated'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Page Flip (iOS Books)
              </button>

              <button
                onClick={() => updateSetting('readingMode', 'scroll')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingMode === 'scroll'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400'
                }`}
              >
                <ScrollText className="w-4 h-4" />
                Continuous Scroll
              </button>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm transition-colors shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
