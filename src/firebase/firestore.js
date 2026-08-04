import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

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

export const updateWine = async (uid, wineId, data) => {
  const ref = doc(db, 'users', uid, 'wines', wineId);
  await updateDoc(ref, data);
};

export const uploadImage = async (uri, storagePath) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
};
