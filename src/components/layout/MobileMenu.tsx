'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dictionary } from '@/lib/i18n';
import { Menu, X, Home, BookOpen, CreditCard, Info, Mail, LayoutDashboard, Shield, LogOut, LogIn, User, FileEdit } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface NavLink {
  href: string;
  label: string;
}

interface MobileMenuProps {
  links: NavLink[];
  session: any;
  dict: Dictionary;
  semesters: { id: string; name: string }[];
  isNepaliMode?: boolean;
}

export default function MobileMenu({ links, session, dict, semesters, isNepaliMode = false }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={toggleMenu}
        className="p-2.5 -mr-2 flex items-center justify-center min-h-[44px] min-w-[44px] text-navy dark:text-white hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all duration-300 focus:outline-none"
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
      >
        <span className="sr-only">Open main menu</span>
        {isOpen ? (
          <X className="block h-6 w-6" strokeWidth={2.5} />
        ) : (
          <Menu className="block h-6 w-6" strokeWidth={2.5} />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Mobile menu dropdown */}
      <div
        className={`absolute top-[calc(100%+12px)] sm:top-[calc(100%+16px)] left-0 right-0 w-full bg-white dark:bg-[#0a1526] border border-white/10 shadow-2xl rounded-2xl z-50 lg:hidden overflow-hidden transition-all duration-300 ease-in-out origin-top ${
          isOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-4 py-6 space-y-2 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <nav aria-label="Mobile navigation" className="space-y-1">
            <Link
              href={links[0]?.href || '/'}
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold transition-all duration-300 ${
                pathname === (links[0]?.href || '/')
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-accent'
              }`}
            >
              <Home className="w-5 h-5" />
              {links[0]?.label || dict.home}
            </Link>

            {/* Mobile Study Section - Hide on Nepali Pages */}
            {!isNepaliMode && (
              <div className="pt-2 pb-1">
              <div className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-text-muted">
                {dict.study}
              </div>
              <div className="space-y-1 mt-1 pl-4 border-l-2 border-border ml-6">

                {/* Law Notes Accordion */}
                <details className="group/details [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer list-none select-none">
                    <span>{dict.catLawNotes || 'Law Notes'}</span>
                    <svg className="w-4 h-4 transition-transform group-open/details:rotate-180 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                    </svg>
                  </summary>
                  <div className="pl-4 mt-1 space-y-1 border-l-2 border-border/30 ml-4 pb-2">
                    <Link href="/study?type=LAW_NOTE" onClick={closeMenu} className="flex items-center px-4 py-2.5 min-h-[40px] text-[13px] font-medium text-text-secondary hover:text-accent rounded-lg transition-all">
                      All Notes
                    </Link>
                    {semesters.map((s) => (
                      <Link key={s.id} href={`/study?type=LAW_NOTE&semester=${s.id}`} onClick={closeMenu} className="flex items-center px-4 py-2.5 min-h-[40px] text-[13px] font-medium text-text-secondary hover:text-accent rounded-lg transition-all">
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </details>

                <Link href="/study?type=CASE_LAW" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  {dict.catCaseLaws || 'Case Laws'}
                </Link>

                {/* Old Questions Accordion */}
                <details className="group/details [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer list-none select-none">
                    <span>{dict.catOldQuestions || 'Old Questions'}</span>
                    <svg className="w-4 h-4 transition-transform group-open/details:rotate-180 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                    </svg>
                  </summary>
                  <div className="pl-4 mt-1 space-y-1 border-l-2 border-border/30 ml-4 pb-2">
                    <Link href="/study?type=OLD_QUESTION" onClick={closeMenu} className="flex items-center px-4 py-2.5 min-h-[40px] text-[13px] font-medium text-text-secondary hover:text-accent rounded-lg transition-all">
                      All Questions
                    </Link>
                    {semesters.map((s) => (
                      <Link key={s.id} href={`/study?type=OLD_QUESTION&semester=${s.id}`} onClick={closeMenu} className="flex items-center px-4 py-2.5 min-h-[40px] text-[13px] font-medium text-text-secondary hover:text-accent rounded-lg transition-all">
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </details>

                <Link href="/semesters" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  {dict.browseSemesters || 'Browse by Semester'}
                </Link>
              </div>

              {/* Explore Section */}
              <div className="px-4 py-2 mt-4 text-xs font-extrabold uppercase tracking-widest text-text-muted">
                Explore
              </div>
              <div className="space-y-1 mt-1 pl-4 border-l-2 border-border ml-6">
                <Link href="/calculator" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  Court Fee Calculator
                </Link>
                <Link href="/consultation" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  Consult a Lawyer
                </Link>
                <Link href="/events" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  Events
                </Link>

                <Link href="/faqs" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  FAQs
                </Link>
                <Link href="/blogs" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  Blogs
                </Link>
                <Link href="/news" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  News
                </Link>
                <Link href="/historical-facts" onClick={closeMenu} className="flex items-center px-4 py-3 min-h-[44px] text-sm font-semibold text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
                  Historical Facts
                </Link>
              </div>
            </div>
            )}

            <div className="h-px bg-border my-2 mx-4" />

            {links.slice(1).map((link) => {
              const isActive = pathname?.startsWith(link.href);
              let Icon = Info;
              if (link.href.includes('pricing')) Icon = CreditCard;
              if (link.href.includes('contact')) Icon = Mail;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-border px-2">
            {session ? (
              <div className="space-y-3">
                <div className="px-4 py-3 bg-black/5 dark:bg-white/5 rounded-2xl mb-4">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {session.user?.name || session.user?.email || 'User'}
                  </p>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {session.user?.email}
                  </p>
                </div>

                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-accent transition-all duration-300"
                >
                  <User className="w-5 h-5" />
                  Profile
                </Link>

                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold text-text-secondary hover:bg-accent hover:text-white transition-all duration-300"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  {dict.dashboard}
                </Link>

                {(session.user?.role === 'ADMIN' || session.user?.role === 'EDITOR') && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold text-amber-600 dark:text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-300"
                  >
                    {session.user.role === 'ADMIN' ? (
                      <>
                        <Shield className="w-5 h-5" />
                        {dict.admin || 'Admin Portal'}
                      </>
                    ) : (
                      <>
                        <FileEdit className="w-5 h-5" />
                        Editor
                      </>
                    )}
                  </Link>
                )}

                <div className="block w-full pt-2">
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                      closeMenu();
                    }}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl text-base font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/20"
                  >
                    <LogOut className="w-5 h-5" />
                    {dict.signOut}
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-2xl text-base font-bold text-white bg-accent hover:bg-accent-hover transition-all duration-300 shadow-[0_4px_14px_rgba(var(--color-accent),0.4)]"
              >
                <LogIn className="w-5 h-5" />
                {dict.signIn}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
