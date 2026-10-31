'use client';

/**
 * WordPress-parity user profile editor — mirrors the WP user-edit screen
 * sections: Profile Picture, Names, Contact Info, About, Account Management.
 * One "Update User" save that pushes everything via updateUserAction.
 */
import { useMemo, useState, useRef } from 'react';
import { Role } from '@prisma/client';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';
import { updateUserAction } from '@/modules/admin/admin-user.actions';
import { AnimatePresence, Appear, MotionButton } from '@/components/motion/primitives';

interface EditableUser {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  bio: string | null;
  website: string | null;
  image: string | null;
  role: Role;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default function UserEditClient({
  user,
  displayOptions,
}: {
  user: EditableUser;
  displayOptions: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [nickname, setNickname] = useState(user.nickname || '');
  const [displayName, setDisplayName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email);
  const [website, setWebsite] = useState(user.website || '');
  const [bio, setBio] = useState(user.bio || '');
  const [role, setRole] = useState<Role>(user.role);
  const [password, setPassword] = useState('');
  const [image, setImage] = useState(user.image || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Display-name choices — the live-typed candidates plus whatever still fits.
  const displayChoices = useMemo(() => {
    const candidates = [
      displayName,
      nickname,
      firstName,
      [firstName, lastName].filter(Boolean).join(' '),
      lastName,
      user.email.split('@')[0],
      ...displayOptions,
    ].map((candidate) => candidate.trim());
    return Array.from(new Set(candidates.filter(Boolean)));
  }, [displayName, nickname, firstName, lastName, displayOptions, user.email]);

  const showPasswordFields = password.length > 0;

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      setError('Avatar must be a JPG, PNG, WebP, or GIF image');
      return;
    }
    const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    if (file.size > 10 * 1024 * 1024) {
      setError('Avatar must be under 10MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await initiateMediaUploadAction({
        filename: file.name,
        mimeType,
        size: file.size,
        type: 'PROFILE',
      });
      if (!res.success) throw new Error(res.error);

      const uploadRes = await fetch(res.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Failed to upload image');

      setImage(res.data.publicUrl);
      setSuccess('Image uploaded — press "Update User" to save it.');
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await updateUserAction({
        id: user.id,
        email,
        role,
        firstName,
        lastName,
        nickname,
        website,
        bio,
        displayName: displayName,
        image: image,
        password: password || undefined,
      });
      if (!res.success) throw new Error(res.error);

      setSuccess('User updated.');
      setPassword('');
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl bg-slate-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 px-4 py-3 text-navy dark:text-white focus:border-accent focus:ring-1 focus:ring-accent transition-colors';
  const labelClass = 'block text-sm font-bold text-navy dark:text-white mb-2';

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <AnimatePresence initial={false}>
      {error && (
        <Appear key="error">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">{error}</div>
        </Appear>
      )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
      {success && (
        <Appear key="success">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">{success}</div>
        </Appear>
      )}
      </AnimatePresence>

      <MotionButton
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-xl font-bold transition-[background-color,border-color,color,box-shadow,opacity] disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {saving ? 'Saving...' : 'Update User'}
      </MotionButton>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ============================================================================
        Names */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-6">Names</h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="firstName" className={labelClass}>First Name</label>
              <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>Last Name</label>
              <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="nickname" className={labelClass}>Nickname</label>
              <input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="displayName" className={labelClass}>Display name publicly as</label>
              <select id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass}>
                {displayChoices.map((choice) => (
                  <option key={choice} value={choice}>{choice}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ============================================================================
        Account */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-6">Account Management</h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="role" className={labelClass}>Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={user.email === 'admin@entertainlawyers.com'}
                className={`${inputClass} disabled:opacity-50`}
              >
                <option value={Role.USER}>User</option>
                <option value={Role.EDITOR}>Editor</option>
                <option value={Role.ADMIN}>Admin</option>
              </select>
              {user.email === 'admin@entertainlawyers.com' && (
                <p className="mt-2 text-xs text-red-500 font-medium">The main admin role cannot be changed.</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>New Password (leave blank to keep current)</label>
              <input
                id="password"
                type="password"
                value={password}
                minLength={showPasswordFields ? 6 : undefined}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ============================================================================
        Profile Picture */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-6">Profile Picture</h2>
          <div className="flex items-center gap-6">
            {image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={image} alt={`${displayName || user.email} profile`} className="h-20 w-20 rounded-full object-cover border border-black/10 dark:border-white/10" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-bold text-white" aria-hidden="true">
                {(displayName || user.email).charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col gap-3">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarFile} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-2 border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 hover:border-gold px-4 py-2.5 rounded-xl font-bold text-navy dark:text-white text-sm transition-colors disabled:opacity-60"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
                {uploadingAvatar ? 'Uploading...' : 'Choose Image'}
              </button>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500 hover:text-red-600 min-h-[44px] justify-start"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-4 text-xs text-text-secondary">
            JPG, PNG, WebP, or GIF under 10MB. Removal takes effect after saving.
          </p>
        </section>

        {/* ============================================================================
        Contact Info + About */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-6">Contact Info</h2>
          <div>
            <label htmlFor="website" className={labelClass}>Website</label>
            <input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputClass}
            />
          </div>
          <h2 className="text-lg font-extrabold text-navy dark:text-white mt-8 mb-3">About</h2>
          <div>
            <label htmlFor="bio" className={labelClass}>Biographical Info</label>
            <textarea
              id="bio"
              rows={5}
              maxLength={1200}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              className={`${inputClass} resize-y`}
            />
          </div>
        </section>
      </div>
    </form>
  );
}
