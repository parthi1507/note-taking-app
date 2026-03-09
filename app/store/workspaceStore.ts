import { create } from 'zustand';
import { Workspace } from '../types/workspace';
import { Note } from '../types/note';

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  workspaceNotes: Note[];
  workspaceSearchQuery: string;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setWorkspaceNotes: (notes: Note[]) => void;
  setWorkspaceSearchQuery: (q: string) => void;
  filteredWorkspaceNotes: () => Note[];
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  workspaceNotes: [],
  workspaceSearchQuery: '',

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  setWorkspaceNotes: (workspaceNotes) => set({ workspaceNotes }),
  setWorkspaceSearchQuery: (workspaceSearchQuery) => set({ workspaceSearchQuery }),

  filteredWorkspaceNotes: () => {
    const { workspaceNotes, workspaceSearchQuery } = get();
    if (!workspaceSearchQuery.trim()) return workspaceNotes;
    const q = workspaceSearchQuery.toLowerCase();
    return workspaceNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  },
}));
