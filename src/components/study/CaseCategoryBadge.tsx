import { parseCaseCategory, CASE_CATEGORIES, CaseCategory } from '@/lib/case-category';
import { Sparkles, History } from 'lucide-react';

interface CaseCategoryBadgeProps {
  category?: CaseCategory | string | null;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export default function CaseCategoryBadge({
  category,
  size = 'sm',
  className = '',
  showIcon = true,
}: CaseCategoryBadgeProps) {
  const parsed = parseCaseCategory(category);
  if (!parsed) return null;

  const config = CASE_CATEGORIES[parsed];
  const Icon = parsed === 'NEW_CASE' ? Sparkles : History;

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] gap-1.5'
      : 'px-3 py-1.5 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-md border shadow-2xs transition-colors ${config.badgeClass} ${sizeClasses} ${className}`}
      data-case-category={parsed}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
}
