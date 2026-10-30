/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Target,
  Sparkles,
  BookOpen,
  Edit2,
  Save,
} from 'lucide-react';
import { UserProfile } from '../../types/reader';
import {
  signUpWithEmail,
  loginWithEmail,
  loginWithGoogleAuth,
  signOutUser,
  updateUserProfile,
} from '../../services/authService';

interface AuthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile) => void;
  onLoggedOut: () => void;
}

export const AuthProfileModal: React.FC<AuthProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  onLoggedOut,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.displayName || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editDailyGoal, setEditDailyGoal] = useState<number>(userProfile?.dailyGoalMinutes || 30);
  const [editYearlyGoal, setEditYearlyGoal] = useState<number>(userProfile?.yearlyGoalBooks || 15);
  const [editGenre, setEditGenre] = useState(userProfile?.favoriteGenre || 'Philosophy & Classics');

  if (!isOpen) return null;

  const isGuest = !userProfile || userProfile.isAnonymous || userProfile.uid === 'local_guest';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please provide email and password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const profile = await signUpWithEmail(email.trim(), password, displayName.trim());
        onProfileUpdated(profile);
        setSuccessMessage('Account created successfully! Welcome to Lumina.');
        setTimeout(() => onClose(), 1200);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and password.');
        }
        const profile = await loginWithEmail(email.trim(), password);
        onProfileUpdated(profile);
        setSuccessMessage('Logged in successfully!');
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Try signing in.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const profile = await loginWithGoogleAuth();
      onProfileUpdated(profile);
      setSuccessMessage('Signed in with Google!');
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      console.error('Google auth error:', err);
      setErrorMessage(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    setIsLoading(true);
    try {
      const updated = await updateUserProfile(userProfile.uid, {
        displayName: editName.trim() || userProfile.displayName,
        bio: editBio.trim(),
        dailyGoalMinutes: editDailyGoal,
        yearlyGoalBooks: editYearlyGoal,
        favoriteGenre: editGenre.trim(),
      });
      onProfileUpdated(updated);
      setIsEditing(false);
      setSuccessMessage('Profile preferences updated.');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    onLoggedOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 bg-zinc-900 border border-zinc-800 text-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {isGuest ? 'Account & Sign In' : 'Your Reader Profile'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isGuest ? 'Sync your library & stats across devices' : userProfile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isGuest ? (
            /* Auth Form (Sign In / Sign Up) */
            <div className="space-y-4">
              {/* Toggle Sign In / Sign Up */}
              <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800">
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'signin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    authMode === 'signup'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1">
                      Your Name / Nickname
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Leo Tolstoy"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-colors"
                >
                  {isLoading
                    ? 'Processing...'
                    : authMode === 'signup'
                    ? 'Create Free Account'
                    : 'Sign In'}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-zinc-900 px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                  or
                </span>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-medium shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
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
                <span>Continue with Google</span>
              </button>
            </div>
          ) : (
            /* Logged-In Profile Dashboard & Settings */
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-3xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-base">
                      {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{userProfile.displayName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[190px]">
                      {userProfile.email}
                    </p>
                    {userProfile.bio && (
                      <p className="text-[10px] text-zinc-500 italic mt-0.5">{userProfile.bio}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  title="Edit Profile"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Edit Profile Form */}
              {isEditing ? (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300">Edit Preferences</div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Bio / Motto</label>
                    <input
                      type="text"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="e.g. Seeking wisdom one page at a time"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Daily Goal (mins)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={editDailyGoal}
                        onChange={(e) => setEditDailyGoal(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Yearly Target (books)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editYearlyGoal}
                        onChange={(e) => setEditYearlyGoal(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 text-xs font-semibold text-white"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Profile Stats Badges */
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      Daily Reading Goal
                    </span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {userProfile.dailyGoalMinutes} mins / day
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      Yearly Goal
                    </span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {userProfile.yearlyGoalBooks} books
                    </p>
                  </div>
                </div>
              )}

              {/* Sign Out Button */}
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-xs font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
