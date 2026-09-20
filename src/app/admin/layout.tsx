import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background relative">
      <AdminSidebar userRole={session.user.role} />
      
      {/* Main Content Area */}
      <div className="flex-1 w-full lg:ml-64 bg-background min-h-[calc(100vh-4rem)] relative">
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
