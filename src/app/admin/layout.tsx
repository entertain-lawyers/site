import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  // Workload signal for the sidebar badge — consultation requests awaiting
  // first contact (status NEW). Cheap single aggregate.
  let pendingConsultations = 0;
  try {
    pendingConsultations = await prisma.consultationRequest.count({ where: { status: 'NEW' } });
  } catch {
    // Table may not exist in stale dev databases — admin pages still function.
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 relative selection:bg-accent/30">
      <AdminSidebar userRole={session?.user?.role || 'ADMIN'} pendingConsultations={pendingConsultations} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 w-full lg:ml-64 bg-transparent min-h-screen relative flex flex-col pt-16 lg:pt-0">
        <main className="w-full flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
