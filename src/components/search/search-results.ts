import { FileQuestion, BookOpen, Scale, Library, Newspaper, PenLine, Landmark, BookMarked, CalendarDays } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * Icon per result category (shared by the navbar overlay and /search page).
 */
export function hitIcon(category: string): LucideIcon {
  const c = category.toLowerCase();
  if (c.startsWith('resource-law_note') || c.startsWith('law_note')) return BookOpen;
  if (c.startsWith('resource-case_law') || c.startsWith('case_law')) return Scale;
  if (c.startsWith('resource-old_question') || c.startsWith('old_question')) return FileQuestion;
  if (c.startsWith('resource')) return Library;
  if (c === 'news' || c.includes('samachar') || c.includes('news')) return Newspaper;
  if (c === 'blog' || c.includes('blog')) return PenLine;
  if (c === 'fact' || c === 'personality') return Landmark;
  if (c === 'publication') return BookMarked;
  if (c === 'event') return CalendarDays;
  return Library;
}

/**
 * Chip tint per result family (light + dark).
 */
export function hitChip(category: string): string {
  const c = category.toLowerCase();
  if (c.startsWith('resource')) return 'bg-accent/10 text-accent';
  if (c.startsWith('nepali')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  return 'bg-navy/10 text-navy dark:bg-white/10 dark:text-white/80';
}

export interface SearchHit {
  id: string;
  title: string;
  meta?: string;
  url: string;
  category: string;
}

export interface SearchGroup {
  label: string;
  items: SearchHit[];
}

export interface SearchResult {
  query: string;
  total: number;
  groups: SearchGroup[];
  aiUsed?: boolean;
}
