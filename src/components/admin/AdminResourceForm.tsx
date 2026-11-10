'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive, CheckCircle2, ChevronLeft, ChevronRight, CircleDot, ExternalLink, Eye, FileText, Loader2,
  RotateCcw, TriangleAlert,
} from 'lucide-react';
import { ResourceType, ContentStatus } from '@prisma/client';
import { createResourceAction, deleteResourceAction, updateResourceAction } from '@/modules/admin/admin-resource.actions';
import { editorHtmlToArticleHtml } from '@/lib/editor-html';
import { confirmDocumentUpload, initiateDocumentUpload } from '@/modules/admin/admin-document.actions';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  loading: () => <div className="h-64 w-full rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-border animate-pulse" />
});
import AuthorSelect from '@/components/admin/AuthorSelect';
import FeaturedImagePanel from '@/components/admin/FeaturedImagePanel';
import type { FeaturedImageSelection } from '@/lib/wordpress-media';
import type { AuthorOption } from '@/lib/content-authors';
import { writePostPreviewDraft } from '@/lib/post-preview';
import { htmlToText } from '@/lib/html';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

const RESOURCE_TYPES = [
  { value: ResourceType.LAW_NOTE, label: 'Law Note' },
  { value: ResourceType.CASE_LAW, label: 'Case Law' },
  { value: ResourceType.OLD_QUESTION, label: 'Old Question' },
  { value: ResourceType.OTHER, label: 'Other' },
] as const;

type SemesterOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; semesterId: string };
type UnitOption = { id: string; name: string; subjectId: string };

export type EditableResource = {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  semesterId: string | null;
  subjectId: string | null;
  unitId: string | null;
  type: ResourceType;
  isPremium: boolean;
  priceAmount: number | null;
  status: ContentStatus;
  authorId: string | null;
  hasDocument: boolean;
  featuredImage?: string | null;
  featuredImageId?: number | null;
};

import { getInitialResourceAuthorId, getSubmittedResourceAuthorId } from './resource-form-author';
export { getInitialResourceAuthorId, getSubmittedResourceAuthorId };

const selectClass = 'w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed';
const groupDetailsClass = 'group rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50/60 dark:bg-zinc-950/60 open:bg-white dark:open:bg-zinc-900 transition-colors';
const groupSummaryClass = 'flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-navy dark:text-white [&::-webkit-details-marker]:hidden';
const groupBodyClass = 'space-y-4 border-t border-black/5 dark:border-white/5 px-4 py-4';

/** Status pill shared by the workspace header and the sidebar. */
export function ResourceStatusBadge({ status, archived }: { status?: ContentStatus | null; archived?: boolean }) {
  const label = archived ? 'Archived' : status === ContentStatus.PUBLISHED ? 'Published' : 'Draft';
  const styles = archived
    ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
    : status === ContentStatus.PUBLISHED
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles}`}>{label}</span>;
}

export function AdminResourceForm({
  semesters,
  subjects,
  units,
  canManageLawTypes = false,
  authors = [],
  authorMappingAvailable = true,
  defaultAuthorId = '',
  resource,
  initialType,
  uploadBlockedReason = null,
}: {
  semesters: SemesterOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  canManageLawTypes?: boolean;
  authors?: AuthorOption[];
  authorMappingAvailable?: boolean;
  defaultAuthorId?: string;
  resource?: EditableResource;
  initialType?: ResourceType;
  uploadBlockedReason?: string | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(resource);
  const [loading, setLoading] = useState(false);
  // Which submit button is saving, so only that one shows progress.
  const [savingAs, setSavingAs] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [error, setError] = useState('');
  const [lastSavedStatus, setLastSavedStatus] = useState<ContentStatus | null>(resource?.status ?? null);

  const availableTypes = canManageLawTypes
    ? RESOURCE_TYPES
    : RESOURCE_TYPES.filter((type) => type.value !== ResourceType.LAW_NOTE && type.value !== ResourceType.CASE_LAW);

  // Editing an existing resource loads its values; creating starts blank or with initialType.
  const initialTypeState = initialType ?? resource?.type ?? availableTypes[0].value;
  const [title, setTitle] = useState(resource?.title ?? '');
  const [description] = useState(resource?.description ?? '');
  const [semesterId, setSemesterId] = useState(resource?.semesterId ?? '');
  const [subjectId, setSubjectId] = useState(resource?.subjectId ?? '');
  // Editors cannot create law notes/case laws, so start on a type they can use.
  const [resourceType, setResourceType] = useState<ResourceType>(initialTypeState);
  const [unitId, setUnitId] = useState(resource?.unitId ?? '');
  const [isPremium, setIsPremium] = useState(resource?.isPremium ?? false);
  const [priceAmount, setPriceAmount] = useState(
    resource?.priceAmount ? String(resource.priceAmount / 100) : ''
  );
  const [authorUserId, setAuthorUserId] = useState(() =>
    getInitialResourceAuthorId({
      authorMappingAvailable,
      resourceAuthorId: resource?.authorId,
      isEdit,
      defaultAuthorId,
    })
  );

  const [featuredImage, setFeaturedImage] = useState<FeaturedImageSelection | null>(() => {
    if (!resource?.featuredImage) return null;
    return {
      id: resource.featuredImageId ?? 0,
      lang: 'en',
      url: resource.featuredImage,
      thumbnailUrl: resource.featuredImage,
      title: resource.title || 'Featured Image',
    };
  });

  // Success feedback is handed across the post-create navigation through
  // sessionStorage: the /new form cannot simply mutate its URL because the next
  // server action would be POSTed under the new path, and its response payload
  // (the /edit route tree) would then be applied as a navigation — remounting
  // this form and wiping plain client state. So after a successful create we
  // navigate to /edit for real (router.replace) and restore banner + chip from
  // this memo exactly once, when the new /edit mount carries the same resource.
  const [restoredSuccess] = useState<{ id: string; status: ContentStatus } | null>(() => {
    if (!resource) return null;
    try {
      const raw = sessionStorage.getItem('admin-resource-success');
      if (!raw) return null;
      const memo = JSON.parse(raw) as { id: string; status: ContentStatus; at: number };
      sessionStorage.removeItem('admin-resource-success');
      if (memo.id === resource.id && Date.now() - memo.at < 15_000) {
        return { id: memo.id, status: memo.status };
      }
    } catch {
      // Corrupt or inaccessible storage: fall back to no restored banner.
    }
    return null;
  });

  const [savedResource, setSavedResource] = useState<{ id: string; status: ContentStatus; url: string } | null>(() =>
    restoredSuccess
      ? { id: restoredSuccess.id, status: restoredSuccess.status, url: `/resources/${restoredSuccess.id}` }
      : null
  );

  // Mode selection: 'PDF' or 'NOTE'. An existing PDF keeps its document, and a
  // resource without a PDF is edited as a written note. Case laws default to NOTE.
  const [uploadMode, setUploadMode] = useState<'PDF' | 'NOTE'>(
    resource
      ? resource.hasDocument ? 'PDF' : 'NOTE'
      : initialTypeState === ResourceType.CASE_LAW ? 'NOTE' : 'PDF'
  );

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [content, setContent] = useState(resource?.content ?? '');

  // Filter subjects by selected semester
  const filteredSubjects = useMemo(
    () => (semesterId ? subjects.filter((s) => s.semesterId === semesterId) : []),
    [subjects, semesterId]
  );

  // Filter units by selected subject
  const filteredUnits = useMemo(
    () => units.filter((u) => u.subjectId === subjectId),
    [units, subjectId]
  );

  // ---- Unsaved-changes tracking -------------------------------------------
  // A serialisable snapshot of every editable field. The baseline is captured
  // on first render (and refreshed after each successful save); anything that
  // drifts from it marks the form dirty, which drives the header save-status
  // chip, the beforeunload guard and the "Back to Resources" confirmation.
  const snapshot = () => JSON.stringify({
    title,
    resourceType,
    semesterId,
    subjectId,
    unitId,
    isPremium,
    priceAmount,
    authorUserId,
    uploadMode,
    hasFile: Boolean(file),
    fileName: file?.name ?? null,
    content,
    featuredImage: featuredImage ? { id: featuredImage.id, url: featuredImage.url } : null,
  });
  const [baseline, setBaseline] = useState<string>(() => snapshot());
  const formSnapshot = snapshot();
  const dirty = formSnapshot !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Save status shown in the workspace header.
  const saveStatus: 'saving' | 'unsaved' | 'saved' | 'inprogress' =
    loading ? 'saving' : dirty ? 'unsaved' : savedResource ? 'saved' : 'inprogress';

  const listHref = resourceType === ResourceType.CASE_LAW ? '/admin/study/resources?type=CASE_LAW' : '/admin/study/resources';

  const handleBackNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave this page without saving?')) {
      event.preventDefault();
    }
  };

  // Preview the note exactly through the shared /preview route the posts
  // editor uses — same reading template, live updates, no server round-trip.
  const selectedAuthor = authors.find((a) => a.id === authorUserId);
  const handlePreview = () => {
    writePostPreviewDraft({
      title: title || 'Untitled Resource',
      content: editorHtmlToArticleHtml(content),
      type: RESOURCE_TYPES.find((t) => t.value === resourceType)?.label || 'Resource',
      featuredImage: featuredImage?.url ?? null,
      author: selectedAuthor
        ? {
            name: selectedAuthor.name,
            email: selectedAuthor.email,
            image: selectedAuthor.image,
            bio: selectedAuthor.bio,
            website: selectedAuthor.website,
            role: selectedAuthor.role,
          }
        : null,
      editorUrl: isEdit && resource ? `/admin/study/resources/${resource.id}/edit` : '/admin/study/resources/new',
    });
    window.open('/preview', 'el-resource-preview')?.focus();
  };

  const showValidationError = (message: string) => {
    setError(message);
    // Bring the message into view without stealing the editor caret.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // "Save as Draft" and "Create & Publish" both submit the form.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';

    if (uploadMode === 'PDF') {
      if (!isEdit) {
        if (!file) {
          showValidationError('Please select a PDF file');
          return;
        }
        if (file.type !== 'application/pdf') {
          showValidationError('Only PDF files are allowed');
          return;
        }
      }
    } else {
      // Quill's semantic HTML renders an empty editor as <p></p>, so
      // tag-strip instead of string-comparing (image-only notes still count).
      if (!htmlToText(content) && !/<img\b/i.test(content)) {
        showValidationError('Please write some content for the note');
        return;
      }
    }

    // Metadata selects live inside collapsible sidebar groups: native browser
    // validation cannot focus a hidden control, so validate here and surface
    // a readable message in the workspace banner instead.
    if (!semesterId) {
      showValidationError('Please select a semester.');
      return;
    }
    if (resourceType !== ResourceType.OLD_QUESTION && !subjectId) {
      showValidationError('Please select a subject for this resource.');
      return;
    }

    setLoading(true);
    setSavingAs(status);
    setError('');
    setSavedResource(null);

    // Track the created row so a failed PDF upload can remove it instead of
    // leaving an orphan that a retry would duplicate. Deliberately a local (not
    // the createdResourceId state) — this is only the *current attempt's* id.
    let createdIdForCleanup: string | null = null;
    const submittedAuthorUserId = getSubmittedResourceAuthorId({
      authorMappingAvailable,
      authorUserId,
    });

    try {
      if (isEdit && resource) {
        // Mounted on a real /edit route: the action request URL matches this
        // route tree, so the response reconciles in place (no remount) and the
        // success banner survives.
        const updateRes = await updateResourceAction({
          id: resource.id,
          title,
          description,
          subjectId: resourceType === ResourceType.OLD_QUESTION ? undefined : subjectId,
          semesterId: resourceType === ResourceType.OLD_QUESTION ? semesterId : undefined,
          isPremium,
          priceAmount: isPremium ? parseFloat(priceAmount) * 100 : undefined,
          type: resourceType,
          unitId: (resourceType === ResourceType.OLD_QUESTION ? undefined : unitId) || undefined,
          content: uploadMode === 'NOTE' ? editorHtmlToArticleHtml(content) : undefined,
          status: status as ContentStatus,
          authorUserId: submittedAuthorUserId,
          featuredImage: featuredImage?.url ?? null,
          featuredImageId: featuredImage?.id ?? null,
        });

        if (!updateRes.success) {
          throw new Error(updateRes.error || 'Failed to update resource');
        }

        if (uploadMode === 'PDF' && file) {
          const initRes = await initiateDocumentUpload({
            resourceId: resource.id,
            expectedSize: file.size,
            expectedMimeType: 'application/pdf',
          });

          if (!initRes.success) {
            throw new Error(initRes.error || 'Failed to initiate upload');
          }

          const uploadUrl = initRes.data.uploadUrl;

          let r2Response: Response;
          try {
            r2Response = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': 'application/pdf',
              },
            });
          } catch {
            throw new Error(
              process.env.NODE_ENV === 'development'
                ? 'Could not reach file storage at B2_ENDPOINT. If it points at a local mock (e.g. http://localhost:9000), make sure that server is running, then try again.'
                : 'Could not reach file storage. Check your connection and try again.'
            );
          }

          if (!r2Response.ok) {
            throw new Error(`Upload failed with status ${r2Response.status}`);
          }

          const confirmRes = await confirmDocumentUpload({
            resourceId: resource.id,
            uploadIntentId: initRes.data.uploadIntentId,
          });

          if (!confirmRes.success) {
            throw new Error(confirmRes.error || 'Uploaded file could not be verified');
          }
        }

        setSavedResource({
          id: resource.id,
          status: status as ContentStatus,
          url: `/resources/${resource.id}`,
        });
        setLastSavedStatus(status as ContentStatus);
        setBaseline(formSnapshot);
        setLoading(false);
        setSavingAs(null);
        router.refresh();
        return;
      }

      // 1. Create Resource
      const createRes = await createResourceAction({
        title,
        description,
        subjectId: resourceType === ResourceType.OLD_QUESTION ? undefined : subjectId,
        semesterId: resourceType === ResourceType.OLD_QUESTION ? semesterId : undefined,
        isPremium,
        priceAmount: isPremium ? parseFloat(priceAmount) * 100 : undefined,
        type: resourceType,
        unitId: (resourceType === ResourceType.OLD_QUESTION ? undefined : unitId) || undefined,
        // Quill writes one <p> per line; store real paragraphs, as /read renders them.
        content: uploadMode === 'NOTE' ? editorHtmlToArticleHtml(content) : undefined,
        status,
        authorUserId: submittedAuthorUserId,
        featuredImage: featuredImage?.url ?? null,
        featuredImageId: featuredImage?.id ?? null,
      });

      if (!createRes.success) {
        throw new Error(createRes.error || 'Failed to create resource');
      }

      const resourceId = createRes.data.resourceId;
      createdIdForCleanup = resourceId;

      // 2. If PDF mode, upload file
      if (uploadMode === 'PDF' && file) {
        const initRes = await initiateDocumentUpload({
          resourceId,
          expectedSize: file.size,
          expectedMimeType: 'application/pdf',
        });

        if (!initRes.success) {
          throw new Error(initRes.error || 'Failed to initiate upload');
        }

        const uploadUrl = initRes.data.uploadUrl;

        // A network-level failure (storage unreachable, CSP or CORS block)
        // rejects with a bare "Failed to fetch"; say what actually failed.
        let r2Response: Response;
        try {
          r2Response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': 'application/pdf',
            },
          });
        } catch {
          throw new Error(
            process.env.NODE_ENV === 'development'
              ? 'Could not reach file storage at B2_ENDPOINT. If it points at a local mock (e.g. http://localhost:9000), make sure that server is running, then try again.'
              : 'Could not reach file storage. Check your connection and try again.'
          );
        }

        if (!r2Response.ok) {
          throw new Error(`Upload failed with status ${r2Response.status}`);
        }

        const confirmRes = await confirmDocumentUpload({
          resourceId,
          uploadIntentId: initRes.data.uploadIntentId,
        });

        if (!confirmRes.success) {
          throw new Error(confirmRes.error || 'Uploaded file could not be verified');
        }
      }

      // Success. Navigate to the new resource's edit page for real — do NOT
      // just rewrite the URL under this component: the next server action
      // would be POSTed under the new path and its response (the /edit route
      // tree) applied as a navigation, remounting the form and destroying any
      // client state. The success banner/chip ride across the remount via the
      // sessionStorage memo initialized above.
      createdIdForCleanup = null;
      try {
        sessionStorage.setItem(
          'admin-resource-success',
          JSON.stringify({ id: resourceId, status, at: Date.now() })
        );
      } catch {
        // Storage unavailable (private mode): the /edit page simply opens
        // without restored success feedback.
      }
      router.replace(`/admin/study/resources/${resourceId}/edit`);
      setLoading(false);
      setSavingAs(null);
    } catch (err) {
      // If the resource row was created but the upload/confirm step failed,
      // delete the orphan so the user can retry without duplicates.
      if (createdIdForCleanup) {
        try {
          await deleteResourceAction({ id: createdIdForCleanup });
        } catch {
          // Best-effort cleanup; surface the original failure below.
        }
      }

      const message = err instanceof Error ? err.message : 'An error occurred during creation.';
      setError(message);
      setLoading(false);
      setSavingAs(null);
    }
  };

  // ---- Shared header pieces ---------------------------------------------------

  const saveStatusChip =
    saveStatus === 'saving' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Saving…
      </span>
    ) : saveStatus === 'unsaved' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" role="status">
        <CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> Unsaved changes
      </span>
    ) : saveStatus === 'saved' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> All changes saved
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-text-muted dark:bg-zinc-800 dark:text-zinc-400" role="status">
        <CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> Draft in progress
      </span>
    );

  // ---- Shared sidebar field blocks (used by the NOTE-mode sidebar) -----------

  const semesterField = (
    <div>
      <label htmlFor="resource-semester" className="block text-sm font-bold text-navy dark:text-white mb-2">Semester</label>
      <select
        id="resource-semester"
        value={semesterId}
        onChange={e => {
          setSemesterId(e.target.value);
          setSubjectId('');
          setUnitId('');
        }}
        className={selectClass}
      >
        <option value="">Select Semester</option>
        {semesters.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );

  const subjectField = (
    <div>
      <label htmlFor="resource-subject" className="block text-sm font-bold text-navy dark:text-white mb-2">Subject</label>
      <select
        id="resource-subject"
        value={subjectId}
        onChange={e => {
          setSubjectId(e.target.value);
          setUnitId('');
        }}
        disabled={!semesterId}
        className={selectClass}
      >
        <option value="">Select Subject</option>
        {filteredSubjects.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );

  const unitField = (
    <div>
      <label htmlFor="resource-unit" className="block text-sm font-bold text-navy dark:text-white mb-2">Unit (Optional)</label>
      <select
        id="resource-unit"
        value={unitId}
        onChange={e => setUnitId(e.target.value)}
        disabled={!subjectId}
        className={selectClass}
      >
        <option value="">Select Unit</option>
        {filteredUnits.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  );

  const typeField = (
    <div>
      <label htmlFor="resource-type" className="block text-sm font-bold text-navy dark:text-white mb-2">Resource Type</label>
      <select
        id="resource-type"
        value={resourceType}
        onChange={e => setResourceType(e.target.value as ResourceType)}
        className={selectClass}
      >
        {availableTypes.map(type => (
          <option key={type.value} value={type.value}>{type.label}</option>
        ))}
      </select>
      <p className="mt-2 text-xs text-text-secondary">Old Question resources are filed by semester; other types are filed by subject.</p>
    </div>
  );

  const authorField = (
    <div>
      <label htmlFor="author" className="block text-sm font-bold text-navy dark:text-white mb-2">Author</label>
      <AuthorSelect
        authors={authors}
        value={authorUserId}
        onChange={setAuthorUserId}
        disabled={!authorMappingAvailable}
        placeholder={!authorMappingAvailable ? 'Author assignment unavailable (migration pending)' : undefined}
        emptyMessage={
          !authorMappingAvailable
            ? 'Author assignment is temporarily unavailable because database migrations are pending.'
            : 'No eligible author accounts found.'
        }
        hint={
          !authorMappingAvailable
            ? 'Author assignment is disabled until database migration 20261101000000 is applied.'
            : 'Shown as the resource author. The creator is recorded separately.'
        }
      />
    </div>
  );

  const premiumField = (
    <div>
      <div className="flex items-center gap-3">
        <input
          id="isPremium"
          type="checkbox"
          checked={isPremium}
          onChange={e => setIsPremium(e.target.checked)}
          className="h-5 w-5 rounded border-black/20 text-accent focus:ring-accent"
        />
        <label htmlFor="isPremium" className="text-sm font-bold text-navy dark:text-white">
          Premium Resource
        </label>
      </div>

      {isPremium && (
        <div className="mt-4">
          <label htmlFor="resource-price" className="block text-sm font-bold text-navy dark:text-white mb-2">Price (NPR)</label>
          <input
            id="resource-price"
            type="number"
            min="0"
            step="1"
            required={isPremium}
            value={priceAmount}
            onChange={e => setPriceAmount(e.target.value)}
            className={selectClass}
          />
        </div>
      )}
    </div>
  );

  const featuredImageField = (
    <div>
      <label className="block text-sm font-bold text-navy dark:text-white mb-2">Featured Image</label>
      <p className="text-xs text-text-secondary mb-4">
        Upload or select an image from the media library to display on public listings and the resource header.
      </p>
      <FeaturedImagePanel
        lang="en"
        value={featuredImage}
        onChange={setFeaturedImage}
        uploadBlockedReason={uploadBlockedReason ?? null}
      />
    </div>
  );

  // ---- Header action buttons (single source of workflow actions) --------------

  const previewButton = uploadMode === 'NOTE' && (
    <button
      type="button"
      onClick={handlePreview}
      className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-bold text-navy dark:text-white hover:border-gold hover:text-gold transition-colors"
    >
      <Eye className="h-4 w-4" aria-hidden="true" /> Preview
    </button>
  );

  const viewLiveButton = isEdit && lastSavedStatus === ContentStatus.PUBLISHED && resource && (
    <a
      href={`/resources/${resource.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-bold text-navy dark:text-white hover:border-accent hover:text-accent transition-colors"
    >
      View Live
    </a>
  );

  // ---- Workspace body per mode ------------------------------------------------

  const modeSwitch = !isEdit && (
    <div className="flex flex-col gap-2 pt-6">
      <span id="resource-mode-label" className="text-xs font-bold uppercase tracking-wider text-text-muted">Choose how to add this resource</span>
      <div role="group" aria-labelledby="resource-mode-label" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setUploadMode('PDF')}
          aria-pressed={uploadMode === 'PDF'}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
            uploadMode === 'PDF'
              ? 'border-accent bg-accent text-white shadow-sm'
              : 'border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-text-muted hover:text-navy dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" /> Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('NOTE')}
          aria-pressed={uploadMode === 'NOTE'}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
            uploadMode === 'NOTE'
              ? 'border-accent bg-accent text-white shadow-sm'
              : 'border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-text-muted hover:text-navy dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" /> Write Note
        </button>
      </div>
      <p className="text-xs text-text-secondary">
        {uploadMode === 'PDF'
          ? 'Attach a study document as a downloadable PDF file. Switching to Write Note keeps any draft you have typed.'
          : 'Write the note directly in the editor with English or Nepali fonts. Switching to Upload PDF keeps your text in the editor.'}
      </p>
    </div>
  );

  const workspaceHeader = (
    <div className="resource-workspace-header mb-6 border-b border-black/5 dark:border-white/5 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href={listHref}
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-text-secondary hover:text-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back to Resources
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-navy dark:text-white sm:text-3xl">
            {isEdit ? 'Edit Resource' : 'New Resource'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ResourceStatusBadge status={lastSavedStatus ?? undefined} archived={lastSavedStatus === ContentStatus.ARCHIVED} />
            {saveStatusChip}
          </div>
        </div>
        <div className="resource-action-buttons flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {previewButton}
          {viewLiveButton}
          <button
            type="submit"
            name="status"
            value="DRAFT"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-bold text-navy dark:text-white hover:border-accent/50 hover:text-accent transition-colors disabled:opacity-50"
          >
            {savingAs === 'DRAFT' ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving Draft…</>) : 'Save as Draft'}
          </button>
          <MotionButton
            type="submit"
            name="status"
            value="PUBLISHED"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent shadow-sm bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90 transition-[background-color,border-color,color,box-shadow,opacity] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
          >
            {savingAs === 'PUBLISHED' ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</>) : isEdit ? 'Save & Publish' : 'Create & Publish'}
          </MotionButton>
        </div>
      </div>
      {modeSwitch}
    </div>
  );

  const successBanner = savedResource && (
    <Appear key="saved-success" className="mb-6">
      <div className="p-5 bg-green-50 text-green-900 rounded-2xl border border-green-200 dark:bg-green-950/40 dark:border-green-900/60 dark:text-green-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-navy dark:text-white text-base">
              {savedResource.status === 'PUBLISHED'
                ? `${resourceType === ResourceType.CASE_LAW ? 'Case Law' : 'Resource'} published successfully!`
                : `${resourceType === ResourceType.CASE_LAW ? 'Case Law' : 'Resource'} saved as draft!`}
            </p>
            <p className="text-sm text-text-secondary dark:text-zinc-300">
              {savedResource.status === 'PUBLISHED'
                ? 'Your resource is now live on the website.'
                : 'Your draft has been saved. You can continue editing or return to the list.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {savedResource.status === 'PUBLISHED' && (
            <a
              href={savedResource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm"
            >
              <span>View {resourceType === ResourceType.CASE_LAW ? 'Case Law' : 'Resource'}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Link
            href={listHref}
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-navy dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>
    </Appear>
  );

  const errorBanner = error && (
    <Appear key="error" className="mb-6" role="alert">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-medium">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{error}</p>
      </div>
    </Appear>
  );

  // NOTE-mode publication-status note (sidebar footer, informational only).
  const publicationStatusNote = (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 p-4 text-sm">
      <p className="mb-1 flex items-center gap-2 font-bold text-navy dark:text-white"><Archive className="h-4 w-4 text-text-muted" aria-hidden="true" /> Publication status</p>
      <p className="text-text-secondary">
        {lastSavedStatus === ContentStatus.PUBLISHED
          ? 'This resource is live. Edits made here go public when you press Save & Publish; use Save as Draft to keep changes private first.'
          : lastSavedStatus === ContentStatus.ARCHIVED
            ? 'This resource is archived and hidden from the study library. Republish it to make it visible again.'
            : 'This resource is a draft — only you and other admins can see it. Press Create & Publish to make it public.'}
      </p>
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      data-resource-scroll-mode={uploadMode === 'NOTE' ? 'document' : 'fill-height'}
      className={`resource-admin-form p-6 sm:p-8 flex flex-col flex-1 ${uploadMode === 'NOTE' ? '' : 'space-y-8'}`}
    >
      {workspaceHeader}

      <AnimatePresence initial={false}>
        {successBanner}
        {errorBanner}
      </AnimatePresence>

      {uploadMode === 'NOTE' ? (
        <>
        {/* NOTE mode (desktop): only the note canvas lives in the main column, so it
            fills the writing workspace instead of being squeezed by metadata. All
            metadata lives in an independently scrollable sidebar, mirroring the posts
            editor layout. Below lg everything stacks and the page scrolls. */}
        <div className="resource-note-layout flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
          {/* Left column: the writing canvas itself */}
          <div className="resource-note-canvas min-w-0">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Start writing the note — use Font Mode above to switch between English and Nepali typed fonts."
              scrollMode="document"
            />
          </div>

          {/* Right column: metadata, independently scrollable on desktop */}
          <div className="resource-metadata-sidebar w-full space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pr-1">
            <div className="flex flex-col gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 p-4">
              <span className="text-xs font-bold text-navy dark:text-white uppercase tracking-wider">Save & Publish</span>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  name="status"
                  value="DRAFT"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-bold text-navy dark:text-white hover:border-accent/50 hover:text-accent transition-colors disabled:opacity-50"
                >
                  {savingAs === 'DRAFT' ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving Draft…</>) : 'Save as Draft'}
                </button>
                <MotionButton
                  type="submit"
                  name="status"
                  value="PUBLISHED"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-transparent shadow-sm bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {savingAs === 'PUBLISHED' ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</>) : isEdit ? 'Save & Publish' : 'Create & Publish'}
                </MotionButton>
              </div>
            </div>

            <div>
              <label htmlFor="resource-title" className="block text-sm font-bold text-navy dark:text-white mb-2">Title</label>
              <input
                id="resource-title"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`${selectClass} bg-white dark:bg-zinc-950`}
              />
            </div>

            <details open className={groupDetailsClass}>
              <summary className={groupSummaryClass}>Classification <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
              <div className={groupBodyClass}>{typeField}</div>
            </details>

            <details open className={groupDetailsClass}>
              <summary className={groupSummaryClass}>Semester & Subject <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
              <div className={groupBodyClass}>
                {semesterField}
                {resourceType !== ResourceType.OLD_QUESTION && subjectField}
                {resourceType !== ResourceType.OLD_QUESTION && unitField}
              </div>
            </details>

            <details open className={groupDetailsClass}>
              <summary className={groupSummaryClass}>Access <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
              <div className={groupBodyClass}>{premiumField}</div>
            </details>

            <details open className={groupDetailsClass}>
              <summary className={groupSummaryClass}>Authorship <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
              <div className={groupBodyClass}>{authorField}</div>
            </details>

            <details open className={groupDetailsClass}>
              <summary className={groupSummaryClass}>Media <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
              <div className={groupBodyClass}>{featuredImageField}</div>
            </details>

            {publicationStatusNote}
          </div>
        </div>
        </>
      ) : (
        <>
        {/* PDF mode: original stacked layout, now under the shared workspace header */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="resource-title" className="block text-sm font-bold text-navy dark:text-white mb-2">Title</label>
              <input
                id="resource-title"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={selectClass}
              />
            </div>
            {authorField}
            {typeField}
            <div>
              <label htmlFor="resource-semester" className="block text-sm font-bold text-navy dark:text-white mb-2">Semester</label>
              <select
                id="resource-semester"
                required
                value={semesterId}
                onChange={e => {
                  setSemesterId(e.target.value);
                  setSubjectId('');
                  setUnitId('');
                }}
                className={selectClass}
              >
                <option value="">Select Semester</option>
                {semesters.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {resourceType !== ResourceType.OLD_QUESTION && (
              <>
                <div>
                  <label htmlFor="resource-subject" className="block text-sm font-bold text-navy dark:text-white mb-2">Subject</label>
                  <select
                    id="resource-subject"
                    required
                    value={subjectId}
                    onChange={e => {
                      setSubjectId(e.target.value);
                      setUnitId('');
                    }}
                    disabled={!semesterId}
                    className={selectClass}
                  >
                    <option value="">Select Subject</option>
                    {filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="resource-unit" className="block text-sm font-bold text-navy dark:text-white mb-2">Unit (Optional)</label>
                  <select
                    id="resource-unit"
                    value={unitId}
                    onChange={e => setUnitId(e.target.value)}
                    disabled={!subjectId}
                    className={selectClass}
                  >
                    <option value="">Select Unit</option>
                    {filteredUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-black/10 dark:border-white/10">
            {premiumField}
          </div>

          {/* Featured Image */}
          <div className="pt-6 border-t border-black/10 dark:border-white/10">
            {featuredImageField}
          </div>

          <div className="pt-6 border-t border-black/10 dark:border-white/10">
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">
              {isEdit ? 'PDF Document' : 'Upload PDF Document'}
            </label>
            {isEdit && (
              <p className="text-sm text-text-secondary mb-3">
                This resource&apos;s PDF document stays attached. You can optionally upload a new PDF below to replace it.
              </p>
            )}
            <label
              htmlFor="file-upload"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) {
                  if (droppedFile.type === 'application/pdf') {
                    setFile(droppedFile);
                    setError('');
                  } else {
                    setError('Only PDF files are allowed');
                  }
                }
              }}
              className={`mt-1 flex flex-col items-center justify-center cursor-pointer px-6 pt-6 pb-6 border-2 border-dashed rounded-2xl transition-colors ${
                isDragging
                  ? 'border-accent bg-accent/5 dark:bg-accent/10'
                  : 'border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="space-y-2 text-center pointer-events-none">
                <svg className="mx-auto h-12 w-12 text-accent/60" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-zinc-400 justify-center">
                  <span className="font-bold text-accent hover:text-accent-dark">
                    Upload a file
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">PDF up to 50MB</p>
              </div>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept="application/pdf"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  if (selectedFile && selectedFile.type !== 'application/pdf') {
                    setError('Only PDF files are allowed');
                    return;
                  }
                  setFile(selectedFile);
                  setError('');
                }}
              />
            </label>
            {file && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-3 shrink-0 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 underline"
                >
                  Remove
                </button>
              </div>
            )}
            {uploadBlockedReason && (
              <p className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> {uploadBlockedReason}
              </p>
            )}
          </div>

          {publicationStatusNote}
        </div>
        </>
      )}
    </form>
  );
}
