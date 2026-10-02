'use client';

import Link from 'next/link';
import Image from 'next/image';
import MobileMenu from './MobileMenu';
import { Dictionary, Locale } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { BookOpen, User, LogIn, LayoutDashboard, Shield, LogOut, FileEdit } from 'lucide-react';
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

  const navLinks = isNepaliPage
    ? [
        { href: '/nepali', label: dict.home },
        { href: '/contact', label: dict.contact },
      ]
    : [
        { href: '/', label: dict.home },
        { href: '/explore', label: dict.exploreStudyMaterials || 'Explore' },
        { href: '/pricing', label: dict.pricing },
        { href: '/contact', label: dict.contact },
      ];

  return (
    <header className="sticky top-2 sm:top-4 z-40 transition-colors duration-300 w-full pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="relative flex items-center justify-between h-12 sm:h-14 px-3 sm:px-5 bg-white/95 dark:bg-surface/95 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] rounded-full pointer-events-auto">
          {/* Logo removed as requested */}

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

            {/* Study Dropdown - Hide on Nepali Pages (No Premium Content) */}
            {!isNepaliPage && (
              <div className="relative group">
              <button
                className={`flex items-center gap-1 px-5 py-2 rounded-full text-[14px] font-bold transition-all duration-300 ${
                  pathname?.startsWith('/study') || pathname?.startsWith('/semesters')
                    ? 'text-accent bg-accent/10 shadow-sm'
                    : 'text-text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {dict.study}
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180 text-text-muted group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="w-64 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border py-1.5">

                  {/* LAW NOTES */}
                  <div className="group/sub relative">
                    <Link href="/study?type=LAW_NOTE" className="flex items-center justify-between px-5 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">
                      {dict.catLawNotes || 'Law Notes'}
                      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    {/* Nested Semesters Dropdown */}
                    <div className="absolute top-0 left-full ml-1 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-300 z-50">
                      <div className="w-48 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border overflow-hidden py-1.5 max-h-[60vh] overflow-y-auto">
                        {semesters.map((s) => (
                          <Link key={s.id} href={`/study?type=LAW_NOTE&semester=${s.id}`} className="flex items-center px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* OLD QUESTIONS */}
                  <div className="group/sub relative">
                    <Link href="/study?type=OLD_QUESTION" className="flex items-center justify-between px-5 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">
                      {dict.catOldQuestions || 'Old Questions'}
                      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    {/* Nested Semesters Dropdown */}
                    <div className="absolute top-0 left-full ml-1 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-300 z-50">
                      <div className="w-48 bg-surface rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-border overflow-hidden py-1.5 max-h-[60vh] overflow-y-auto">
                        {semesters.map((s) => (
                          <Link key={s.id} href={`/study?type=OLD_QUESTION&semester=${s.id}`} className="flex items-center px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors">
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Link href="/semesters" className="flex items-center px-5 py-3 min-h-[44px] text-sm font-medium text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors border-t border-border mt-1">
                    {dict.browseSemesters || 'Browse by Semester'}
                  </Link>
                </div>
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
