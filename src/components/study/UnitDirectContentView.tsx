'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ResourceType } from '@prisma/client';
import ArticleBody from '@/components/posts/ArticleBody';
import AuthorBioTrigger from '@/components/author/AuthorBioTrigger';
import { BookOpen, FileText, Lock, ExternalLink, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { CheckoutButtons } from '@/components/payments/CheckoutButtons';
import { resourceBodyStatus } from '@/lib/resource-status';
import CaseCategoryBadge from '@/components/study/CaseCategoryBadge';
import CaseLawCategoryBadge from '@/components/study/CaseLawCategoryBadge';
import { getCaseLawCategory } from '@/lib/case-category';
import SocialShareToolbar from '@/components/posts/SocialShareToolbar';
import Reactions from '@/components/posts/Reactions';
import Comments from '@/components/posts/Comments';

export interface UnitResourceData {
  id: string;
  title: string;
  type: ResourceType;
  metaTitle?: string | null;
  isPremium: boolean;
  priceAmount: number | null;
  currency: string;
  content: string | null;
  documentId: string | null;
  document?: {
    id: string;
    fileSize?: number | null;
    mimeType?: string | null;
  } | null;
  author?: {
    name?: string | null;
    image?: string | null;
    bio?: string | null;
    role?: string | null;
    website?: string | null;
    email?: string | null;
  } | null;
  createdBy?: {
    name?: string | null;
    image?: string | null;
    bio?: string | null;
    role?: string | null;
    website?: string | null;
    email?: string | null;
  } | null;
  updatedAt?: Date | string | null;
  canAccess: boolean;
}

interface UnitDirectContentViewProps {
  unitName: string;
  unitTitle?: string | null;
  subjectName?: string;
  semesterName?: string;
  resources: UnitResourceData[];
  isAuthenticated: boolean;
  loginUrl: string;
}

export default function UnitDirectContentView({
  unitName,
  unitTitle,
  subjectName,
  semesterName,
  resources,
  isAuthenticated,
  loginUrl,
}: UnitDirectContentViewProps) {
  const [activeResourceId, setActiveResourceId] = useState<string>(
    resources[0]?.id || ''
  );

  const activeResource =
    resources.find((r) => r.id === activeResourceId) || resources[0];

  // Empty state if unit has no resources
  if (!resources || resources.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 sm:p-16 text-center shadow-soft flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-6 text-text-muted shadow-sm">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-navy dark:text-white mb-2 tracking-tight">
          No Notes Published for {unitName}
        </h3>
        <p className="text-text-secondary max-w-md mx-auto text-sm leading-relaxed mb-6">
          Study materials and curriculum notes for {unitName} are currently being compiled by our editorial team. Please check back soon or explore other units.
        </p>
      </div>
    );
  }

  const authorUser = activeResource.author ?? activeResource.createdBy;
  const authorObj = {
    name: authorUser?.name || 'Entertain Lawyers',
    image: authorUser?.image || null,
    bio: authorUser?.bio || 'Comprehensive law notes and academic legal materials.',
    role: authorUser?.role || 'Academic Contributor',
    website: authorUser?.website || null,
    email: authorUser?.email || null,
  };

  const status = resourceBodyStatus(activeResource);

  return (
    <div className="space-y-6" data-testid="unit-direct-content-view">
      {/* Unit Context & Resource Switcher (if multiple) */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-1 flex-wrap">
              <Layers className="w-3.5 h-3.5 text-accent" />
              {semesterName && <span>{semesterName} •</span>}
              <span>{unitName}</span>
              {unitTitle && <span>— {unitTitle}</span>}
              {subjectName && <span>• {subjectName}</span>}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-navy dark:text-white tracking-tight">
              {activeResource.title}
            </h2>
            {(activeResource.type === ResourceType.CASE_LAW || Boolean(getCaseLawCategory(activeResource))) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <CaseCategoryBadge category={activeResource.metaTitle} size="sm" />
                {getCaseLawCategory(activeResource) && (
                  <CaseLawCategoryBadge category={getCaseLawCategory(activeResource)!} size="sm" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeResource.isPremium ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-gold/10 text-gold-dark border border-gold/30 tracking-wider uppercase">
                <Lock className="w-3 h-3" />
                Premium (Rs. {(activeResource.priceAmount || 0) / 100})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800/40 tracking-wider uppercase">
                <CheckCircle2 className="w-3 h-3" />
                Free Material
              </span>
            )}

            {activeResource.canAccess && (
              <Link
                href={`/read/${activeResource.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                title="Open fullscreen reader"
                {...(activeResource.type === 'OLD_QUESTION' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span>Fullscreen Reader</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Multiple resources in unit switcher */}
        {resources.length > 1 && (
          <div className="mt-4 pt-2">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Unit Materials ({resources.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {resources.map((r, idx) => {
                const isActive = r.id === activeResource.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveResourceId(r.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-navy text-white dark:bg-accent dark:text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-text-secondary hover:text-navy dark:hover:text-white'
                    }`}
                  >
                    <span>Part {idx + 1}: {r.title}</span>
                    {r.isPremium && <Lock className="w-3 h-3 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <AuthorBioTrigger author={authorObj} size="xs" showName />
          {activeResource.updatedAt && (
            <span>
              Updated {new Date(activeResource.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-soft">
        {!isAuthenticated ? (
          /* Sign-in prompt */
          <div className="py-12 px-4 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">
              Sign In to Read Material
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              This study note is part of the curriculum. Please sign in to your account to read the full material.
            </p>
            <Link
              href={loginUrl}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-colors shadow-sm"
            >
              Sign In to Continue
            </Link>
          </div>
        ) : !activeResource.canAccess ? (
          /* Premium paywall gate */
          <div className="py-12 px-4 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-gold/15 text-gold-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white mb-2">
              Premium Study Resource
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Unlock complete access to this unit note and all accompanying legal materials.
            </p>
            {activeResource.priceAmount && (
              <div className="mb-6">
                <CheckoutButtons
                  resourceId={activeResource.id}
                  priceAmount={activeResource.priceAmount}
                  currency={activeResource.currency || 'NPR'}
                />
              </div>
            )}
          </div>
        ) : status === 'WRITTEN' && activeResource.content ? (
          /* Written Note rendering via ArticleBody */
          <div className="space-y-8">
            <ArticleBody
              html={activeResource.content}
              toc={true}
              boxed
              belowToc={<SocialShareToolbar title={activeResource.title} labels />}
            />

            <Reactions
              postId={activeResource.id}
              postType={activeResource.type === 'CASE_LAW' ? 'CASELAW' : 'NOTES'}
              title={activeResource.type === 'CASE_LAW' ? 'How did this case law make you feel?' : 'How did this note make you feel?'}
            />

            <Comments
              postId={activeResource.id}
              postType={activeResource.type === 'CASE_LAW' ? 'CASELAW' : 'NOTES'}
              variant="study"
            />
          </div>
        ) : status === 'UPLOADED' && activeResource.document ? (
          /* Uploaded PDF view/action */
          <div className="py-10 px-4 text-center max-w-lg mx-auto bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-border">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-800/40">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy dark:text-white mb-1">
              {activeResource.title}
            </h3>
            <p className="text-xs text-text-muted mb-6">
              PDF Document {activeResource.document.fileSize ? `• ${(activeResource.document.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
            </p>
            <Link
              href={`/read/${activeResource.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-all shadow-md hover:-translate-y-0.5"
              {...(activeResource.type === 'OLD_QUESTION' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Document Now</span>
            </Link>
          </div>
        ) : (
          /* Empty content state */
          <div className="py-12 px-4 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/40">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-navy dark:text-white mb-2">
              Content Being Finalized
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              The written notes and documents for this section are being prepared. Check back shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
