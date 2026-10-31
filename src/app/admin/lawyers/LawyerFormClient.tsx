'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createConsultationLawyerAction,
  updateConsultationLawyerAction,
} from '@/modules/admin/admin-lawyer.actions';
import ImageUpload from '@/components/admin/ImageUpload';
import Link from 'next/link';
import { Loader2, ArrowLeft, Save, Scale, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

interface LawyerFormClientProps {
  lawyer?: any;
}

export default function LawyerFormClient({ lawyer }: LawyerFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(lawyer?.name || '');
  const [slug, setSlug] = useState(lawyer?.slug || '');
  const [title, setTitle] = useState(lawyer?.title || 'Advocate');
  const [licenseNumber, setLicenseNumber] = useState(lawyer?.licenseNumber || '');
  const [specialization, setSpecialization] = useState(lawyer?.specialization || '');
  const [practiceAreas, setPracticeAreas] = useState(lawyer?.practiceAreas || '');
  const [courtJurisdiction, setCourtJurisdiction] = useState(lawyer?.courtJurisdiction || '');
  const [experience, setExperience] = useState(lawyer?.experience || '');
  const [qualifications, setQualifications] = useState(lawyer?.qualifications || '');
  const [languages, setLanguages] = useState(lawyer?.languages || 'Nepali, English');
  const [phone, setPhone] = useState(lawyer?.phone || '');
  const [email, setEmail] = useState(lawyer?.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState(lawyer?.whatsappNumber || '');
  const [location, setLocation] = useState(lawyer?.location || 'Pokhara & Kathmandu Chambers');
  const [imageUrl, setImageUrl] = useState(lawyer?.imageUrl || '');
  const [rating, setRating] = useState(lawyer?.rating || 5.0);
  const [displayOrder, setDisplayOrder] = useState(lawyer?.displayOrder || 0);
  const [isAvailable, setIsAvailable] = useState(lawyer ? lawyer.isAvailable : true);
  const [isFeatured, setIsFeatured] = useState(lawyer ? lawyer.isFeatured : false);
  const [shortBio, setShortBio] = useState(lawyer?.shortBio || '');
  const [bio, setBio] = useState(lawyer?.bio || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      title: title.trim(),
      licenseNumber: licenseNumber.trim() || null,
      specialization: specialization.trim() || null,
      practiceAreas: practiceAreas.trim() || null,
      courtJurisdiction: courtJurisdiction.trim() || null,
      experience: experience.trim() || null,
      qualifications: qualifications.trim() || null,
      languages: languages.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      whatsappNumber: whatsappNumber.trim() || null,
      location: location.trim() || null,
      imageUrl: imageUrl.trim() || null,
      rating: Number(rating) || 5.0,
      displayOrder: Number(displayOrder) || 0,
      isAvailable,
      isFeatured,
      shortBio: shortBio.trim() || null,
      bio: bio.trim() || null,
    };

    try {
      let res;
      if (lawyer?.id) {
        res = await updateConsultationLawyerAction({ id: lawyer.id, ...payload });
      } else {
        res = await createConsultationLawyerAction(payload);
      }

      if (res?.success) {
        router.push('/admin/lawyers');
        router.refresh();
      } else {
        setError((res as any)?.error || 'An error occurred while saving the lawyer profile.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <AnimatePresence initial={false}>
      {error && (
        <Appear key="error">
        <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium">
          {error}
        </div>
        </Appear>
      )}
      </AnimatePresence>

      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/admin/lawyers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-navy dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Lawyers Directory</span>
        </Link>
        <MotionButton
          type="submit"
          disabled={loading}
          className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-[background-color,border-color,color,box-shadow,opacity] shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{lawyer?.id ? 'Update Profile' : 'Save Advocate'}</span>
        </MotionButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Essential details & credentials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border p-6 rounded-2xl space-y-5">
            <h3 className="text-base font-extrabold text-navy dark:text-white flex items-center gap-2 border-b border-border pb-3">
              <Scale className="w-4 h-4 text-accent" />
              <span>1. Professional Credentials &amp; Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Full Name / अधिवक्ताको पूरा नाम *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ram Babu Das"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Professional Title / पद *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Advocate / Senior Counsel"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>Nepal Bar Council License No.</span>
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. Nepal Bar Council Regd. No. 24890"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Court Jurisdiction / अदालत अधिकार क्षेत्र
                </label>
                <input
                  type="text"
                  value={courtJurisdiction}
                  onChange={(e) => setCourtJurisdiction(e.target.value)}
                  placeholder="e.g. Supreme Court of Nepal & High Courts"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Practice Experience / अनुभव
                </label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 7+ Years Legal Practice"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Primary Specialization / मुख्य विशेषज्ञता
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Civil Litigation, Property Partition & Corporate Advisory"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Practice Areas / कानुनी विधाहरू (Comma-separated)
                </label>
                <input
                  type="text"
                  value={practiceAreas}
                  onChange={(e) => setPracticeAreas(e.target.value)}
                  placeholder="e.g. Civil Law, Property Partition, Commercial Disputes, Constitutional Law"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-surface border border-border p-6 rounded-2xl space-y-5">
            <h3 className="text-base font-extrabold text-navy dark:text-white flex items-center gap-2 border-b border-border pb-3">
              <Phone className="w-4 h-4 text-accent" />
              <span>2. Direct Client Contact Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Direct Phone / सम्पर्क फोन
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +977 9822010737"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +9779822010737"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Direct Email / इमेल ठेगाना
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. baburam.jnk@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Chambers Location / कार्यालय
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Pokhara & Kathmandu Chambers"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Bio & Background */}
          <div className="bg-surface border border-border p-6 rounded-2xl space-y-5">
            <h3 className="text-base font-extrabold text-navy dark:text-white border-b border-border pb-3">
              3. Biography &amp; Professional Profile
            </h3>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Executive Short Bio (1-2 sentences for card preview)
              </label>
              <textarea
                rows={2}
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder="Certified Advocate specializing in civil litigation, property dispute settlement, and high-stakes corporate advocacy."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Detailed Biography &amp; Court Admissions
              </label>
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Detailed background, major cases, court admissions, and legal practice history..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Photo, Visibility & Settings */}
        <div className="space-y-6">
          {/* Photo Upload */}
          <div className="bg-surface border border-border p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider">
              Profile Photo / तस्बिर
            </h3>
            <ImageUpload
              value={imageUrl}
              onChange={(url) => setImageUrl(url)}
              type="TEAM"
            />
          </div>

          {/* Availability & Display Settings */}
          <div className="bg-surface border border-border p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider">
              Visibility &amp; Consultation Status
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent"
                />
                <div>
                  <span className="text-sm font-bold text-text-primary block">Available for Consultation</span>
                  <span className="text-xs text-text-muted">Display profile on public /consultation page</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-border">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent"
                />
                <div>
                  <span className="text-sm font-bold text-text-primary block">Featured Advocate</span>
                  <span className="text-xs text-text-muted">Highlight at the top of the consultation list</span>
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-border">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Display Order / क्रम
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <p className="text-[11px] text-text-muted mt-1">Lower numbers appear first (e.g. 1, 2, 3).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                URL Slug (Optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ram-babu-das"
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>

          {/* Education & Languages */}
          <div className="bg-surface border border-border p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider">
              Qualifications &amp; Languages
            </h3>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Academic Degrees / योग्यता
              </label>
              <input
                type="text"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. LL.M. (Commercial Law), B.A. LL.B."
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Languages Spoken / भाषाहरू
              </label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="e.g. Nepali, English, Maithili"
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
