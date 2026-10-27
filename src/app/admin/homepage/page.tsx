import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { getHomepageConfig } from '@/lib/site-settings';
import HomepageForm from './HomepageForm';

export const metadata = { title: 'Homepage | Admin' };

export default async function AdminHomepagePage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect('/admin');
  }

  const config = await getHomepageConfig();

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent mb-3">
          Site Control
        </div>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Homepage</h1>
        <p className="mt-2 text-text-secondary font-medium max-w-3xl">
          Edit the hero heading, tagline, call-to-action and announcement banner. Empty optional fields keep
          the current design exactly as it is.
        </p>
      </div>

      <HomepageForm initial={config} />
    </div>
  );
}
