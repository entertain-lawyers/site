import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { getSiteSettings } from '@/lib/site-settings';
import SiteSettingsForm from './SiteSettingsForm';

export const metadata = { title: 'Site Settings | Admin' };

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect('/admin');
  }

  const settings = await getSiteSettings();

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent mb-3">
          Site Control
        </div>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Site Settings</h1>
        <p className="mt-2 text-text-secondary font-medium max-w-3xl">
          Control the organisation name, contact details, social profiles and footer notice shown across the
          public site. Changes go live as soon as you save.
        </p>
      </div>

      <SiteSettingsForm initial={settings} />
    </div>
  );
}
