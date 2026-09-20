'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Database, Users, Settings, LogOut } from 'lucide-react';

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Posts (News/Blogs)', href: '/admin/posts', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { name: 'Study Resources', href: '/admin/resources', icon: Database, roles: ['ADMIN'] },
    { name: 'Users & Roles', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="w-64 bg-navy dark:bg-zinc-900 min-h-[calc(100vh-4rem)] flex flex-col border-r border-white/10 shrink-0 hidden lg:flex fixed z-10">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          {userRole === 'ADMIN' ? 'Admin Portal' : 'Editor Portal'}
        </h2>
        <p className="text-white/50 text-sm mt-1">Manage platform content</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                isActive 
                  ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-white/70 hover:bg-red-500/20 hover:text-red-400">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
