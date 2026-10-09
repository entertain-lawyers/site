import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, Globe, ArrowLeft, Award, BookOpen, Briefcase, Languages, Link2 } from 'lucide-react';
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

  if (!member || !member.isPublished) return {};

  return {
    title: `${member.name} - ${member.designation} | Entertain Lawyers`,
    description: member.shortBio || `Profile of ${member.name}, ${member.designation} at Entertain Lawyers.`,
    openGraph: member.imageUrl ? {
      images: [{ url: member.imageUrl }],
    } : undefined,
  };
}

const ListSection = ({ title, icon: Icon, content }: { title: string, icon: any, content: string | null }) => {
  if (!content?.trim()) return null;
  const items = content.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-navy dark:text-white flex items-center gap-2 mb-4 border-b border-black/10 dark:border-white/10 pb-2">
        <Icon className="w-5 h-5 text-accent" />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0"></span>
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
              <div className="aspect-[3/4] w-full relative rounded-2xl overflow-hidden shadow-inner bg-slate-200 dark:bg-zinc-800 mb-8">
                {member.imageUrl ? (
                  <Image src={member.imageUrl} alt={member.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" priority />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl font-bold text-text-muted">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
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

                <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10 flex gap-4">
                  {member.linkedinUrl && (
                    <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-[#0a66c2] transition-colors" title="LinkedIn">
                      <Link2 className="w-6 h-6" />
                    </a>
                  )}
                  {member.facebookUrl && (
                    <a href={member.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-[#1877f2] transition-colors" title="Facebook">
                      <Link2 className="w-6 h-6" />
                    </a>
                  )}
                  {member.websiteUrl && (
                    <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent transition-colors" title="Personal Website">
                      <Globe className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Bio & Details */}
            <div className="md:col-span-8 lg:col-span-8 p-8 md:p-12">
              <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-navy dark:text-white mb-2">{member.name}</h1>
                <p className="text-xl text-accent font-medium">{member.designation}</p>
              </div>

              {member.biography && (
                <div className="mb-12">
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-4 border-b border-black/10 dark:border-white/10 pb-2">Biography</h3>
                  <div className="prose dark:prose-invert max-w-none text-text-secondary space-y-4">
                    {member.biography.split(/\r?\n\r?\n/).map((paragraph, idx) => (
                      <p key={idx} className="leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <ListSection title="Practice Areas" icon={Briefcase} content={member.practiceAreas} />
                <ListSection title="Qualifications" icon={Award} content={member.qualifications} />
                <ListSection title="Experience" icon={BookOpen} content={member.experience} />
                <ListSection title="Languages" icon={Languages} content={member.languages} />
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
