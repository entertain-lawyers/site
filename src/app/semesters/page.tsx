import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { GraduationCap, ChevronRight, BookOpen } from 'lucide-react';

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.semestersTitle} - Entertain Lawyers`,
    description: dict.semestersDesc,
  };
}

export const revalidate = 300;

export default async function SemestersPage() {
  const dict = await getDictionary();

  const allSemesters = await prisma.semester.findMany({
    orderBy: { order: 'asc' },
    include: {
      subjects: {
        include: {
          _count: {
            select: { resources: true },
          },
        },
      },
    },
  });

  const semesters = allSemesters
    .filter((s) => s.name.toLowerCase().includes('semester'))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-background min-h-screen pb-20 transition-colors duration-300">
      <div className="bg-surface border-b border-border relative overflow-hidden">
        {/* Subtle Background Pattern/Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/5 via-background to-transparent dark:from-accent/10 dark:via-background dark:to-transparent opacity-70 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-accent">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white tracking-tight">
                {dict.semestersTitle}
              </h1>
              <p className="text-lg text-text-secondary mt-2 max-w-2xl leading-relaxed">
                {dict.semestersDesc}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-20">
        {semesters.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-16 text-center shadow-soft max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-6 text-text-muted border border-border">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-navy dark:text-white mb-3 tracking-tight">{dict.noSemestersFound}</h3>
            <p className="text-text-secondary text-lg">{dict.checkBackLater}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {semesters.map((semester) => {
              const totalResources = semester.subjects.reduce(
                (sum, subject) => sum + (subject as any)._count.resources,
                0
              );
              return (
                <Link
                  key={semester.id}
                  href={`/semesters/${semester.id}`}
                  className="group flex flex-col bg-surface border border-border rounded-2xl hover:border-accent hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative"
                >
                  {/* Top Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/40 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="p-6 flex-grow flex flex-col relative z-10">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center text-navy font-extrabold border border-border group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/30 transition-colors text-lg">
                          {semester.order}
                        </div>
                        <h2 className="text-xl font-bold text-navy dark:text-white group-hover:text-accent transition-colors leading-tight">
                          {semester.name}
                        </h2>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {semester.subjects.slice(0, 4).map((subject) => (
                        <span
                          key={subject.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-alt border border-border text-text-secondary rounded-md"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                          {subject.name}
                        </span>
                      ))}
                      {semester.subjects.length > 4 && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-text-muted bg-surface-alt/50 border border-border/50 rounded-md">
                          +{semester.subjects.length - 4} more
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      <div className="flex items-center gap-4 text-sm text-text-secondary mb-2 font-medium">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-text-muted" />
                          {semester.subjects.length} {dict.subjects}
                        </span>
                        {totalResources > 0 && (
                          <span className="flex items-center gap-1.5 border-l border-border pl-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent/50"></span>
                            {totalResources} {dict.resources}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-surface-alt/50 border-t border-border flex justify-between items-center group-hover:bg-accent/5 transition-colors">
                    <span className="text-sm font-bold text-navy group-hover:text-accent transition-colors">
                      {dict.readMore || 'View Semester'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
