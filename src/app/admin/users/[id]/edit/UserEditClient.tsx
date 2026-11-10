'use client';

/**
 * WordPress-parity user profile editor — mirrors the WP user-edit screen
 * sections: Profile Picture, Names, Contact Info, About, Account Management.
 * One "Update User" save that pushes everything via updateUserAction.
 */
import { useMemo, useState } from 'react';
import { Role } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/admin/ImageUpload';
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
  wpAuthorIdEn: number | null;
  wpAuthorIdNe: number | null;
}

type WordPressAuthorOption = { id: number; name: string };

interface WordPressAuthors {
  en: WordPressAuthorOption[];
  enError: string | null;
  ne: WordPressAuthorOption[];
  neError: string | null;
}

export default function UserEditClient({
  user,
  displayOptions,
  wpAuthors,
}: {
  user: EditableUser;
  displayOptions: string[];
  wpAuthors: WordPressAuthors;
}) {
  const router = useRouter();

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
  const [wpAuthorIdEn, setWpAuthorIdEn] = useState(user.wpAuthorIdEn ? String(user.wpAuthorIdEn) : '');
  const [wpAuthorIdNe, setWpAuthorIdNe] = useState(user.wpAuthorIdNe ? String(user.wpAuthorIdNe) : '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
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
        wpAuthorIdEn: wpAuthorIdEn ? Number(wpAuthorIdEn) : null,
        wpAuthorIdNe: wpAuthorIdNe ? Number(wpAuthorIdNe) : null,
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
                minLength={showPasswordFields ? 8 : undefined}
                placeholder="At least 8 characters (or leave blank)"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-text-secondary">Leave blank to keep current password, or enter at least 8 characters.</p>
            </div>
          </div>
        </section>

        {/* ============================================================================
        WordPress Author Accounts */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 sm:p-8 lg:col-span-2">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-2">Content Author Profiles</h2>
          <p className="text-sm text-text-secondary mb-6">
            Link this user to their WordPress account so posts can be published under their name.
            WordPress user ids are separate from local ids and are never guessed; only linked
            accounts appear in the post author selector.
          </p>
          {role === 'USER' && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              This user currently has the regular <strong>User</strong> role. Content authors must be an <strong>Administrator</strong> or <strong>Editor</strong>. Change their role above to enable WordPress author mapping.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="wpAuthorIdEn" className={labelClass}>English WordPress author</label>
              <select
                id="wpAuthorIdEn"
                value={wpAuthorIdEn}
                onChange={(e) => setWpAuthorIdEn(e.target.value)}
                disabled={role === 'USER' || Boolean(wpAuthors.enError)}
                className={`${inputClass} disabled:opacity-50`}
              >
                <option value="">Not linked</option>
                {wpAuthors.en.map((author) => (
                  <option key={author.id} value={author.id}>{author.name} (#{author.id})</option>
                ))}
              </select>
              {wpAuthors.enError && (
                <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-400">{wpAuthors.enError}</p>
              )}
            </div>
            <div>
              <label htmlFor="wpAuthorIdNe" className={labelClass}>Nepali WordPress author</label>
              <select
                id="wpAuthorIdNe"
                value={wpAuthorIdNe}
                onChange={(e) => setWpAuthorIdNe(e.target.value)}
                disabled={role === 'USER' || Boolean(wpAuthors.neError)}
                className={`${inputClass} disabled:opacity-50`}
              >
                <option value="">Not linked</option>
                {wpAuthors.ne.map((author) => (
                  <option key={author.id} value={author.id}>{author.name} (#{author.id})</option>
                ))}
              </select>
              {wpAuthors.neError && (
                <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-400">{wpAuthors.neError}</p>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================================
        Profile Picture */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 p-6 sm:p-8">
          <ImageUpload
            value={image}
            onChange={(url) => {
              setImage(url);
              setSuccess('Image updated — press "Update User" to save it.');
            }}
            type="PROFILE"
            label="Profile Picture"
            aspectRatio={1}
          />
          <p className="mt-4 text-xs text-text-secondary">
            JPG, PNG, WebP, or GIF under 10MB. Use the crop tool to center and position the portrait before uploading.
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
