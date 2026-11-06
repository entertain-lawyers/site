import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import { Metadata } from 'next';
import { Reveal } from '@/components/motion/primitives';

const FacebookIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.924 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
);

export const metadata: Metadata = {
  title: 'Our Team',
  description: 'Meet our team of experienced legal professionals and advocates.',
  alternates: { canonical: '/team' },
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
            {members.map((member, i) => (
              <Reveal index={i} lift key={member.id} className="group relative bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg dark:hover:shadow-black/40 transition-[box-shadow,border-color,background-color] duration-300">
                {/* Entire card clickable */}
                <Link
                  href={`/team/${member.slug}`}
                  className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="sr-only">View profile of {member.name}</span>
                </Link>
                  {/* Framed photo — white mat, ultra-subtle edge line for polish */}
                  <div className="p-3">
                    <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08] bg-slate-100 dark:bg-zinc-800">
                    {member.imageUrl ? (
                      <Image
                        src={member.imageUrl}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-text-muted">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {member.practiceAreas && (
                      <div className="absolute top-3 right-3 bg-white/85 dark:bg-zinc-900/85 backdrop-blur text-accent px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                        {member.practiceAreas.split(/[,\n]/)[0].trim()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pt-4 pb-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-navy dark:text-white mb-1 leading-tight">
                    <span className="group-hover:text-accent transition-colors">{member.name}</span>
                  </h3>
                  <p className="text-text-secondary dark:text-text-muted text-sm font-medium mb-3">{member.designation}</p>

                  {member.shortBio && (
                    <p className="text-text-secondary text-xs mb-4 line-clamp-2">
                      {member.shortBio}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 pt-3 border-t border-border">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="relative z-20 flex items-center gap-2 text-xs text-text-secondary hover:text-navy dark:hover:text-white transition-colors min-h-[24px]">
                        <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    )}
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="relative z-20 flex items-center gap-2 text-xs text-text-secondary hover:text-navy dark:hover:text-white transition-colors min-h-[24px]">
                        <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">{member.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Footer: social icons only — the whole card is clickable */}
                {(member.facebookUrl || member.linkedinUrl || member.instagramUrl) && (
                  <div className="px-5 pb-4 flex items-center gap-2.5">
                    {member.facebookUrl && (
                      <a
                        href={member.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on Facebook`}
                        className="relative z-20 w-7 h-7 flex items-center justify-center rounded-md bg-[#1877F2] text-white hover:bg-[#0e63ca] transition-colors"
                      >
                        <FacebookIcon />
                      </a>
                    )}
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on LinkedIn`}
                        className="relative z-20 w-7 h-7 flex items-center justify-center rounded-md bg-[#0A66C2] text-white hover:bg-[#0855a1] transition-colors"
                      >
                        <LinkedinIcon />
                      </a>
                    )}
                    {member.instagramUrl && (
                      <a
                        href={member.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on Instagram`}
                        className="relative z-20 w-7 h-7 flex items-center justify-center rounded-md text-white bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737] hover:opacity-90 hover:scale-105 transition-all"
                      >
                        <InstagramIcon />
                      </a>
                    )}
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
