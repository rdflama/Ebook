/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  BookOpen,
  Zap,
  Trophy,
  CheckCircle2,
  Calendar,
  Star,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  BarChart2,
  Plus,
} from 'lucide-react';
import {
  ReadingStatsSummary,
  ReadingSession,
  CompletedBook,
  UserProfile,
  Book,
} from '../../types/reader';
import {
  calculateReadingStatsSummary,
  getAllReadingSessions,
  getAllCompletedBooks,
  markBookCompleted,
} from '../../services/db';

interface StatsViewProps {
  userProfile: UserProfile | null;
  books: Book[];
  onOpenBook: (book: Book) => void;
  onOpenProfile: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  userProfile,
  books,
  onOpenBook,
  onOpenProfile,
}) => {
  const [stats, setStats] = useState<ReadingStatsSummary | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [completedBooks, setCompletedBooks] = useState<CompletedBook[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'completed'>('overview');
  const [showMarkCompleteModal, setShowMarkCompleteModal] = useState(false);
  const [selectedBookToComplete, setSelectedBookToComplete] = useState<string>('');
  const [completeRating, setCompleteRating] = useState<number>(5);
  const [completeReview, setCompleteReview] = useState<string>('');

  const loadData = async () => {
    const s = await calculateReadingStatsSummary();
    setStats(s);
    const sess = await getAllReadingSessions();
    setSessions(sess);
    const comp = await getAllCompletedBooks();
    setCompletedBooks(comp);
  };

  useEffect(() => {
    loadData();
  }, [books]);

  // Format seconds into human readable "2h 35m" or "45m"
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${Math.max(1, minutes)}m`;
  };

  // Daily goal calculation
  const dailyGoal = userProfile?.dailyGoalMinutes || 30;
  const todayMinutes = stats?.todayReadingMinutes || 0;
  const goalPercent = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100));

  // Handle Mark Book as Completed
  const handleCompleteBook = async () => {
    if (!selectedBookToComplete) return;
    await markBookCompleted(selectedBookToComplete, completeRating, completeReview);
    setShowMarkCompleteModal(false);
    setSelectedBookToComplete('');
    setCompleteReview('');
    await loadData();
  };

  // Weekly bar data
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMins = [15, 25, 40, 30, 20, 35, todayMinutes];

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-zinc-950 text-white select-none pb-24">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-0.5">
              <span>Personal Analytics</span>
              <span>•</span>
              <span>Apple Health Style</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reading Insights</h1>
          </div>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
          >
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-xs">
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'R'}
              </div>
            )}
            <span className="text-xs font-semibold text-zinc-200 truncate max-w-[80px]">
              {userProfile?.displayName?.split(' ')[0] || 'Profile'}
            </span>
          </button>
        </div>

        {/* Apple Fitness Style Daily Goal Ring Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/40 border border-zinc-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5 max-w-[200px]">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Flame className="w-4 h-4 fill-amber-400" />
                <span>{stats?.currentStreakDays || 1} Day Streak</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Today's Reading</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {todayMinutes} of {dailyGoal} mins goal completed. Keep the quiet reading habit alive!
              </p>
            </div>

            {/* Circular Progress Gauge */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-zinc-800"
                  strokeWidth="9"
                  fill="transparent"
                />
                {/* Animated Goal Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-blue-500 transition-all duration-700 ease-out"
                  strokeWidth="9"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - goalPercent / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-white">{goalPercent}%</span>
                <span className="text-[9px] text-zinc-400 uppercase tracking-tighter">Goal</span>
              </div>
            </div>
          </div>

          {/* Mini Weekly Bar Chart */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
              <span>This Week's Activity</span>
              <span className="font-semibold text-blue-400">
                {stats?.weekReadingMinutes || 120} mins total
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 h-14 pt-2">
              {weekDays.map((day, i) => {
                const heightPct = Math.min(100, (dayMins[i] / 45) * 100);
                const isToday = i === 6;

                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-zinc-800/80 rounded-t-sm h-full flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-500 ${
                          isToday ? 'bg-blue-500' : 'bg-blue-600/50 hover:bg-blue-500/80'
                        }`}
                        style={{ height: `${Math.max(12, heightPct)}%` }}
                        title={`${day}: ${dayMins[i]} mins`}
                      />
                    </div>
                    <span
                      className={`text-[9px] font-mono ${
                        isToday ? 'text-blue-400 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Total Reading Time */}
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Time</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-white tracking-tight">
              {formatDuration(stats?.totalReadingTimeSeconds || 0)}
            </p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Across all books</span>
            </p>
          </div>

          {/* 2. Average Speed */}
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Avg Speed</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-white tracking-tight">
              {stats?.avgReadingSpeedPagesPerHour || 38}{' '}
              <span className="text-xs font-normal text-zinc-400">pg/hr</span>
            </p>
            <p className="text-[10px] text-zinc-400">
              ~{stats?.avgReadingSpeedWpm || 210} words/min
            </p>
          </div>

          {/* 3. Pages Turned */}
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Pages Read</span>
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white tracking-tight">
              {stats?.totalPagesRead || 0}
            </p>
            <p className="text-[10px] text-zinc-400">
              In {stats?.sessionsCount || 0} reading sessions
            </p>
          </div>

          {/* 4. Completed Books */}
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Finished</span>
              <Trophy className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-white tracking-tight">
              {completedBooks.length}
            </p>
            <p className="text-[10px] text-purple-300">
              Goal: {userProfile?.yearlyGoalBooks || 15} this year
            </p>
          </div>
        </div>

        {/* Section View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          {[
            { id: 'overview', label: 'Completed Books' },
            { id: 'sessions', label: 'Recent Sessions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SECTION 1: Completed Books Showcase */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-200">
                  Hall of Completed Books ({completedBooks.length})
                </h3>
              </div>

              <button
                onClick={() => setShowMarkCompleteModal(true)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Mark Book Done</span>
              </button>
            </div>

            {completedBooks.length === 0 ? (
              <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-2">
                <Trophy className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-300">No finished books yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  When you read through to 100% or mark a book finished, it will appear here in your achievement archive.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedBooks.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3 shadow-md hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-16 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700 flex items-center justify-center">
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-zinc-800 text-zinc-300">
                            {item.format}
                          </span>
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{item.author}</p>

                        {/* Star Rating */}
                        <div className="flex items-center gap-1 mt-1 text-amber-400">
                          {Array.from({ length: item.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                          <span className="text-[10px] text-zinc-500 ml-1">
                            {new Date(item.completedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {item.reviewNotes && (
                          <p className="text-xs italic text-zinc-300 mt-1 line-clamp-2">
                            "{item.reviewNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Finished
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: Recent Reading Sessions Timeline */}
        {activeTab === 'sessions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Session Log</span>
              <span className="text-[11px] text-zinc-500">{sessions.length} total sessions</span>
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-2">
                <Clock className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-300">No sessions recorded yet</p>
                <p className="text-[11px] text-zinc-500">
                  Open any book in your library and read to automatically log sessions!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((sess) => {
                  const pagesPerHour =
                    sess.durationSeconds > 0
                      ? Math.round((sess.pagesRead / (sess.durationSeconds / 3600)))
                      : 0;

                  return (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 truncate max-w-[170px]">
                            {sess.bookTitle}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            {sess.format}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {new Date(sess.startTime).toLocaleDateString()} at{' '}
                            {new Date(sess.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-blue-400">
                          {formatDuration(sess.durationSeconds)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {sess.pagesRead} pages ({pagesPerHour} pgs/hr)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mark Book Completed Modal */}
      {showMarkCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-5 bg-zinc-900 border border-zinc-800 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold">Mark Book as Completed</h3>
              </div>
              <button
                onClick={() => setShowMarkCompleteModal(false)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Select Book</label>
                <select
                  value={selectedBookToComplete}
                  onChange={(e) => setSelectedBookToComplete(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200"
                >
                  <option value="">-- Choose a book from your library --</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.format.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setCompleteRating(star)}
                      className="p-1 text-amber-400 transition-transform active:scale-125"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= completeRating ? 'fill-amber-400' : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  Takeaway / Review Notes
                </label>
                <textarea
                  rows={3}
                  value={completeReview}
                  onChange={(e) => setCompleteReview(e.target.value)}
                  placeholder="What was the most memorable quote or wisdom from this book?"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowMarkCompleteModal(false)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
              >
                Close
              </button>
              <button
                onClick={handleCompleteBook}
                disabled={!selectedBookToComplete}
                className="px-4 py-1.5 rounded-xl bg-blue-600 disabled:opacity-40 text-xs font-semibold text-white"
              >
                Save to Hall of Fame
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
