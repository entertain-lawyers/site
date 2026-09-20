'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createResourceAction } from '@/modules/admin/admin-resource.actions';
import { initiateDocumentUpload, confirmDocumentUpload } from '@/modules/admin/admin-document.actions';

const RESOURCE_TYPES = [
  { value: 'LAW_NOTE', label: 'Law Note' },
  { value: 'CASE_LAW', label: 'Case Law' },
  { value: 'OLD_QUESTION', label: 'Old Question' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function AdminResourceForm({ subjects, units }: { subjects: any[]; units: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [resourceType, setResourceType] = useState('LAW_NOTE');
  const [unitId, setUnitId] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Filter units by selected subject
  const filteredUnits = useMemo(
    () => units.filter((u: any) => u.subjectId === subjectId),
    [units, subjectId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create Resource
      setStep(1);
      const createRes = await createResourceAction({
        title,
        description,
        subjectId,
        isPremium,
        priceAmount: isPremium ? parseFloat(priceAmount) * 100 : undefined,
        type: resourceType as any,
        unitId: unitId || undefined,
      });

      if (!createRes.success || !createRes.data) {
        throw new Error((createRes as any).error || 'Failed to create resource');
      }

      const resourceId = (createRes.data as any).resourceId;

      // 2. Initiate Upload
      setStep(2);
      const initRes = await initiateDocumentUpload({
        resourceId,
        expectedSize: file.size,
      });

      if (!initRes.success || !initRes.data) {
        throw new Error((initRes as any).error || 'Failed to initiate upload');
      }

      // 3. Upload to R2
      setStep(3);
      const uploadIntentId = initRes.data.uploadIntentId;
      const uploadUrl = initRes.data.uploadUrl;

      const r2Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!r2Response.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // 4. Confirm Upload
      setStep(4);
      const confirmRes = await confirmDocumentUpload({
        resourceId,
        uploadIntentId,
      });

      if (!confirmRes.success) {
        throw new Error((confirmRes as any).error || 'Failed to confirm upload');
      }

      // Success!
      router.push('/admin');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
          placeholder="e.g. Contract Law Notes - Unit 1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
          >
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject &amp; Semester</label>
          <select
            required
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setUnitId(''); }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
          >
            <option value="">Select a subject...</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.semester?.name} - {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredUnits.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit (Optional)</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
          >
            <option value="">No unit selected</option>
            {filteredUnits.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.title ? ` — ${u.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="isPremium"
          checked={isPremium}
          onChange={(e) => setIsPremium(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isPremium" className="text-sm font-medium text-gray-700">
          This is a Premium Resource
        </label>
      </div>

      {isPremium && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (NPR)</label>
          <input
            type="number"
            required={isPremium}
            min="10"
            step="0.01"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-gray-900"
            placeholder="e.g. 500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PDF Document</label>
        <input
          type="file"
          required
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-2"
        />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <span>
              {step === 1 && 'Creating resource...'}
              {step === 2 && 'Requesting upload URL...'}
              {step === 3 && 'Uploading to secure storage...'}
              {step === 4 && 'Confirming upload...'}
            </span>
          ) : (
            'Create Resource & Upload'
          )}
        </button>
      </div>
    </form>
  );
}
