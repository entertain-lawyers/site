import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Team | Entertain Lawyers',
  description: 'Meet our team of experienced legal professionals and advocates.',
};

export default async function TeamDirectoryPage() {
  let members: any[] = [];
  let dbError = false;

  try {
    members = await prisma.teamMember.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      dbError = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-navy dark:text-white tracking-tight">Our Team</h1>
          <p className="mt-4 text-xl text-text-secondary max-w-3xl mx-auto">
            Meet the experienced professionals dedicated to providing exceptional legal services and strategic counsel.
          </p>
        </div>

        {dbError ? (
          <div className="text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-sm border border-red-200 dark:border-red-900">
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Database Configuration Required</h3>
            <p className="text-red-500 dark:text-red-300 max-w-2xl mx-auto">
              The <strong>TeamMember</strong> table does not exist in the database. Please ensure you are connected to a local development database and run <code>npx prisma db push</code>.
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
            <h3 className="text-2xl font-bold text-navy dark:text-white mb-2">Team Directory Empty</h3>
            <p className="text-text-secondary">Our team profiles are currently being updated. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <div key={member.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden group hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="aspect-square w-full relative bg-slate-100 dark:bg-zinc-800">
                  {member.imageUrl ? (
                    <Image
                      src={member.imageUrl}
                      alt={member.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-text-muted">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {member.practiceAreas && (
                    <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur text-accent px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      {member.practiceAreas.split(/[,\n]/)[0].trim()}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-1 leading-tight">
                    <Link href={`/team/${member.slug}`} className="hover:text-accent transition-colors">
                      {member.name}
                    </Link>
                  </h3>
                  <p className="text-accent text-sm font-medium mb-3">{member.designation}</p>

                  {member.shortBio && (
                    <p className="text-text-secondary text-xs mb-4 line-clamp-2">
                      {member.shortBio}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 pt-3 border-t border-black/5 dark:border-white/5">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-text-secondary hover:text-navy dark:hover:text-white transition-colors">
                        <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    )}
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs text-text-secondary hover:text-navy dark:hover:text-white transition-colors">
                        <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">{member.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-950/50 border-t border-black/5 dark:border-white/5">
                  <Link
                    href={`/team/${member.slug}`}
                    className="flex items-center justify-between text-xs font-bold text-navy dark:text-white hover:text-accent transition-colors uppercase tracking-wider"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
