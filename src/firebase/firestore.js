import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
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

// Logbook entries
export const addEntry = async (userId, wineId, entryData) => {
  const ref = collection(db, 'users', userId, 'wines', wineId, 'entries');
  return await addDoc(ref, {
    ...entryData,
    createdAt: new Date().toISOString(),
  });
};

export const getEntries = async (userId, wineId) => {
  const ref = collection(db, 'users', userId, 'wines', wineId, 'entries');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
