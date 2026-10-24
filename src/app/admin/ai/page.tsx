import { prisma } from '@/lib/prisma';
import { SITE_KNOWLEDGE } from '@/lib/ai/site-knowledge';
import RebuildIndexClient from './RebuildIndexClient';
import { Brain, BookOpen, Users, HelpCircle, FileText, Layers, CreditCard } from 'lucide-react';

export const metadata = { title: 'AI Knowledge Index | Admin' };
export const dynamic = 'force-dynamic';

/**
 * Admin control room for Kanun Saathi's knowledge index.
 * Shows what is currently embedded and lets an admin (re)build the index.
 */
export default async function AdminAiPage() {
  let embeddingRows: { source: string; count: number }[] = [];
  let embeddingTotal = 0;
  let teamCount = 0;
  let faqCount = 0;
  let postCount = 0;
  let resourceCount = 0;
  let planCount = 0;
  let semesterCount = 0;
  let dbError: string | null = null;

  try {
    const [bySource, team, faqs, posts, resources, plans, semesters] = await Promise.all([
      prisma.$queryRaw<{ source: string; count: number }[]>`
        SELECT "source", count(*)::int AS count FROM "AIEmbedding" GROUP BY "source" ORDER BY count DESC
      `,
      prisma.teamMember.count({ where: { isPublished: true } }),
      prisma.fAQ.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.resource.count({ where: { status: 'PUBLISHED' } }),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.semester.count(),
    ]);
    embeddingRows = bySource;
    embeddingTotal = bySource.reduce((sum, row) => sum + Number(row.count), 0);
    teamCount = team;
    faqCount = faqs;
    postCount = posts;
    resourceCount = resources;
    planCount = plans;
    semesterCount = semesters;
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Could not read the knowledge index.';
  }

  const sourceLabels: Record<string, string> = {
    wp: 'WordPress posts',
    site: 'Site knowledge',
    team: 'Team profiles',
    faq: 'FAQs',
    plan: 'Plans',
    semester: 'Semesters',
    resource: 'Study resources',
    post: 'CMS posts',
    publication: 'Publications',
    event: 'Events',
  };

  const stats = [
    { label: 'Site knowledge docs', value: SITE_KNOWLEDGE.length, icon: BookOpen },
    { label: 'Team profiles', value: teamCount, icon: Users },
    { label: 'FAQs', value: faqCount, icon: HelpCircle },
    { label: 'Study resources', value: resourceCount, icon: Layers },
    { label: 'Semesters', value: semesterCount, icon: FileText },
    { label: 'CMS posts', value: postCount, icon: FileText },
    { label: 'Active plans', value: planCount, icon: CreditCard },
  ];

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent mb-3">
          <Brain className="w-4 h-4" />
          Kanun Saathi
        </div>
        <h1 className="text-3xl font-extrabold text-navy dark:text-white">AI Knowledge Index</h1>
        <p className="text-text-secondary mt-2 max-w-3xl">
          Kanun Saathi answers only from this index. Team profiles, contact details, FAQs, pricing
          and site navigation are included alongside study material and posts — so questions like
          &ldquo;Who is Ram Babu Das?&rdquo; return the full profile, and &ldquo;How do I contact
          you?&rdquo; returns the correct phone, email and address.
        </p>
      </div>

      {dbError && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
          Could not read the vector table: {dbError}. You can still run a rebuild — the table is
          created automatically.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl p-4"
          >
            <stat.icon className="w-4 h-4 text-accent mb-2" />
            <p className="text-2xl font-black text-navy dark:text-white">{stat.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <RebuildIndexClient />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-navy dark:text-white mb-3">What is indexed</h2>
          {embeddingTotal === 0 ? (
            <p className="text-sm text-text-secondary">
              The index is empty. Click <strong>Update index</strong> above to train the assistant.
            </p>
          ) : (
            <ul className="space-y-2">
              {embeddingRows.map((row) => (
                <li key={row.source} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-secondary">{sourceLabels[row.source] ?? row.source}</span>
                  <span className="font-black text-navy dark:text-white">{row.count}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 border-t border-border dark:border-white/10 pt-2 mt-2 text-sm">
                <span className="font-bold text-navy dark:text-white">Total vectors</span>
                <span className="font-black text-accent">{embeddingTotal}</span>
              </li>
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-navy dark:text-white mb-3">How answers are produced</h2>
          <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
            <li>
              <strong>Deterministic facts</strong> — team profiles, contact, services, pricing and
              navigation come straight from the database and canonical site knowledge (no AI tokens,
              no hallucinated details).
            </li>
            <li>
              <strong>Hybrid retrieval</strong> — the question is embedded and combined with exact
              title/name matching to find the nearest site content.
            </li>
            <li>
              <strong>Grounded answer</strong> — the LLM may only use retrieved content and cites the
              matching page URLs.
            </li>
            <li>
              <strong>Graceful fallback</strong> — with no index or no AI quota, the assistant still
              answers site basics and points legal questions to a consultation.
            </li>
          </ol>
          <p className="text-xs text-text-muted mt-4">
            New team member or FAQ? It is answered immediately from the database. Run an index update
            so it can also be retrieved semantically.
          </p>
        </div>
      </div>
    </div>
  );
}
