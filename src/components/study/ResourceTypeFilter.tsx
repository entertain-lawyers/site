'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface ResourceTypeFilterProps {
  dict: {
    all: string;
    catLawNotes: string;
    catCaseLaws: string;
    catOldQuestions: string;
    catOthers: string;
  };
}

export default function ResourceTypeFilter({ dict }: ResourceTypeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type') || '';

  const TYPES = [
    { value: '', label: dict.all },
    { value: 'LAW_NOTE', label: dict.catLawNotes },
    { value: 'CASE_LAW', label: dict.catCaseLaws },
    { value: 'OLD_QUESTION', label: dict.catOldQuestions },
    { value: 'OTHER', label: dict.catOthers },
  ];

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSelect = (value: string) => {
    router.push(`?${createQueryString('type', value)}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-8 border-b border-border">
      {TYPES.map((type) => {
        const isActive = currentType === type.value;
        return (
          <button
            key={type.value}
            onClick={() => handleSelect(type.value)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {type.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gold rounded-t-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
