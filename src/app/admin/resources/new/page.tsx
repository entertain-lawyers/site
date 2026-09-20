import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminResourceForm } from '@/components/admin/AdminResourceForm';

export default async function NewResourcePage() {
  const session = await auth();
  
  if (session?.user?.role !== 'ADMIN') {
    redirect('/');
  }

  const subjects = await prisma.subject.findMany({
    include: { semester: true },
    orderBy: { name: 'asc' }
  });

  const units = await prisma.unit.findMany({
    orderBy: { order: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Add New Resource</h1>
        <p className="mt-2 text-gray-500">Create a new resource and upload its PDF document.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-10">
        <AdminResourceForm subjects={subjects} units={units} />
      </div>
    </div>
  );
}
