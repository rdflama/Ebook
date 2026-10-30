/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeId, FontId, ReadingSettings } from '../types/reader';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  bg: string;
  text: string;
  secondaryText: string;
  surface: string;
  border: string;
  accent: string;
  cardBg: string;
  previewBg: string;
  previewText: string;
  statusBarContent: 'dark' | 'light';
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Paper',
    bg: '#ffffff',
    text: '#1f2937',
    secondaryText: '#6b7280',
    surface: '#f9fafb',
    border: '#e5e7eb',
    accent: '#2563eb',
    cardBg: '#f3f4f6',
    previewBg: '#ffffff',
    previewText: '#1f2937',
    statusBarContent: 'dark',
  },
  sepia: {
    id: 'sepia',
    name: 'Warm Sepia',
    bg: '#fbf0d9',
    text: '#433422',
    secondaryText: '#7e6852',
    surface: '#f4e5c7',
    border: '#ebd4ad',
    accent: '#b45309',
    cardBg: '#f0dfbe',
    previewBg: '#fbf0d9',
    previewText: '#433422',
    statusBarContent: 'dark',
  },
  sage: {
    id: 'sage',
    name: 'Eye Care Sage',
    bg: '#e8efe9',
    text: '#223326',
    secondaryText: '#526656',
    surface: '#dbe5dc',
    border: '#cbdbcd',
    accent: '#15803d',
    cardBg: '#dbe5dc',
    previewBg: '#e8efe9',
    previewText: '#223326',
    statusBarContent: 'dark',
  },
  dark: {
    id: 'dark',
    name: 'iOS Dark',
    bg: '#1c1c1e',
    text: '#f3f4f6',
    secondaryText: '#9ca3af',
    surface: '#2c2c2e',
    border: '#3a3a3c',
    accent: '#38bdf8',
    cardBg: '#2c2c2e',
    previewBg: '#1c1c1e',
    previewText: '#f3f4f6',
    statusBarContent: 'light',
  },
  black: {
    id: 'black',
    name: 'OLED Black',
    bg: '#000000',
    text: '#e4e4e7',
    secondaryText: '#71717a',
    surface: '#121212',
    border: '#27272a',
    accent: '#a855f7',
    cardBg: '#18181b',
    previewBg: '#000000',
    previewText: '#e4e4e7',
    statusBarContent: 'light',
  },
  nord: {
    id: 'nord',
    name: 'Nordic Slate',
    bg: '#1e242c',
    text: '#e5e9f0',
    secondaryText: '#8892b0',
    surface: '#28313e',
    border: '#374355',
    accent: '#81a1c1',
    cardBg: '#28313e',
    previewBg: '#1e242c',
    previewText: '#e5e9f0',
    statusBarContent: 'light',
  },
};

export const FONTS: Record<
  FontId,
  { id: FontId; name: string; fontFamily: string; category: string }
> = {
  system: {
    id: 'system',
    name: 'San Francisco',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif',
    category: 'System Sans',
  },
  serif: {
    id: 'serif',
    name: 'New York Serif',
    fontFamily:
      '"New York", "Charter", "Georgia", "Cambria", "Times New Roman", serif',
    category: 'Classic Serif',
  },
  merriweather: {
    id: 'merriweather',
    name: 'Merriweather',
    fontFamily: '"Merriweather", "Georgia", serif',
    category: 'Book Serif',
  },
  charter: {
    id: 'charter',
    name: 'Charter',
    fontFamily: '"Charter", "Bitstream Charter", "Palatino", serif',
    category: 'Editorial',
  },
  mono: {
    id: 'mono',
    name: 'SF Mono',
    fontFamily: '"SF Mono", "JetBrains Mono", "Menlo", "Courier New", monospace',
    category: 'Monospace',
  },
  dyslexic: {
    id: 'dyslexic',
    name: 'High Legibility',
    fontFamily: '"OpenDyslexic", "Comic Sans MS", -apple-system, sans-serif',
    category: 'Dyslexia Friendly',
  },
};

export function getReaderStyle(settings: ReadingSettings) {
  const theme = THEMES[settings.theme] || THEMES.sepia;
  const font = FONTS[settings.fontFamily] || FONTS.serif;

  const marginMap = {
    compact: 'px-4 py-4',
    normal: 'px-6 py-6 md:px-8',
    wide: 'px-8 py-8 md:px-12',
  };

  return {
    theme,
    font,
    containerStyle: {
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: font.fontFamily,
      fontSize: `${settings.fontSize}px`,
      lineHeight: settings.lineHeight,
      textAlign: settings.textAlign,
    },
    paddingClass: marginMap[settings.marginWidth],
    brightnessFilter:
      settings.brightness < 100
        ? `brightness(${settings.brightness}%)`
        : undefined,
  };
}
