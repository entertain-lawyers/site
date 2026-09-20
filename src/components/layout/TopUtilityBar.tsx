'use client';

import { useState, useEffect } from 'react';
import { Locale, Dictionary } from '@/lib/i18n';
import { setLocale } from '@/actions/locale';
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
    const newLocale = locale === 'en' ? 'ne' : 'en';
    await setLocale(newLocale);
    setIsPending(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="bg-navy-dark dark:bg-background text-white border-b border-border/20 relative z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between text-[11px] sm:text-xs font-medium tracking-wide">
        
        {/* Left: Date + Time */}
        <div className="flex items-center gap-2 text-blue-100/80">
          <Clock className="w-3.5 h-3.5 text-accent opacity-80" />
          <div className="flex items-center gap-2">
            <time className="hidden sm:block" suppressHydrationWarning>
              {mounted ? dateStr.split('•')[0].trim() : '...'}
            </time>
            <span className="hidden sm:block text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <time className="text-white/90 font-semibold" suppressHydrationWarning>
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
            className="flex items-center justify-center w-7 h-7 rounded-full text-blue-100/70 hover:text-white hover:bg-white/10 transition-all duration-300 focus:outline-none"
            style={{ opacity: mounted ? 1 : 0 }}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            title={theme === 'light' ? 'Night Study Mode' : 'Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-3.5 h-3.5" />
            ) : (
              <Sun className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="w-[1px] h-3.5 bg-white/10 mx-1"></div>

          {/* Language Switch */}
          <button
            onClick={handleLanguageToggle}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-blue-100/70 hover:text-white hover:bg-white/10 transition-all duration-300 focus:outline-none ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={`Switch to ${dict.nepali} language`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-bold">{dict.nepali}</span>
          </button>

        </div>
      </div>
    </div>
  );
}
