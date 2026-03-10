/**
 * Publish a new app version to Firestore so users see the update banner.
 *
 * Usage:
 *   node scripts/publish-version.js --version 1.0.1 --url "https://expo.dev/..." --notes "Added image import"
 *
 * After running this, users who open the app will see a banner prompting them to download the new APK.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDSrSbE3VbEW0Mjao3gQTmxJx2lFJCbPrs",
  authDomain: "note-taking-app-parthiban15.firebaseapp.com",
  projectId: "note-taking-app-parthiban15",
  storageBucket: "note-taking-app-parthiban15.firebasestorage.app",
  messagingSenderId: "929929523296",
  appId: "1:929929523296:web:4f9d91fc33e6e4fc0c1e58"
};

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const version = get('--version');
const apkUrl = get('--url');
const releaseNotes = get('--notes') ?? '';

if (!version || !apkUrl) {
  console.error('Usage: node scripts/publish-version.js --version 1.0.1 --url "https://..." --notes "What changed"');
  process.exit(1);
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const ref = doc(db, 'appConfig', 'android');
  await setDoc(ref, {
    version,
    apkUrl,
    releaseNotes,
    publishedAt: new Date().toISOString(),
  });
  console.log(`✓ Published version ${version} to Firestore`);
  console.log(`  APK URL: ${apkUrl}`);
  console.log(`  Users will see the update banner next time they open the app.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to publish:', err.message);
  process.exit(1);
});
