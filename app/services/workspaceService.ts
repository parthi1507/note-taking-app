import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Workspace } from '../types/workspace';

const WORKSPACES = 'workspaces';
const INVITE_CODE_TTL_MS = 150 * 1000; // 2 minutes 30 seconds

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createWorkspace(
  userId: string,
  displayName: string,
  name: string
): Promise<Workspace> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, WORKSPACES), {
    name,
    createdBy: userId,
    members: [userId],
    memberNames: { [userId]: displayName },
    createdAt: now,
  });
  return {
    id: ref.id,
    name,
    createdBy: userId,
    members: [userId],
    memberNames: { [userId]: displayName },
    createdAt: now,
  };
}

export async function generateWorkspaceInviteCode(
  workspaceId: string
): Promise<{ code: string; expiresAt: string }> {
  const code = randomCode();
  const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS).toISOString();
  await updateDoc(doc(db, WORKSPACES, workspaceId), {
    inviteCode: code,
    inviteCodeExpiresAt: expiresAt,
  });
  return { code, expiresAt };
}

export async function joinWorkspaceByCode(
  userId: string,
  displayName: string,
  code: string
): Promise<Workspace> {
  const q = query(
    collection(db, WORKSPACES),
    where('inviteCode', '==', code.trim().toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('NOT_FOUND');

  const d = snap.docs[0];
  const data = d.data() as Omit<Workspace, 'id'>;

  if (!data.inviteCodeExpiresAt || new Date(data.inviteCodeExpiresAt) < new Date()) {
    throw new Error('EXPIRED');
  }

  if (!data.members.includes(userId)) {
    await updateDoc(doc(db, WORKSPACES, d.id), {
      members: arrayUnion(userId),
      [`memberNames.${userId}`]: displayName,
    });
  }
  return { id: d.id, ...data };
}

export function subscribeToUserWorkspaces(
  userId: string,
  callback: (workspaces: Workspace[]) => void
): Unsubscribe {
  const q = query(
    collection(db, WORKSPACES),
    where('members', 'array-contains', userId)
  );
  return onSnapshot(q, (snap) => {
    const workspaces: Workspace[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Workspace, 'id'>),
    }));
    callback(workspaces);
  });
}
