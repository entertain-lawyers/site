'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MobileMenu from './MobileMenu';
import { Dictionary, Locale } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { BookOpen, User, LogIn, LayoutDashboard, Shield, LogOut, FileEdit, ChevronDown, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface NavbarProps {
  dict: Dictionary;
  session: any;
  semesters: { id: string; name: string }[];
  locale: 'en' | 'ne';
}

export default function Navbar({ dict, session, semesters, locale }: NavbarProps) {
  const pathname = usePathname();
  const isNepaliPage = locale === 'ne';
  
  const [isStudyOpen, setIsStudyOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close on route change
    setIsStudyOpen(false);
    setIsExploreOpen(false);
    setOpenSubmenu(null);
  }, [pathname]);

  useEffect(() => {
    // Handle outside click
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStudyOpen(false);
        setIsExploreOpen(false);
        setOpenSubmenu(null);
      }
    }
    // Handle Escape key
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsStudyOpen(false);
        setIsExploreOpen(false);
        setOpenSubmenu(null);
      }
    }

    if (isStudyOpen || isExploreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStudyOpen]);

  const navLinks = isNepaliPage
    ? [
        { href: '/nepali', label: dict.home },
        { href: '/contact', label: dict.contact },
      ]
    : [
        { href: '/', label: dict.home },
        { href: '/pricing', label: dict.pricing },
        { href: '/contact', label: dict.contact },
      ];

  const handleStudyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsStudyOpen(!isStudyOpen);
      setIsExploreOpen(false);
      setOpenSubmenu(null);
    }
  };

  const handleExploreKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExploreOpen(!isExploreOpen);
      setIsStudyOpen(false);
      setOpenSubmenu(null);
    }
  };

  const handleSubmenuKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpenSubmenu(openSubmenu === id ? null : id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setOpenSubmenu(id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setOpenSubmenu(null);
    }
  };

  return (
    <header className="sticky top-2 sm:top-4 z-40 transition-colors duration-300 w-full pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="relative flex items-center justify-between h-12 sm:h-14 px-3 sm:px-5 bg-white/95 dark:bg-surface/95 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] rounded-full pointer-events-auto">

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main navigation">
            <Link
              href={navLinks[0].href}
              className={`px-5 py-2 rounded-full text-[14px] font-bold transition-all duration-300 ${
                pathname === navLinks[0].href
                  ? 'text-accent bg-accent/10 shadow-sm'
                  : 'text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {navLinks[0].label}
            </Link>

            {/* Study Dropdown */}
            {!isNepaliPage && (
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center space-x-1">
                <button
                  aria-expanded={isStudyOpen}
                  aria-haspopup="true"
                  onClick={() => { setIsStudyOpen(!isStudyOpen); setIsExploreOpen(false); }}
                  onKeyDown={handleStudyKeyDown}
                  className={`flex items-center gap-1 px-5 py-2 rounded-full text-[14px] font-bold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    pathname?.startsWith('/study') || pathname?.startsWith('/semesters')
                      ? 'text-accent bg-accent/10 shadow-sm'
                      : 'text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {dict.study}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStudyOpen ? 'rotate-180 text-accent' : 'text-text-muted'}`} />
                </button>

                {isStudyOpen && (
                  <div className="absolute top-full left-0 pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="w-64 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border py-1.5 flex flex-col">

                      {/* LAW NOTES */}
                      <div 
                        className="relative"
                        onMouseEnter={() => setOpenSubmenu('law_notes')}
                        onMouseLeave={() => setOpenSubmenu(null)}
                      >
                        <button 
                          onClick={() => setOpenSubmenu(openSubmenu === 'law_notes' ? null : 'law_notes')}
                          onKeyDown={(e) => handleSubmenuKeyDown(e, 'law_notes')}
                          aria-expanded={openSubmenu === 'law_notes'}
                          className="w-full flex items-center justify-between px-5 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors focus:outline-none focus-visible:bg-accent/5"
                        >
                          {dict.catLawNotes || 'Law Notes'}
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        
                        {openSubmenu === 'law_notes' && (
                          <div className="absolute top-0 left-full ml-1 z-50 animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="w-48 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border overflow-hidden py-1.5 max-h-[60vh] overflow-y-auto flex flex-col">
                              {semesters.map((s) => (
                                <Link 
                                  key={s.id} 
                                  href={`/study?type=LAW_NOTE&semester=${s.id}`} 
                                  className="flex items-center px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors focus:outline-none focus-visible:bg-accent/5"
                                >
                                  {s.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* OLD QUESTIONS */}
                      <div 
                        className="relative"
                        onMouseEnter={() => setOpenSubmenu('old_questions')}
                        onMouseLeave={() => setOpenSubmenu(null)}
                      >
                        <button 
                          onClick={() => setOpenSubmenu(openSubmenu === 'old_questions' ? null : 'old_questions')}
                          onKeyDown={(e) => handleSubmenuKeyDown(e, 'old_questions')}
                          aria-expanded={openSubmenu === 'old_questions'}
                          className="w-full flex items-center justify-between px-5 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors focus:outline-none focus-visible:bg-accent/5"
                        >
                          {dict.catOldQuestions || 'Old Questions'}
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        
                        {openSubmenu === 'old_questions' && (
                          <div className="absolute top-0 left-full ml-1 z-50 animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="w-48 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border overflow-hidden py-1.5 max-h-[60vh] overflow-y-auto flex flex-col">
                              {semesters.map((s) => (
                                <Link 
                                  key={s.id} 
                                  href={`/study?type=OLD_QUESTION&semester=${s.id}`} 
                                  className="flex items-center px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors focus:outline-none focus-visible:bg-accent/5"
                                >
                                  {s.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Link 
                        href="/semesters" 
                        className="flex items-center px-5 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors border-t border-border mt-1 focus:outline-none focus-visible:bg-accent/5"
                      >
                        {dict.browseSemesters || 'Browse by Semester'}
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Explore Dropdown Button */}
                <button
                  aria-expanded={isExploreOpen}
                  aria-haspopup="true"
                  onClick={() => { setIsExploreOpen(!isExploreOpen); setIsStudyOpen(false); }}
                  onKeyDown={handleExploreKeyDown}
                  className={`flex items-center gap-1 px-5 py-2 rounded-full text-[14px] font-bold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    ['/events', '/faqs', '/blogs', '/news', '/historical-facts'].some(p => pathname?.startsWith(p))
                      ? 'text-accent bg-accent/10 shadow-sm'
                      : 'text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  Explore
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExploreOpen ? 'rotate-180 text-accent' : 'text-text-muted'}`} />
                </button>

                {isExploreOpen && (
                  <div className="absolute top-full left-32 pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="w-56 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border py-1.5 flex flex-col">
                      <Link href="/events" className="flex items-center px-5 py-3 text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">Events</Link>

                      <Link href="/faqs" className="flex items-center px-5 py-3 text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">FAQs</Link>
                      <div className="h-px bg-border my-1" />
                      <Link href="/blogs" className="flex items-center px-5 py-3 text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">Blogs</Link>
                      <Link href="/news" className="flex items-center px-5 py-3 text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">News</Link>
                      <Link href="/historical-facts" className="flex items-center px-5 py-3 text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">Historical Facts</Link>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {navLinks.slice(1).map((link) => {
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-5 py-2 rounded-full text-[14px] font-bold transition-all duration-300 ${
                    isActive
                      ? 'text-accent bg-accent/10 shadow-sm'
                      : 'text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auth — Desktop */}
            <div className="hidden lg:flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-2">
                {(session.user?.role === 'ADMIN' || session.user?.role === 'EDITOR') && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-text-secondary hover:text-accent hover:bg-surface-alt rounded-full transition-colors"
                  >
                    {session.user.role === 'ADMIN' ? (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>{dict.admin || 'Admin Portal'}</span>
                      </>
                    ) : (
                      <>
                        <FileEdit className="w-4 h-4" />
                        <span>Editor</span>
                      </>
                    )}
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-accent text-white hover:bg-accent-hover rounded-full transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{dict.dashboard}</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center justify-center p-2.5 text-text-secondary hover:text-accent hover:bg-surface-alt rounded-full transition-colors border border-black/5 dark:border-white/5"
                  aria-label="Profile"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center justify-center p-2.5 text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors" aria-label={dict.signOut} title="Sign Out">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-accent text-white hover:bg-accent-hover rounded-full transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{dict.signIn}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <MobileMenu links={navLinks} session={session} dict={dict} semesters={semesters} isNepaliMode={isNepaliPage} />
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
