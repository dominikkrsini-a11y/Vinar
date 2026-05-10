import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// eslint-disable-next-line import/named -- Metro/RN build exports this; ESLint static resolution can't see it
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY             || extra.firebaseApiKey,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN         || extra.firebaseAuthDomain,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID          || extra.firebaseProjectId,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET      || extra.firebaseStorageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.firebaseMessagingSenderId,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID              || extra.firebaseAppId,
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db      = getFirestore(app);
export const storage = getStorage(app);
