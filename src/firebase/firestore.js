import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, onSnapshot, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { buildDashboardSnapshot } from '../utils/wineDashboardSnapshot';

// Profile
export const getUserProfile = async (userId) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const saveUserProfile = async (userId, data) => {
  const ref = doc(db, 'users', userId);
  await setDoc(ref, data, { merge: true });
};

// Wines
export const addWine = async (userId, wineData) => {
  const ref = collection(db, 'users', userId, 'wines');
  return await addDoc(ref, {
    ...wineData,
    createdAt: new Date().toISOString(),
  });
};

export const getWines = async (userId) => {
  const ref = collection(db, 'users', userId, 'wines');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Live wines list — serves cached data immediately when offline and
// updates automatically once local writes sync or new snapshots arrive.
// Returns an unsubscribe function.
export const subscribeToWines = (userId, onData, onError) => {
  const ref = collection(db, 'users', userId, 'wines');
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
};

// Logbook entries
// createdAt carries the date the work was actually done, which is not always
// the date it gets typed in — a reading taken in the cellar in the morning is
// often logged that evening. Callers may pass their own createdAt to backdate;
// everything downstream (ordering, the chart, days-since, the PDF, the AI
// prompt) reads this one field, so backdating stays consistent everywhere.
export const addEntry = async (userId, wineId, entryData) => {
  const ref = collection(db, 'users', userId, 'wines', wineId, 'entries');
  return await addDoc(ref, {
    ...entryData,
    createdAt: entryData.createdAt || new Date().toISOString(),
  });
};

export const getEntries = async (userId, wineId) => {
  const ref = collection(db, 'users', userId, 'wines', wineId, 'entries');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Dashboard badges only need a short recent window (two densities, latest
// SO₂/pH, last check date). Full history stays on Wine Detail.
export const getRecentEntries = async (userId, wineId, limitCount = 10) => {
  const ref = collection(db, 'users', userId, 'wines', wineId, 'entries');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateWine = async (uid, wineId, data) => {
  const ref = doc(db, 'users', uid, 'wines', wineId);
  await updateDoc(ref, data);
};

// Rebuild the denormalized dashboard map from the last 10 entries. Callers
// must not await this on the cellar save path — the local cache updates
// immediately and the write queues while offline.
export const refreshWineDashboardSnapshot = async (userId, wineId) => {
  const entries = await getRecentEntries(userId, wineId, 10);
  const dashboard = buildDashboardSnapshot(entries);
  await updateWine(userId, wineId, {
    dashboard,
    lastEntryAt: dashboard.lastEntryAt,
  });
};

// Live logbook entries — same offline-first behavior as subscribeToWines.
export const subscribeToEntries = (userId, wineId, onData, onError) => {
  const ref = collection(db, 'users', userId, 'wines', wineId, 'entries');
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
};

export const deleteEntry = async (userId, wineId, entryId) => {
  const ref = doc(db, 'users', userId, 'wines', wineId, 'entries', entryId);
  await deleteDoc(ref);
};

// Same offline-friendly fire-and-forget pattern as addEntry: the local cache
// updates immediately; awaiting would hang the UI while offline.
export const updateEntry = async (userId, wineId, entryId, entryData) => {
  const ref = doc(db, 'users', userId, 'wines', wineId, 'entries', entryId);
  await updateDoc(ref, entryData);
};

// Marketplace listings
export const addListing = async (listingData) => {
  const ref = collection(db, 'listings');
  return await addDoc(ref, {
    ...listingData,
    createdAt: new Date().toISOString(),
  });
};

export const getListings = async () => {
  const ref = collection(db, 'listings');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteListing = async (listingId) => {
  const ref = doc(db, 'listings', listingId);
  await deleteDoc(ref);
};

export const deleteWine = async (userId, wineId) => {
  const ref = doc(db, 'users', userId, 'wines', wineId);
  await deleteDoc(ref);
};

export const uploadImage = async (uri, storagePath) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
};

function storagePathFromDownloadUrl(downloadUrl) {
  // Firebase Storage download URLs look like:
  //   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media&token=...
  // We extract <encodedPath> so we can delete the object by path.
  try {
    const match = String(downloadUrl).match(/\/o\/([^?]+)/);
    if (!match) return null;
    const encodedPath = match[1];
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

// Apple requires in-app account deletion. Best-effort: wines + entries,
// marketplace listings, listing images in Storage, feedback, analytics events,
// assistant usage counters, profile doc, and profile photo.
export const deleteUserAccountData = async (userId) => {
  const wines = await getWines(userId);
  for (const wine of wines) {
    const entries = await getEntries(userId, wine.id);
    await Promise.all(entries.map((entry) => deleteEntry(userId, wine.id, entry.id)));
    await deleteWine(userId, wine.id);
  }

  const listingsSnap = await getDocs(
    query(collection(db, 'listings'), where('userId', '==', userId)),
  );
  await Promise.all(listingsSnap.docs.map(async (listing) => {
    const { imageUrl } = listing.data() || {};
    if (imageUrl) {
      const storagePath = storagePathFromDownloadUrl(imageUrl);
      if (storagePath) {
        try {
          await deleteObject(ref(storage, storagePath));
        } catch {
          // Best-effort: deletion may fail if the object was already removed.
        }
      }
    }
    await deleteListing(listing.id);
  }));

  try {
    await deleteObject(ref(storage, `profiles/${userId}/photo.jpg`));
  } catch {
    // Photo may not exist.
  }

  // Remove beta micro-survey feedback answers for this account.
  try {
    const feedbackSnap = await getDocs(
      query(collection(db, 'feedback'), where('userId', '==', userId)),
    );
    await Promise.all(feedbackSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // Best-effort: security rules or missing docs may prevent deletion.
  }

  // Remove usage analytics events tied to this user id.
  try {
    const analyticsSnap = await getDocs(
      query(collection(db, 'analytics_events'), where('userId', '==', userId)),
    );
    await Promise.all(analyticsSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // Best-effort.
  }

  // Remove assistant daily usage counters tied to this account.
  try {
    const dailySnap = await getDocs(collection(db, 'assistantUsage', userId, 'daily'));
    await Promise.all(dailySnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'assistantUsage', userId));
  } catch {
    // Best-effort.
  }

  await deleteDoc(doc(db, 'users', userId));
};
