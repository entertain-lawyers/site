'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Database, Users, Settings, LogOut, Globe, History, Menu, X, MessageSquare, Brain, LayoutTemplate, Images, BookOpen, ShieldCheck, Home, ArrowRightLeft, Scale } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AnimatePresence, Backdrop, m } from '@/components/motion/primitives';
import { springSnappy } from '@/lib/motion';
import { useMediaQuery } from '@/hooks/use-media-query';

type NavItem = {
  name: string;
  href: string;
  icon: typeof FileText;
  roles: string[];
  badge?: number;
};

export default function AdminSidebar({
  userRole,
  pendingConsultations = 0,
}: {
  userRole: string;
  pendingConsultations?: number;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 64rem)', true);

  // Navigating from the drawer used to leave it open over the new page.
  // Adjusted during render (not in an effect) so it closes in the same pass.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setIsMobileOpen(false);
  }

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

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Consultations', href: '/admin/consultations', icon: MessageSquare, roles: ['ADMIN', 'EDITOR'], badge: pendingConsultations },
    { name: 'Consult Lawyers', href: '/admin/lawyers', icon: Scale, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Posts', href: '/admin/posts', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Visual Pages', href: '/admin/pages', icon: LayoutTemplate, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Events', href: '/admin/events', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'FAQs', href: '/admin/faqs', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Gallery', href: '/admin/gallery', icon: Images, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Publications', href: '/admin/publications', icon: BookOpen, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Team', href: '/admin/team', icon: Users, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Semesters', href: '/admin/study/semesters', icon: Database, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Subjects', href: '/admin/study/subjects', icon: Database, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Units', href: '/admin/study/units', icon: Database, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Resources', href: '/admin/study/resources', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Site Settings', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
    { name: 'Homepage', href: '/admin/homepage', icon: Home, roles: ['ADMIN'] },
    { name: 'Redirects', href: '/admin/redirects', icon: ArrowRightLeft, roles: ['ADMIN'] },
    { name: 'Users & Roles', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Protection Center', href: '/admin/protection', icon: ShieldCheck, roles: ['ADMIN'] },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History, roles: ['ADMIN'] },
    { name: 'AI Index', href: '/admin/ai', icon: Brain, roles: ['ADMIN', 'EDITOR'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const groups: { label: string; names: string[] }[] = [
    { label: 'Overview', names: ['Dashboard'] },
    { label: 'Requests', names: ['Consultations', 'Consult Lawyers'] },
    { label: 'Content', names: ['Semesters', 'Subjects', 'Units', 'Resources'] },
    { label: 'Publishing', names: ['Posts', 'Visual Pages', 'Events', 'FAQs', 'Gallery', 'Publications', 'Team'] },
    { label: 'Site Control', names: ['Site Settings', 'Homepage', 'Redirects'] },
    { label: 'System', names: ['Users & Roles', 'Protection Center', 'Audit Logs', 'AI Index'] },
  ];

  const renderNavItem = (item: NavItem) => {
    const isActive = item.href === '/admin'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        <span className="ml-auto flex items-center gap-2">
          {item.badge && item.badge > 0 ? (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500 text-white min-w-[20px] text-center">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
          {isActive ? (
            <m.span layoutId="admin-sidebar-active" className="w-1 h-5 rounded-full bg-accent" transition={springSnappy} />
          ) : null}
        </span>
      </Link>
    );
  };

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
      <AnimatePresence>
        {isMobileOpen && (
          <Backdrop
            key="admin-sidebar-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer — the CSS `translate` slides it in on mobile; on top
          of that, the open drawer can be swiped left to close. Motion's drag
          uses `transform`, so the two never fight. While closed on mobile it
          is `inert`, keeping off-screen links out of the tab order. */}
      <m.div
        drag={isMobileOpen && !isDesktop ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x < -80 || info.velocity.x < -500) setIsMobileOpen(false);
        }}
        inert={!isDesktop && !isMobileOpen}
        className={`admin-sidebar w-64 bg-slate-50 dark:bg-zinc-950 h-dvh flex flex-col border-r border-black/5 dark:border-white/5 shrink-0 fixed top-0 bottom-0 z-50 transition-[translate] duration-300 ease-in-out safe-area-top safe-area-bottom lg:translate-x-0 ${isMobileOpen ? 'translate-x-0 left-0' : '-translate-x-full left-0 lg:left-0'}`}>

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
          {groups.map((group) => {
            const items = filteredNavItems.filter(i => group.names.includes(i.name));
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="mb-6">
                <p className="px-3 text-[11px] font-bold text-text-muted dark:text-white/40 tracking-wider uppercase mb-2">{group.label}</p>
                <div className="space-y-0.5">{items.map(renderNavItem)}</div>
              </div>
            );
          })}
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
      </m.div>
    </>
  );
}
