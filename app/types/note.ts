export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type NoteColor =
  | '#1e1e2e'
  | '#1e2e2e'
  | '#2e1e2e'
  | '#2e2e1e'
  | '#1e2028'
  | '#28201e';

export const NOTE_COLORS: NoteColor[] = [
  '#1e1e2e',
  '#1e2e2e',
  '#2e1e2e',
  '#2e2e1e',
  '#1e2028',
  '#28201e',
];
