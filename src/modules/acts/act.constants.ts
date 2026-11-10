export const ACT_CATEGORIES = [
  { value: 'CONSTITUTION', label: 'Constitution' },
  { value: 'ACTS', label: 'Acts' },
  { value: 'RULES_REGULATIONS', label: 'Rules / Regulations' },
  { value: 'ORDINANCE', label: 'Ordinance' },
  { value: 'POLICIES', label: 'Policies' },
  { value: 'INTERNATIONAL_TREATIES', label: 'International Treaties' },
  { value: 'HISTORICAL_DOCUMENTS', label: 'Historical Documents' },
  { value: 'OTHERS', label: 'Others' },
] as const;

export type ActCategoryValue = (typeof ACT_CATEGORIES)[number]['value'];
