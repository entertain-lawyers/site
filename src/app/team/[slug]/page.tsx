import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, Globe, ArrowLeft, Award, BookOpen, Briefcase, Languages, Trophy } from 'lucide-react';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let member = null;
  try {
    member = await prisma.teamMember.findUnique({
      where: { slug },
    });
  } catch (error: any) {
    if (error?.code !== 'P2021') throw error;
  }

  if (!member || !member.isPublished) notFound();

  return {
    title: `${member.name} - ${member.designation}`,
    description: member.shortBio || `Profile of ${member.name}, ${member.designation} at Entertain Lawyers.`,
    alternates: { canonical: `/team/${slug}` },
    openGraph: member.imageUrl ? {
      images: [{ url: member.imageUrl }],
    } : undefined,
  };
}

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const ListSection = ({ title, icon: Icon, content }: { title: string, icon: any, content: string | null }) => {
  if (!content?.trim()) return null;
  const items = content.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="py-8 first:pt-0 last:pb-0">
      <h3 className="text-lg font-bold text-navy dark:text-white flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-accent" />
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 text-text-secondary leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2.5 shrink-0"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default async function TeamProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let member = null;
  let dbError = false;

  try {
    member = await prisma.teamMember.findUnique({
      where: { slug },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      dbError = true;
    } else {
      throw error;
    }
  }

  if (dbError) {
    return (
      <div className="bg-slate-50 dark:bg-zinc-950 min-h-screen py-16 px-4">
        <div className="max-w-2xl mx-auto text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-sm border border-red-200 dark:border-red-900">
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Database Configuration Required</h3>
          <p className="text-red-500 dark:text-red-300">
            The <strong>TeamMember</strong> table does not exist in the database. Please ensure you are connected to a local development database and run <code>npx prisma db push</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!member || !member.isPublished) return notFound();

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/team" className="inline-flex items-center gap-2 text-accent hover:text-accent-dark font-bold mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Team Directory
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12">
            
            {/* Left Column: Photo & Contact */}
            <div className="md:col-span-4 lg:col-span-4 bg-slate-100 dark:bg-zinc-950 p-8 flex flex-col">
              <div className="aspect-[3/4] w-full relative rounded-2xl overflow-hidden shadow-inner bg-slate-200 dark:bg-zinc-800 mb-6">
                {member.imageUrl ? (
                  <Image src={member.imageUrl} alt={member.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" priority />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl font-bold text-text-muted">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mb-8 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-extrabold text-navy dark:text-white mb-1">{member.name}</h1>
                <p className="text-lg text-accent font-medium">{member.designation}</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider mb-2">Contact</h4>
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center gap-3 text-text-secondary hover:text-accent transition-colors break-all">
                    <Mail className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{member.email}</span>
                  </a>
                )}
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="flex items-center gap-3 text-text-secondary hover:text-accent transition-colors">
                    <Phone className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{member.phone}</span>
                  </a>
                )}

                {(member.facebookUrl || member.instagramUrl || member.linkedinUrl || member.websiteUrl) && (
                  <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10">
                    <h4 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider mb-3">Direct Connect</h4>
                    <div className="flex gap-4">
                      {member.facebookUrl && (
                        <a href={member.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-[#1877f2] transition-colors" title="Facebook">
                          <FacebookIcon className="w-6 h-6" />
                        </a>
                      )}
                      {member.instagramUrl && (
                        <a href={member.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-[#e1306c] transition-colors" title="Instagram">
                          <InstagramIcon className="w-6 h-6" />
                        </a>
                      )}
                      {member.linkedinUrl && (
                        <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-[#0A66C2] transition-colors" title="LinkedIn">
                          <LinkedinIcon className="w-6 h-6" />
                        </a>
                      )}
                      {member.websiteUrl && (
                        <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent transition-colors" title="Personal Website">
                          <Globe className="w-6 h-6" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Bio & Details */}
            <div className="md:col-span-8 lg:col-span-8 p-8 md:p-12 lg:p-16 flex flex-col">
              <div className="flex-1 divide-y divide-border dark:divide-white/10">
                {member.biography && (
                  <div className="pb-8 mb-2">
                    <div className="prose dark:prose-invert max-w-none text-text-secondary">
                      {member.biography.split(/\r?\n\r?\n/).map((paragraph, idx) => (
                        <p key={idx} className="leading-relaxed mb-4 last:mb-0 text-base md:text-[17px]">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {(member.practiceAreas || member.qualifications || member.experience || member.achievements || member.languages) && (
                  <div className="divide-y divide-border dark:divide-white/10">
                    <ListSection title="Academic Details" icon={Award} content={member.qualifications} />
                    <ListSection title="Experience" icon={BookOpen} content={member.experience} />
                    <ListSection title="Achievements" icon={Trophy} content={member.achievements} />
                    <ListSection title="Practice Areas" icon={Briefcase} content={member.practiceAreas} />
                    <ListSection title="Languages" icon={Languages} content={member.languages} />
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
