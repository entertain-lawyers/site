'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeamMemberAction, updateTeamMemberAction } from '@/modules/admin/admin-team.actions';
import ImageUpload from '@/components/admin/ImageUpload';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface TeamMemberFormClientProps {
  member?: any;
}

export default function TeamMemberFormClient({ member }: TeamMemberFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(member?.name || '');
  const [designation, setDesignation] = useState(member?.designation || '');
  const [slug, setSlug] = useState(member?.slug || '');
  const [shortBio, setShortBio] = useState(member?.shortBio || '');
  const [biography, setBiography] = useState(member?.biography || '');
  const [imageUrl, setImageUrl] = useState(member?.imageUrl || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [linkedinUrl, setLinkedinUrl] = useState(member?.linkedinUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(member?.facebookUrl || '');
  const [websiteUrl, setWebsiteUrl] = useState(member?.websiteUrl || '');
  const [qualifications, setQualifications] = useState(member?.qualifications || '');
  const [experience, setExperience] = useState(member?.experience || '');
  const [practiceAreas, setPracticeAreas] = useState(member?.practiceAreas || '');
  const [languages, setLanguages] = useState(member?.languages || '');
  const [displayOrder, setDisplayOrder] = useState(member?.displayOrder || 0);
  const [isPublished, setIsPublished] = useState(member?.isPublished || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      name,
      designation,
      slug,
      shortBio,
      biography,
      imageUrl,
      phone,
      email,
      linkedinUrl,
      facebookUrl,
      websiteUrl,
      qualifications,
      experience,
      practiceAreas,
      languages,
      displayOrder: Number(displayOrder),
      isPublished,
    };

    let res;
    if (member?.id) {
      res = await updateTeamMemberAction({ id: member.id, ...payload });
    } else {
      res = await createTeamMemberAction(payload);
    }

    if (res?.success) {
      router.push('/admin/team');
      router.refresh();
    } else {
      setError((res as any)?.error || 'An error occurred while saving.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border border-black/10 dark:border-white/10">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6 md:col-span-1">
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Full Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="e.g. Ram Bahadur Thapa" />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Designation *</label>
            <input required value={designation} onChange={e => setDesignation(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="e.g. Senior Advocate" />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Custom URL Slug (Optional)</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="e.g. ram-bahadur-thapa" />
            <p className="text-xs text-text-muted mt-1">Leave empty to auto-generate from name.</p>
          </div>
        </div>

        <div className="md:col-span-1">
          <ImageUpload value={imageUrl} onChange={setImageUrl} type="TEAM" label="Profile Photograph" />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-navy dark:text-white border-b pb-2">Biography</h3>
        <div>
          <label className="block text-sm font-bold text-navy dark:text-white mb-2">Short Introduction</label>
          <input value={shortBio} onChange={e => setShortBio(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="A one-line summary for the directory card..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-navy dark:text-white mb-2">Detailed Biography</label>
          <textarea value={biography} onChange={e => setBiography(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10 min-h-[150px]" placeholder="Full professional biography. Line breaks are preserved." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-navy dark:text-white border-b pb-2">Professional Details</h3>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Practice Areas (comma or newline separated)</label>
            <textarea value={practiceAreas} onChange={e => setPracticeAreas(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10 min-h-[80px]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Qualifications (comma or newline separated)</label>
            <textarea value={qualifications} onChange={e => setQualifications(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10 min-h-[80px]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Experience (comma or newline separated)</label>
            <textarea value={experience} onChange={e => setExperience(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10 min-h-[80px]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Languages</label>
            <input value={languages} onChange={e => setLanguages(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="e.g. English, Nepali, Hindi" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-navy dark:text-white border-b pb-2">Contact & Social</h3>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="lawyer@example.com" />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Phone / Mobile</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="+977 98..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">LinkedIn URL</label>
            <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Facebook URL</label>
            <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} className="w-full border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" placeholder="https://facebook.com/..." />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-navy dark:text-white border-b pb-2">Publishing & Order</h3>
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-sm font-bold text-navy dark:text-white mb-2">Display Order</label>
            <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} className="w-32 border p-3 rounded-xl dark:bg-zinc-950 dark:border-white/10" />
            <p className="text-xs text-text-muted mt-1">Lower numbers appear first.</p>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer mt-6">
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-6 h-6 rounded border-gray-300 text-accent focus:ring-accent" />
              <span className="font-bold text-navy dark:text-white">Publish this member</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-black/10 dark:border-white/10">
        <Link href="/admin/team" className="px-6 py-3 font-bold text-text-secondary hover:text-navy dark:hover:text-white transition-colors">
          Cancel
        </Link>
        <button type="submit" disabled={loading} className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px]">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Saving...' : 'Save Member'}
        </button>
      </div>
    </form>
  );
}
