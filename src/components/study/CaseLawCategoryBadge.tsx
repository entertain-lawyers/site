import { parseCaseLawCategory, CASE_LAW_CATEGORIES, CaseLawCategory } from '@/lib/case-category';
import { Scale, ShieldAlert, Landmark } from 'lucide-react';

interface CaseLawCategoryBadgeProps {
  category?: CaseLawCategory | string | null;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

const ICONS: Record<CaseLawCategory, React.ComponentType<{ className?: string }>> = {
  CIVIL: Scale,
  CRIMINAL: ShieldAlert,
  WRIT: Landmark,
};

export default function CaseLawCategoryBadge({
  category,
  size = 'sm',
  className = '',
  showIcon = true,
}: CaseLawCategoryBadgeProps) {
  const parsed = parseCaseLawCategory(category);
  if (!parsed) return null;

  const config = CASE_LAW_CATEGORIES[parsed];
  const Icon = ICONS[parsed];

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] gap-1.5'
      : 'px-3 py-1.5 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-md border shadow-2xs transition-colors ${config.badgeClass} ${sizeClasses} ${className}`}
      data-case-law-category={parsed}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
}
