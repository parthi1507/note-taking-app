import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// On native, persist auth state across app restarts using AsyncStorage.
// getReactNativePersistence is in the Metro/RN-specific firebase bundle so it needs a runtime require.
// On web, fall back to the default (localStorage-based) persistence.
function buildAuth() {
  if (Platform.OS !== 'web') {
    try {
      const { getReactNativePersistence } = require('@firebase/auth') as any;
      if (getReactNativePersistence) {
        return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
      }
    } catch { /* fall through */ }
  }
  return getAuth(app);
}

export const auth = buildAuth();
export const db = getFirestore(app);
