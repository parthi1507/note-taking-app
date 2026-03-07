import { create } from 'zustand';
import { Note } from '../types/note';

interface NoteStore {
  notes: Note[];
  searchQuery: string;
  setNotes: (notes: Note[]) => void;
  setSearchQuery: (query: string) => void;
  filteredNotes: () => Note[];
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  searchQuery: '',

  setNotes: (notes) => set({ notes }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  filteredNotes: () => {
    const { notes, searchQuery } = get();
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
