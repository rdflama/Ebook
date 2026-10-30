/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Smartphone, Maximize2, Minimize2, Radio } from 'lucide-react';

interface IPhoneFrameProps {
  children: React.ReactNode;
  isSimulated: boolean;
  onToggleSimulated: (val: boolean) => void;
  statusBarColor?: 'dark' | 'light';
  onAdminUploadClick?: () => void;
  onDriveSyncClick?: () => void;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  children,
  isSimulated,
  onToggleSimulated,
  statusBarColor = 'dark',
}) => {
  const [currentTime, setCurrentTime] = useState('9:41');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      // Format 12-hour or 24-hour style
      setCurrentTime(`${hours % 12 || 12}:${minutes}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 10000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusTextClass = statusBarColor === 'light' ? 'text-white' : 'text-zinc-900';

  if (!isSimulated) {
    return (
      <div className="relative min-h-screen w-full bg-zinc-950 flex flex-col font-sans select-none antialiased">
        {/* Top Control Ribbon for Web / Fullscreen */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Lumina Reader
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">iOS Web App</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Radio className="w-3 h-3" />
              {isOnline ? 'Online / Drive Ready' : 'Offline Storage Active'}
            </span>

            <button
              onClick={() => onToggleSimulated(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              title="Switch to iPhone Device Frame"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">iPhone View</span>
            </button>
          </div>
        </header>

        {/* Responsive Content */}
        <div className="flex-1 flex flex-col w-full h-[calc(100vh-41px)] overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-2 sm:p-4 select-none antialiased">
      {/* Top Bar Switcher */}
      <div className="w-full max-w-sm sm:max-w-md flex items-center justify-between pb-3 px-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-blue-400" />
            iPhone 16 Pro View
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {isOnline ? 'Cloud Synced' : 'Offline'}
          </span>
        </div>

        <button
          onClick={() => onToggleSimulated(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-all shadow-sm"
          title="Expand to Full Screen View"
        >
          <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
          <span className="text-[11px] font-medium">Full View</span>
        </button>
      </div>

      {/* iPhone Outer Chassis */}
      <div className="relative w-full max-w-[393px] h-[835px] max-h-[92vh] rounded-[52px] bg-[#1a1a1c] p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1),0_0_40px_rgba(37,99,235,0.12)] border-[3px] border-[#2c2c2e]">
        {/* Hardware Side Accents */}
        {/* Left: Action Button & Volume Buttons */}
        <div className="absolute -left-[5px] top-[115px] w-[3px] h-[26px] bg-[#3a3a3c] rounded-l-sm" />
        <div className="absolute -left-[5px] top-[160px] w-[3px] h-[48px] bg-[#3a3a3c] rounded-l-sm" />
        <div className="absolute -left-[5px] top-[220px] w-[3px] h-[48px] bg-[#3a3a3c] rounded-l-sm" />
        {/* Right: Power/Siri Button */}
        <div className="absolute -right-[5px] top-[170px] w-[3px] h-[72px] bg-[#3a3a3c] rounded-r-sm" />

        {/* Screen Bezel & Screen Glass */}
        <div className="relative w-full h-full rounded-[44px] overflow-hidden bg-black flex flex-col shadow-inner">
          {/* iOS Status Bar */}
          <div
            className={`relative z-40 w-full h-11 pt-2.5 px-7 flex items-center justify-between text-xs font-semibold ${statusTextClass} transition-colors duration-200`}
          >
            {/* Clock */}
            <span className="tracking-tight text-[13px] font-medium">{currentTime}</span>

            {/* Dynamic Island */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-[28px] w-[114px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md border border-white/5 cursor-pointer group">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              </div>
              <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors font-mono tracking-tighter">
                Lumina
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
              </div>
            </div>

            {/* Icons: Signal, WiFi, Battery */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-end gap-[1.5px] h-2.5 w-3.5">
                <div className="w-[2px] h-[3px] bg-current rounded-xs"></div>
                <div className="w-[2px] h-[5px] bg-current rounded-xs"></div>
                <div className="w-[2px] h-[7px] bg-current rounded-xs"></div>
                <div className="w-[2px] h-[9px] bg-current rounded-xs"></div>
              </div>
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center">
                <div className="relative w-5 h-2.5 border border-current rounded-[3px] p-[1px] flex items-center">
                  <div className="h-full bg-current rounded-xs w-4"></div>
                  <div className="absolute -right-1 top-0.5 w-0.5 h-1 bg-current rounded-r-xs"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Screen App Body */}
          <div className="flex-1 w-full h-[calc(100%-44px-20px)] overflow-hidden flex flex-col relative">
            {children}
          </div>

          {/* iOS Bottom Home Indicator Bar */}
          <div className="h-5 w-full flex items-center justify-center pointer-events-none pb-1 z-40">
            <div
              className={`w-32 h-1 rounded-full ${
                statusBarColor === 'light' ? 'bg-white/40' : 'bg-black/30'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
