/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Book } from '../types/reader';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Lumina Reader Library';

// Initialize Firebase App safely without re-initializing
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope(DRIVE_SCOPE);

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token will be acquired when user signs in or via popup
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token from Google sign in');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Helper: Ensure or find App Folder in user's Drive
async function getOrCreateAppFolder(token: string): Promise<string> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to query Google Drive folder: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create Lumina Reader folder in Google Drive');
  }

  const created = await createRes.json();
  return created.id;
}

// Upload/Sync a book file to Google Drive
export async function syncBookFileToDrive(
  book: Book,
  fileData: Blob | ArrayBuffer
): Promise<{ driveFileId: string; webViewLink?: string }> {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive');

  const folderId = await getOrCreateAppFolder(token);

  const fileBlob = fileData instanceof Blob ? fileData : new Blob([fileData]);
  const extension = book.format === 'pdf' ? 'pdf' : book.format === 'epub' ? 'epub' : 'mobi';
  const fileName = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${extension}`;

  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
    mobi: 'application/x-mobipocket-ebook',
  };
  const mimeType = mimeMap[book.format] || 'application/octet-stream';

  // Check if file already exists in Drive folder with matching name
  const q = `'${folderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
  const existingSearch = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let existingId: string | null = null;
  if (existingSearch.ok) {
    const list = await existingSearch.json();
    if (list.files && list.files.length > 0) {
      existingId = list.files[0].id;
    }
  }

  const metadata = {
    name: fileName,
    parents: existingId ? undefined : [folderId],
    description: `Lumina Reader book: ${book.title} by ${book.author}`,
    properties: {
      luminaBookId: book.id,
      format: book.format,
      title: book.title,
      author: book.author,
      progress: book.progress.toString(),
      currentPosition: book.currentPosition.toString(),
    },
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  form.append('file', fileBlob);

  const uploadEndpoint = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart&fields=id,name,webViewLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`;

  const uploadRes = await fetch(uploadEndpoint, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed: ${errText}`);
  }

  const result = await uploadRes.json();
  return { driveFileId: result.id, webViewLink: result.webViewLink };
}

// Backup all metadata & bookmarks manifest to Drive
export async function syncLibraryManifestToDrive(
  books: Book[]
): Promise<string> {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive');

  const folderId = await getOrCreateAppFolder(token);
  const manifestName = 'lumina_library_manifest.json';

  const manifestData = {
    updatedAt: Date.now(),
    app: 'Lumina Reader iOS',
    version: '1.0',
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      format: b.format,
      size: b.size,
      progress: b.progress,
      currentPosition: b.currentPosition,
      totalUnits: b.totalUnits,
      bookmarks: b.bookmarks,
      tags: b.tags,
      isFavorite: b.isFavorite,
      driveFileId: b.googleDriveFileId,
      addedAt: b.addedAt,
      lastReadAt: b.lastReadAt,
    })),
  };

  const q = `'${folderId}' in parents and name = '${manifestName}' and trashed = false`;
  const existingSearch = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let existingId: string | null = null;
  if (existingSearch.ok) {
    const list = await existingSearch.json();
    if (list.files && list.files.length > 0) {
      existingId = list.files[0].id;
    }
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob(
      [
        JSON.stringify({
          name: manifestName,
          parents: existingId ? undefined : [folderId],
          description: 'Lumina Reader Library Sync Manifest',
        }),
      ],
      { type: 'application/json; charset=UTF-8' }
    )
  );
  form.append(
    'file',
    new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' })
  );

  const endpoint = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart&fields=id`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`;

  const res = await fetch(endpoint, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error('Failed to update library manifest on Google Drive');
  }

  const result = await res.json();
  return result.id;
}

// Download book file binary from Drive
export async function downloadBookFileFromDrive(driveFileId: string): Promise<ArrayBuffer> {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive');

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (${res.status})`);
  }

  return await res.arrayBuffer();
}

// List all files in the Lumina Reader Drive folder
export async function listDriveLibraryFiles(): Promise<
  Array<{ id: string; name: string; size?: string; modifiedTime?: string; properties?: Record<string, string> }>
> {
  const token = cachedAccessToken;
  if (!token) return [];

  try {
    const folderId = await getOrCreateAppFolder(token);
    const q = `'${folderId}' in parents and trashed = false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name,size,modifiedTime,properties)&pageSize=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (e) {
    console.error('Error listing drive files:', e);
    return [];
  }
}

// Fetch Google Drive Storage Quota
export async function getDriveStorageQuota(): Promise<{
  limit?: string;
  usage?: string;
  usageInDrive?: string;
} | null> {
  const token = cachedAccessToken;
  if (!token) return null;

  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.storageQuota || null;
  } catch {
    return null;
  }
}
