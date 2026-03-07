import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCc2ZGZ5LCU1_lgWNdMyloWwYxw0tR2OcA',
  authDomain: 'note-taking-app-d6870.firebaseapp.com',
  projectId: 'note-taking-app-d6870',
  storageBucket: 'note-taking-app-d6870.firebasestorage.app',
  messagingSenderId: '886143996395',
  appId: '1:886143996395:web:c2786ddd905d6ce29449ae',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
