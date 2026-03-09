export interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  memberNames: Record<string, string>;
  inviteCode?: string | null;
  inviteCodeExpiresAt?: string | null;
  createdAt: string;
}
