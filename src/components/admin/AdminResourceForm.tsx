'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ResourceType } from '@prisma/client';
import { createResourceAction } from '@/modules/admin/admin-resource.actions';
import { confirmDocumentUpload, initiateDocumentUpload } from '@/modules/admin/admin-document.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';

const RESOURCE_TYPES = [
  { value: ResourceType.LAW_NOTE, label: 'Law Note' },
  { value: ResourceType.CASE_LAW, label: 'Case Law' },
  { value: ResourceType.OLD_QUESTION, label: 'Old Question' },
  { value: ResourceType.OTHER, label: 'Other' },
] as const;

type SemesterOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; semesterId: string };
type UnitOption = { id: string; name: string; subjectId: string };

export function AdminResourceForm({
  semesters,
  subjects,
  units,
}: {
  semesters: SemesterOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description] = useState(''); // Maybe optional now
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>(ResourceType.LAW_NOTE);
  const [unitId, setUnitId] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');

  // Mode selection: 'PDF' or 'NOTE'
  const [uploadMode, setUploadMode] = useState<'PDF' | 'NOTE'>('PDF');

  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadMode === 'PDF') {
      if (!file) {
        setError('Please select a PDF file');
        return;
      }
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
    } else {
      if (!content.trim() || content === '<p><br></p>') {
        setError('Please write some content for the note');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
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
        content: uploadMode === 'NOTE' ? content : undefined,
              });

      if (!createRes.success) {
        throw new Error(createRes.error || 'Failed to create resource');
      }

      const resourceId = createRes.data.resourceId;

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

        const r2Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': 'application/pdf',
          },
        });

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

      // Success
      router.push('/admin/study/resources');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during creation.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Upload Mode Toggle */}
      <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setUploadMode('PDF')}
          className={`px-4 sm:px-6 py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all ${
            uploadMode === 'PDF'
              ? 'bg-white dark:bg-zinc-700 text-navy dark:text-white shadow-sm'
              : 'text-text-muted hover:text-navy dark:hover:text-white'
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('NOTE')}
          className={`px-4 sm:px-6 py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all ${
            uploadMode === 'NOTE'
              ? 'bg-white dark:bg-zinc-700 text-navy dark:text-white shadow-sm'
              : 'text-text-muted hover:text-navy dark:hover:text-white'
          }`}
        >
          Write Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-navy dark:text-white mb-2">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-navy dark:text-white mb-2">Resource Type</label>
          <select
            value={resourceType}
            onChange={e => setResourceType(e.target.value as ResourceType)}
            className="w-full rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm"
          >
            {RESOURCE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-navy dark:text-white mb-2">Semester</label>
          <select
            required
            value={semesterId}
            onChange={e => {
              setSemesterId(e.target.value);
              setSubjectId('');
              setUnitId('');
            }}
            className="w-full rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm"
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
              <label className="block text-sm font-bold text-navy dark:text-white mb-2">Subject</label>
              <select
                required
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value);
                  setUnitId('');
                }}
                disabled={!semesterId}
                className="w-full rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm disabled:opacity-50"
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-navy dark:text-white mb-2">Unit (Optional)</label>
              <select
                value={unitId}
                onChange={e => setUnitId(e.target.value)}
                disabled={!subjectId}
                className="w-full rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm disabled:opacity-50"
              >
                <option value="">Select Unit</option>
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-bold text-navy dark:text-white mb-2">Featured Image URL (Optional)</label>
          <input
            type="url"
            value={featuredImage}
            onChange={e => setFeaturedImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-black/10 dark:border-white/10">
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
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Price (NPR)</label>
            <input
              type="number"
              min="0"
              step="1"
              required={isPremium}
              value={priceAmount}
              onChange={e => setPriceAmount(e.target.value)}
              className="w-full md:w-1/2 rounded-xl border border-black/10 px-4 py-3 bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm"
            />
          </div>
        )}
      </div>

      {uploadMode === 'PDF' ? (
        <div className="pt-6 border-t border-black/10 dark:border-white/10">
          <label className="block text-sm font-bold text-navy dark:text-white mb-4">Upload PDF Document</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-black/10 border-dashed rounded-2xl bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-accent hover:text-accent-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-accent">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 50MB</p>
            </div>
          </div>
          {file && <p className="mt-2 text-sm text-gray-600">Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
        </div>
      ) : (
        <div className="pt-6 border-t border-black/10 dark:border-white/10">
          <label className="block text-sm font-bold text-navy dark:text-white mb-4">Write Note Content</label>
          <RichTextEditor value={content} onChange={setContent} placeholder="Write the law note or case law details here..." />
        </div>
      )}

      <div className="pt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent/90 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
        >
          {loading ? 'Creating Resource...' : 'Create Resource'}
        </button>
      </div>
    </form>
  );
}
