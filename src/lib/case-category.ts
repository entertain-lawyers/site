export type CaseCategory = 'NEW_CASE' | 'OLD_CASE';

export const CASE_CATEGORY_VALUES = ['NEW_CASE', 'OLD_CASE'] as const;

export const CASE_CATEGORIES = {
  NEW_CASE: {
    key: 'NEW_CASE' as CaseCategory,
    label: 'New Case',
    shortLabel: 'New',
    description: 'Recent landmark judgments and newly prescribed precedents for this syllabus.',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40',
  },
  OLD_CASE: {
    key: 'OLD_CASE' as CaseCategory,
    label: 'Old Case',
    shortLabel: 'Old',
    description: 'Established precedents and historical landmark judgments prescribed for this subject.',
    badgeClass:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40',
  },
} as const;

/**
 * Normalizes an arbitrary string into a strict CaseCategory or null.
 */
export function parseCaseCategory(val?: string | null): CaseCategory | null {
  if (!val) return null;
  const normalized = val.trim().toUpperCase().replace(/[-\s]/g, '_');
  if (normalized === 'NEW_CASE' || normalized === 'NEW') return 'NEW_CASE';
  if (normalized === 'OLD_CASE' || normalized === 'OLD') return 'OLD_CASE';
  return null;
}

/**
 * Formats a CaseCategory into human-readable text.
 */
export function formatCaseCategory(cat?: string | null): string | null {
  const parsed = parseCaseCategory(cat);
  if (!parsed) return null;
  return CASE_CATEGORIES[parsed].label;
}

/**
 * Extracts the case category from a resource object (checks metaTitle and caseCategory fields).
 */
export function getCaseCategory(resource?: {
  metaTitle?: string | null;
  caseCategory?: string | null;
  type?: string | null;
} | null): CaseCategory | null {
  if (!resource) return null;
  if (resource.caseCategory) {
    const parsed = parseCaseCategory(resource.caseCategory);
    if (parsed) return parsed;
  }
  if (resource.metaTitle) {
    const parsed = parseCaseCategory(resource.metaTitle);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Determines whether a unit represents the special Prescribed Cases unit.
 */
export function isPrescribedCasesUnit(unit?: { name?: string | null; id?: string | null } | string | null): boolean {
  if (!unit) return false;
  const nameOrId = typeof unit === 'string' ? unit : `${unit.name || ''} ${unit.id || ''}`;
  const lower = nameOrId.toLowerCase().trim();
  return (
    lower.includes('prescribed') ||
    lower.includes('virtual-unit-cases') ||
    lower.includes('precedent') ||
    lower.includes('case law') ||
    lower === 'cases' ||
    lower === 'case'
  );
}
