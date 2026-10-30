/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleSignIn } from './driveService';
import { UserProfile } from '../types/reader';
import { getUserProfile, saveUserProfile, DEFAULT_PROFILE } from './db';

export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = userCredential.user;

  if (displayName) {
    await updateProfile(fbUser, { displayName });
  }

  const profile: UserProfile = {
    uid: fbUser.uid,
    email: fbUser.email || email,
    displayName: displayName || email.split('@')[0],
    photoURL: fbUser.photoURL || undefined,
    dailyGoalMinutes: 30,
    yearlyGoalBooks: 12,
    createdAt: Date.now(),
    isAnonymous: false,
  };

  await saveUserProfile(profile);
  return profile;
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = userCredential.user;

  let profile = await getUserProfile(fbUser.uid);
  if (!profile) {
    profile = {
      uid: fbUser.uid,
      email: fbUser.email || email,
      displayName: fbUser.displayName || email.split('@')[0],
      photoURL: fbUser.photoURL || undefined,
      dailyGoalMinutes: 30,
      yearlyGoalBooks: 12,
      createdAt: Date.now(),
      isAnonymous: false,
    };
    await saveUserProfile(profile);
  }

  return profile;
}

export async function loginWithGoogleAuth(): Promise<UserProfile> {
  const res = await googleSignIn();
  if (!res?.user) throw new Error('Google Sign-in failed');

  const fbUser = res.user;
  let profile = await getUserProfile(fbUser.uid);

  if (!profile) {
    profile = {
      uid: fbUser.uid,
      email: fbUser.email || 'user@gmail.com',
      displayName: fbUser.displayName || 'Google Reader',
      photoURL: fbUser.photoURL || undefined,
      dailyGoalMinutes: 30,
      yearlyGoalBooks: 15,
      createdAt: Date.now(),
      isAnonymous: false,
    };
  } else {
    // Refresh with latest Google data
    profile.displayName = fbUser.displayName || profile.displayName;
    profile.photoURL = fbUser.photoURL || profile.photoURL;
  }

  await saveUserProfile(profile);
  return profile;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const existing = (await getUserProfile(uid)) || DEFAULT_PROFILE;
  const updated: UserProfile = { ...existing, ...updates, uid };

  // If currentUser matches, update Firebase auth profile as well
  if (auth.currentUser && auth.currentUser.uid === uid) {
    if (updates.displayName || updates.photoURL) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName || auth.currentUser.displayName,
          photoURL: updates.photoURL || auth.currentUser.photoURL,
        });
      } catch (e) {
        console.warn('Firebase profile sync warning:', e);
      }
    }
  }

  await saveUserProfile(updated);
  return updated;
}

export function subscribeToAuth(
  onProfileChanged: (profile: UserProfile | null) => void
) {
  return onAuthStateChanged(auth, async (fbUser: User | null) => {
    if (fbUser) {
      let profile = await getUserProfile(fbUser.uid);
      if (!profile) {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Reader',
          photoURL: fbUser.photoURL || undefined,
          dailyGoalMinutes: 30,
          yearlyGoalBooks: 12,
          createdAt: Date.now(),
          isAnonymous: fbUser.isAnonymous,
        };
        await saveUserProfile(profile);
      }
      onProfileChanged(profile);
    } else {
      // Offline / guest profile
      const localGuest = (await getUserProfile('local_guest')) || DEFAULT_PROFILE;
      onProfileChanged(localGuest);
    }
  });
}
