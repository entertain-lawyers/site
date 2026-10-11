import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConsultationManager from '@/components/admin/ConsultationManager';
import { MessageSquare, Users } from 'lucide-react';

export const metadata = { title: 'Consultations Intake | Admin Portal' };

export default async function AdminConsultationsPage() {
  const session = await auth();

  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/login?callbackUrl=/admin/consultations');
  }

  let items: any[] = [];
  let dbError = false;

  try {
    items = await prisma.consultationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      dbError = true;
    } else {
      console.error('Error fetching consultation requests:', error);
      dbError = true;
    }
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Client Registry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white">
            Consultation Inquiries
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Review incoming legal consultation inquiries, update status, and manage client follow-up.
          </p>
        </div>
      </div>

      <ConsultationManager initialItems={items} dbError={dbError} />
    </div>
  );
}
