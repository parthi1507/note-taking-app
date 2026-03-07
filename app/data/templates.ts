export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  getContent: () => string;
  getTitle: () => string;
}

function today(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: 'document-outline',
    color: '#6c47ff',
    getTitle: () => '',
    getContent: () => '',
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Agenda, discussion & action items',
    icon: 'people-outline',
    color: '#3b82f6',
    getTitle: () => `Meeting Notes — ${today()}`,
    getContent: () =>
      `# Meeting Notes\n\n**Date:** ${today()}\n**Attendees:** \n\n## Agenda\n- \n\n## Discussion\n\n\n## Action Items\n- [ ] \n- [ ] \n\n## Next Steps\n`,
  },
  {
    id: 'todo',
    name: 'To-Do List',
    description: 'Organize tasks with checkboxes',
    icon: 'checkmark-circle-outline',
    color: '#10b981',
    getTitle: () => 'To-Do List',
    getContent: () =>
      `# To-Do List\n\n## Today\n- [ ] \n- [ ] \n- [ ] \n\n## This Week\n- [ ] \n- [ ] \n\n## Someday\n- [ ] \n`,
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'Daily thoughts and reflections',
    icon: 'book-outline',
    color: '#f59e0b',
    getTitle: () => `Journal — ${today()}`,
    getContent: () =>
      `# Journal — ${today()}\n\n**Mood:** \n\n## Highlights\n\n\n## Thoughts\n\n\n## Gratitude\n- \n- \n- \n\n## Tomorrow\n- [ ] \n`,
  },
  {
    id: 'lecture',
    name: 'Lecture Notes',
    description: 'Key points, details and summary',
    icon: 'school-outline',
    color: '#ec4899',
    getTitle: () => 'Lecture Notes',
    getContent: () =>
      `# Lecture Notes\n\n**Subject:** \n**Date:** ${today()}\n**Topic:** \n\n## Key Points\n- \n- \n- \n\n## Details\n\n\n## Questions\n- \n\n## Summary\n`,
  },
];
