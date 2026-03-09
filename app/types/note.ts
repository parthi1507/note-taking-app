export interface NoteLocation {
  lat: number;
  lng: number;
  address: string;
}

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
  workspaceId?: string;
  lastEditedBy?: string;
  location?: NoteLocation | null;
}

export type NoteColor =
  | '#7c3aed'
  | '#0891b2'
  | '#059669'
  | '#d97706'
  | '#dc2626'
  | '#db2777';

export const NOTE_COLORS: NoteColor[] = [
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
];
