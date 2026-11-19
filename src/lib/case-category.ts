export type CaseCategory = 'NEW_CASE' | 'OLD_CASE' | 'BOTH_CASES';

export const CASE_CATEGORY_VALUES = ['NEW_CASE', 'OLD_CASE', 'BOTH_CASES'] as const;

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
  BOTH_CASES: {
    key: 'BOTH_CASES' as CaseCategory,
    label: 'Both Cases',
    shortLabel: 'Both',
    description: 'Precedents relevant as both newly prescribed and established syllabus cases.',
    badgeClass:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40',
  },
} as const;

export type CaseLawCategory = 'CIVIL' | 'CRIMINAL' | 'WRIT';

export const CASE_LAW_CATEGORY_VALUES = ['CIVIL', 'CRIMINAL', 'WRIT'] as const;

export const CASE_LAW_CATEGORIES = {
  CIVIL: {
    key: 'CIVIL' as CaseLawCategory,
    label: 'Civil Cases',
    shortLabel: 'Civil',
    description: 'Civil law precedents, contracts, property, family, and tort judgments.',
    badgeClass:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40',
  },
  CRIMINAL: {
    key: 'CRIMINAL' as CaseLawCategory,
    label: 'Criminal Cases',
    shortLabel: 'Criminal',
    description: 'Criminal law precedents, penal judgments, and criminal jurisprudence.',
    badgeClass:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/40',
  },
  WRIT: {
    key: 'WRIT' as CaseLawCategory,
    label: 'Writ Cases',
    shortLabel: 'Writ',
    description: 'Constitutional writ petitions, habeas corpus, mandamus, certiorari, and fundamental rights.',
    badgeClass:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40',
  },
} as const;

/**
 * Normalizes an arbitrary string into a strict CaseCategory or null.
 */
export function parseCaseCategory(val?: string | null): CaseCategory | null {
  if (!val) return null;
  const normalized = val.trim().toUpperCase().replace(/[-\s]/g, '_');
  if (
    normalized.includes('BOTH_CASES') ||
    normalized.includes('BOTH_CASE') ||
    normalized === 'BOTH' ||
    normalized.includes(':BOTH')
  ) {
    return 'BOTH_CASES';
  }
  if (normalized.includes('NEW_CASE') || normalized === 'NEW') return 'NEW_CASE';
  if (normalized.includes('OLD_CASE') || normalized === 'OLD') return 'OLD_CASE';
  return null;
}

/**
 * Normalizes an arbitrary string into a strict CaseLawCategory or null.
 */
export function parseCaseLawCategory(val?: string | null): CaseLawCategory | null {
  if (!val) return null;
  const upper = val.trim().toUpperCase();
  if (upper.includes('CIVIL')) return 'CIVIL';
  if (upper.includes('CRIMINAL')) return 'CRIMINAL';
  if (upper.includes('WRIT')) return 'WRIT';
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
 * Formats a CaseLawCategory into human-readable text.
 */
export function formatCaseLawCategory(cat?: string | null): string | null {
  const parsed = parseCaseLawCategory(cat);
  if (!parsed) return null;
  return CASE_LAW_CATEGORIES[parsed].label;
}

/**
 * Extracts the case category (New Case / Old Case) from a resource object.
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
 * Extracts the case law classification (Civil / Criminal / Writ) from a resource object.
 */
export function getCaseLawCategory(resource?: {
  metaTitle?: string | null;
  caseCategory?: string | null;
  type?: string | null;
} | null): CaseLawCategory | null {
  if (!resource) return null;
  if (resource.metaTitle) {
    const parsed = parseCaseLawCategory(resource.metaTitle);
    if (parsed) return parsed;
  }
  if (resource.caseCategory) {
    const parsed = parseCaseLawCategory(resource.caseCategory);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Encodes both classifications into a single backward-compatible metaTitle string.
 */
export function encodeCaseClassification(opts: {
  caseLawCategory?: CaseLawCategory | null;
  caseCategory?: CaseCategory | null;
}): string | null {
  const { caseLawCategory, caseCategory } = opts;
  if (caseLawCategory && caseCategory) {
    return `${caseLawCategory}:${caseCategory}`;
  }
  if (caseLawCategory) return caseLawCategory;
  if (caseCategory) return caseCategory;
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
