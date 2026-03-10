export interface Reminder {
  id: string;
  userId: string;
  noteId: string;
  noteTitle: string;
  message: string;
  scheduledTime: string; // ISO date string
  createdAt: string;
  isDone: boolean;
  notificationId?: string; // expo local notification ID (mobile only)
  source: 'personal' | 'team';
  workspaceName?: string; // set when source === 'team'
}
