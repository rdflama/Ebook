/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookMarked, Library, Cloud, Settings, BookOpen, BarChart2 } from 'lucide-react';

export type TabId = 'library' | 'reader' | 'insights' | 'bookmarks' | 'sync' | 'settings';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasActiveBook: boolean;
  totalBookmarksCount: number;
  isDriveConnected: boolean;
  themeSurfaceClass?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  hasActiveBook,
  totalBookmarksCount,
  isDriveConnected,
}) => {
  const tabs = [
    {
      id: 'library' as TabId,
      label: 'Library',
      icon: Library,
    },
    {
      id: 'reader' as TabId,
      label: 'Reading',
      icon: BookOpen,
      disabled: !hasActiveBook,
      badge: hasActiveBook ? '•' : undefined,
    },
    {
      id: 'insights' as TabId,
      label: 'Insights',
      icon: BarChart2,
    },
    {
      id: 'bookmarks' as TabId,
      label: 'Bookmarks',
      icon: BookMarked,
      badge: totalBookmarksCount > 0 ? totalBookmarksCount.toString() : undefined,
    },
    {
      id: 'settings' as TabId,
      label: 'Settings',
      icon: Settings,
      badgeDot: isDriveConnected,
    },
  ];

  return (
    <nav className="relative z-30 w-full bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-1 py-1.5 transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                tab.disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : isActive
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 py-0.2 text-[9px] font-bold rounded-full bg-blue-600 text-white min-w-[14px] text-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
                {tab.badgeDot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
