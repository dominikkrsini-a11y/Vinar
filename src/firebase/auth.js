import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import { auth } from './config';
import { deleteUserAccountData } from './firestore';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const onAuthChange = (callback) =>
  onAuthStateChanged(auth, callback);

export const deleteCurrentUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  await deleteUserAccountData(user.uid);
  await deleteUser(user);
};
