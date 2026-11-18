import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { getLatestAnnouncement, DEFAULT_ANNOUNCEMENT } from '@/lib/announcements';
import { getAnnouncementHistory } from '@/modules/admin/admin-announcement.actions';
import AnnouncementForm from './AnnouncementForm';

export const metadata = { title: 'Announcement Popup | Admin' };

export default async function AdminAnnouncementsPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect('/admin');
  }

  const [latestAnnouncement, history] = await Promise.all([
    getLatestAnnouncement(),
    getAnnouncementHistory(),
  ]);

  const announcementToEdit = latestAnnouncement ?? DEFAULT_ANNOUNCEMENT;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent mb-3">
          Site Control
        </div>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">
          Announcement Popup
        </h1>
        <p className="mt-2 text-text-secondary font-medium max-w-3xl">
          Manage the popup modal displayed to visitors on the homepage. Edit title and message, toggle visibility,
          set scheduling dates, and preview in real-time.
        </p>
      </div>

      <AnnouncementForm initial={announcementToEdit} history={history} />
    </div>
  );
}
