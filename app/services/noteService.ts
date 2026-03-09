import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Note } from '../types/note';

const COLLECTION = 'notes';

export async function createNote(
  userId: string,
  data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateNote(
  noteId: string,
  data: Partial<Omit<Note, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, noteId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, noteId));
}

export function subscribeToNotes(
  userId: string,
  callback: (notes: Note[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('isPinned', 'desc'),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notes: Note[] = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Note, 'id'>) }))
      .filter((n) => !n.workspaceId);
    callback(notes);
  });
}

// Requires a composite Firestore index: workspaceId ASC, isPinned DESC, updatedAt DESC
export function subscribeToWorkspaceNotes(
  workspaceId: string,
  callback: (notes: Note[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('workspaceId', '==', workspaceId),
    orderBy('isPinned', 'desc'),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notes: Note[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Note, 'id'>),
    }));
    callback(notes);
  });
}
