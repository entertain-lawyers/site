'use client';

import { useState, useEffect } from 'react';
import { Locale, Dictionary } from '@/lib/i18n';
import { setLocale } from '@/actions/locale';
import { useRouter, usePathname } from 'next/navigation';
import { formatBSDate } from '@/lib/nepali-date';
import { Sun, Moon, Globe, Clock } from 'lucide-react';

interface TopUtilityBarProps {
  locale: Locale;
  dict: Dictionary;
}

export default function TopUtilityBar({ locale, dict }: TopUtilityBarProps) {
  const [dateStr, setDateStr] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isNepaliMode = locale === 'ne';

  useEffect(() => {
    setMounted(true);
    // Determine initial theme from HTML attribute set by the layout script
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
    if (currentTheme) {
      setTheme(currentTheme);
    }

    // Set date and time
    const updateDateTime = () => {
      const nepalTimeDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));

      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      const timeStr = nepalTimeDate.toLocaleTimeString('en-US', timeOptions) + ' (NPT)';

      if (locale === 'ne') {
        setDateStr(`${dict.dateLabel || 'मिति'}: ${formatBSDate(nepalTimeDate)} • ${timeStr}`);
      } else {
        const formattedEnDate = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kathmandu',
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(nepalTimeDate);
        setDateStr(`${formattedEnDate} • ${timeStr}`);
      }
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [locale, dict.dateLabel]);

  const handleLanguageToggle = async () => {
    if (isPending) return;
    setIsPending(true);

    if (isNepaliMode) {
      await setLocale('en');
      router.push('/');
    } else {
      await setLocale('ne');
      router.push('/nepali');
    }

    setIsPending(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="bg-gradient-to-r from-navy-dark via-[#1a2942] to-navy-dark dark:from-[#0B1120] dark:via-[#111827] dark:to-[#0B1120] text-white border-b border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] relative z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 min-h-[44px] flex items-center justify-between text-[11px] sm:text-xs font-medium tracking-wide">

        {/* Left: Date + Time */}
        <div className="flex items-center gap-2.5 bg-white text-black dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700 px-3.5 py-1.5 rounded-full shadow-sm transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-[12px] sm:text-[13px]">
          <Clock className="w-4 h-4 text-accent" />
          <div className="flex items-center gap-2">
            <time className="hidden sm:block font-bold tracking-wide" suppressHydrationWarning>
              {mounted ? dateStr.split('•')[0].trim() : '...'}
            </time>
            <span className="hidden sm:block text-gray-400">•</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <time className="font-extrabold tracking-wide" suppressHydrationWarning>
                {mounted ? dateStr.split('•')[1]?.trim() : '...'}
              </time>
            </div>
          </div>
        </div>

        {/* Right: Theme Toggle, Language Switch & Brand */}
        <div className="flex items-center h-full gap-1 sm:gap-3">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full bg-white text-navy-dark dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:border-blue-600 transition-all duration-300 focus:outline-none shadow-sm"
            style={{ opacity: mounted ? 1 : 0 }}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            title={theme === 'light' ? 'Night Study Mode' : 'Light Mode'}
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span className="font-bold hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span className="font-bold hidden sm:inline">Light</span>
              </>
            )}
          </button>

          {/* Divider removed */}

          {/* Language Switch */}
          <button
            onClick={handleLanguageToggle}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full bg-white text-navy-dark dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700 hover:bg-red-700 hover:text-white dark:hover:bg-red-700 dark:hover:border-red-700 transition-all duration-300 focus:outline-none shadow-sm ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={`Switch to ${isNepaliMode ? 'English' : 'Nepali'} language`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-bold">{isPending ? '...' : (isNepaliMode ? 'ENGLISH' : 'NEPALI')}</span>
          </button>

        </div>
      </div>
    </div>
  );
}
