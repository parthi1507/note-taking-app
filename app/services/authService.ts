import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function registerUser(
  email: string,
  password: string,
  displayName: string
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update display name in Firebase Auth
  await updateProfile(user, { displayName });

  // Save user profile in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    displayName,
    createdAt: new Date().toISOString(),
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  // Firebase requires a `url` in actionCodeSettings that matches an authorized
  // domain in your Firebase Console (Authentication → Settings → Authorized domains).
  // Without this, some Firebase project configs silently skip sending the email.
  const continueUrl =
    Platform.OS === 'web'
      ? window.location.origin
      : (process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081');

  await sendPasswordResetEmail(auth, email, {
    url: continueUrl,
    handleCodeInApp: true, // redirects back to this app after Firebase verifies the link
  });
}

export async function getEmailFromResetCode(oobCode: string): Promise<string> {
  return await verifyPasswordResetCode(auth, oobCode);
}

export async function confirmNewPassword(oobCode: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(auth, oobCode, newPassword);
}
