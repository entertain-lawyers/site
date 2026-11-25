/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, ArrowLeft, Award, BookOpen, Briefcase, Languages, Trophy } from 'lucide-react';
import { Metadata } from 'next';
import { cache } from 'react';
import { parseSocialLinks } from '@/lib/social-links';
import { DirectConnectButton } from '@/components/team/SocialPlatformIcon';

const getCachedTeamMember = cache(async (slug: string) => {
  try {
    const member = await prisma.teamMember.findUnique({
      where: { slug },
    });
    return { member, dbError: false };
  } catch (error: any) {
    if (error?.code === 'P2021') {
      return { member: null, dbError: true };
    }
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { member } = await getCachedTeamMember(slug);

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
  const { member, dbError } = await getCachedTeamMember(slug);

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

  const additionalLinks = parseSocialLinks(member.websiteUrl);

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
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={member.imageUrl.startsWith("/api/")}
                    preload
                  />
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

                {(member.facebookUrl || member.instagramUrl || member.linkedinUrl || additionalLinks.length > 0) && (
                  <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10 pb-2">
                    <h4 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider mb-3">Direct Connect</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {member.facebookUrl && (
                        <DirectConnectButton
                          platform="facebook"
                          url={member.facebookUrl}
                          label="Facebook"
                        />
                      )}
                      {member.instagramUrl && (
                        <DirectConnectButton
                          platform="instagram"
                          url={member.instagramUrl}
                          label="Instagram"
                        />
                      )}
                      {member.linkedinUrl && (
                        <DirectConnectButton
                          platform="linkedin"
                          url={member.linkedinUrl}
                          label="LinkedIn"
                        />
                      )}
                      {additionalLinks.map((link) => (
                        <DirectConnectButton
                          key={link.id}
                          platform={link.platform}
                          url={link.url}
                          label={link.label}
                        />
                      ))}
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
