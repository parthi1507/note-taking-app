import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AppUpdateInfo {
  version: string;
  apkUrl: string;
  releaseNotes: string;
}

/** Fetches the latest version info from Firestore */
export async function getLatestVersionInfo(): Promise<AppUpdateInfo | null> {
  try {
    const ref = doc(db, 'appConfig', 'android');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      version: data.version ?? '',
      apkUrl: data.apkUrl ?? '',
      releaseNotes: data.releaseNotes ?? '',
    };
  } catch {
    return null;
  }
}

/** Compares semver strings. Returns true if remote > local */
export function isNewerVersion(localVersion: string, remoteVersion: string): boolean {
  const parse = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
  const local = parse(localVersion);
  const remote = parse(remoteVersion);
  for (let i = 0; i < Math.max(local.length, remote.length); i++) {
    const l = local[i] ?? 0;
    const r = remote[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/** Publishes a new version to Firestore (called from publish script) */
export async function publishVersion(info: AppUpdateInfo): Promise<void> {
  const ref = doc(db, 'appConfig', 'android');
  await setDoc(ref, { ...info, publishedAt: new Date().toISOString() });
}
