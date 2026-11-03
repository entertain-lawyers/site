import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/');
  }

  // Check the role in the database rather than trusting the JWT: a user who
  // was demoted after signing in must lose admin access immediately.
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'EDITOR')) {
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
      <Suspense fallback={<div className="hidden lg:block w-64 h-full bg-white dark:bg-zinc-900 border-r border-black/5 dark:border-white/5" />}>
        <AdminSidebar userRole={dbUser.role} pendingConsultations={pendingConsultations} />
      </Suspense>

      {/* Main Content Area */}
      <div className="admin-main flex-1 min-w-0 w-full lg:ml-64 bg-transparent min-h-screen relative flex flex-col pt-16 lg:pt-0">
        <div className="w-full flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
