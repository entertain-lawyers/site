import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/lib/i18n';
import { BookOpen, ChevronRight, Lock, Library, Clock } from 'lucide-react';

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.resources} - Entertain Lawyers`,
    description: 'Browse all available study resources, law notes, old questions, and case laws.',
  };
}

export const revalidate = 60;

export default async function ResourcesPage() {
  const dict = await getDictionary();
  const resources = await prisma.resource.findMany({
    orderBy: { id: 'desc' },
    include: {
      subject: {
        include: {
          semester: true,
        },
      },
    },
  });

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-accent">
              <Library className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-navy dark:text-white tracking-tight">{dict.resources}</h1>
              <p className="text-lg text-text-secondary mt-1">{dict.studyMaterialsDesc}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => {
              const subjectName = (resource as any).subject?.name || dict.subject;
              const semesterName = (resource as any).subject?.semester?.name || dict.semester;
              
              return (
                <Link 
                  key={resource.id} 
                  href={`/resources/${resource.id}`}
                  className="group flex flex-col justify-between h-full p-6 bg-surface border border-border rounded-2xl hover:border-accent hover:shadow-soft transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-alt rounded-md text-xs font-semibold text-text-secondary border border-border">
                      <Clock className="w-3.5 h-3.5" />
                      {semesterName}
                    </span>
                    {resource.isPremium ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-gold/10 text-gold-dark border border-gold/20">
                        <Lock className="w-3 h-3" />
                        {dict.premium}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        {dict.free}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-lg font-bold text-navy dark:text-white group-hover:text-accent transition-colors mb-3 line-clamp-2">
                    {resource.title}
                  </h2>
                  
                  <div className="mt-auto space-y-4">
                    <div className="flex items-start gap-2 text-sm text-text-secondary">
                      <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-muted" />
                      <span className="line-clamp-1">{subjectName}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-border flex justify-between items-center group-hover:border-accent/30 transition-colors">
                      <span className="text-sm font-bold text-accent">
                        {dict.readMore || 'Read More'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-16 text-center shadow-sm max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-5 text-text-muted">
              <Library className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">{dict.noResourcesFound}</h3>
            <p className="text-text-secondary text-base">{dict.resourcesComingSoon}</p>
          </div>
        )}
      </main>
    </div>
  );
}
