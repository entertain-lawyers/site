'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Database, Users, Settings, LogOut, Globe, History, Menu, X } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileOpen]);

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Posts', href: '/admin/posts', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Events', href: '/admin/events', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Publications', href: '/admin/publications', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Gallery', href: '/admin/gallery', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'FAQs', href: '/admin/faqs', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Semesters', href: '/admin/study/semesters', icon: Database, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Subjects', href: '/admin/study/subjects', icon: Database, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Units', href: '/admin/study/units', icon: Database, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Resources', href: '/admin/study/resources', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Users & Roles', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History, roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-950 z-40 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 safe-area-top">
        <h2 className="text-xl font-bold text-navy dark:text-white tracking-tight">
          {userRole === 'ADMIN' ? 'Admin Portal' : 'Editor Portal'}
        </h2>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -mr-2 text-text-secondary dark:text-white/70 hover:text-navy dark:hover:text-white transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`w-64 bg-slate-50 dark:bg-zinc-950 h-dvh flex flex-col border-r border-black/5 dark:border-white/5 shrink-0 fixed top-0 bottom-0 z-50 transition-transform duration-300 ease-in-out safe-area-top safe-area-bottom lg:translate-x-0 ${isMobileOpen ? 'translate-x-0 left-0' : '-translate-x-full left-0 lg:left-0'}`}>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-text-secondary dark:text-white/50 hover:text-navy dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center z-20 focus:outline-none"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>

      <div className="p-6">
        <h2 className="text-xl font-bold text-navy dark:text-white tracking-tight">
          {userRole === 'ADMIN' ? 'Admin Portal' : 'Editor Portal'}
        </h2>
        <p className="text-text-muted dark:text-white/40 text-xs font-medium tracking-wider uppercase mt-1">
          Management System
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto overflow-x-hidden pb-4">

        {/* Group: PRIMARY */}
        <div className="mb-6">
          {filteredNavItems.filter(i => i.name === 'Dashboard').map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                  isActive
                    ? 'bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-light'
                    : 'text-text-secondary dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-navy dark:hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-5 rounded-full bg-accent"></div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Group: CONTENT */}
        <div className="mb-6">
          <p className="px-3 text-[11px] font-bold text-text-muted dark:text-white/40 tracking-wider uppercase mb-2">Content</p>
          <div className="space-y-0.5">
            {filteredNavItems.filter(i => ['Resources', 'Semesters', 'Subjects', 'Units'].includes(i.name)).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                    isActive
                      ? 'bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-light'
                      : 'text-text-secondary dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-navy dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-5 rounded-full bg-accent"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Group: PUBLISHING */}
        <div className="mb-6">
          <p className="px-3 text-[11px] font-bold text-text-muted dark:text-white/40 tracking-wider uppercase mb-2">Publishing</p>
          <div className="space-y-0.5">
            {filteredNavItems.filter(i => ['Posts', 'Events', 'Publications', 'Gallery', 'FAQs'].includes(i.name)).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                    isActive
                      ? 'bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-light'
                      : 'text-text-secondary dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-navy dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-5 rounded-full bg-accent"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Group: SYSTEM */}
        {(userRole === 'ADMIN') && (
          <div className="mb-6">
            <p className="px-3 text-[11px] font-bold text-text-muted dark:text-white/40 tracking-wider uppercase mb-2">System</p>
            <div className="space-y-0.5">
              {filteredNavItems.filter(i => ['Users & Roles', 'Audit Logs'].includes(i.name)).map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-light'
                        : 'text-text-secondary dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-navy dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1 h-5 rounded-full bg-accent"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-1">
        <Link href="/" className="group flex w-full items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-text-secondary dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-navy dark:hover:text-white">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5" />
            <span>Main Site</span>
          </div>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="group flex w-full items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-text-secondary dark:text-white/60 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400">
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Secure Logout</span>
          </div>
        </button>
      </div>
      </div>
    </>
  );
}
