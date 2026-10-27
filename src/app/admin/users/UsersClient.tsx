'use client';

import { useState } from 'react';
import { Role } from '@prisma/client';
import { createUserAction, deleteUserAction } from '@/modules/admin/admin-user.actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function Avatar({ image, label }: { image?: string | null; label: string }) {
  if (image) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={image} alt="" className="h-10 w-10 rounded-full object-cover border border-black/10 dark:border-white/10" />
    );
  }
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white"
      aria-hidden="true"
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  nickname: string | null;
  role: Role;
  createdAt: string | Date;
}

export default function UsersClient({ initialUsers, currentUserId }: { initialUsers: AdminUserRow[], currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.USER);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openNewUserModal = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole(Role.USER);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await createUserAction({
        email,
        password,
        role,
      });
      if (!res.success) throw new Error(res.error);

      setIsModalOpen(false);
      router.refresh();
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUserId) {
      alert("You cannot delete yourself.");
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await deleteUserAction({ id });
      if (!res.success) throw new Error(res.error);
      setUsers(users.filter(u => u.id !== id));
      router.refresh();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete user');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Manage Users</h1>
          <p className="mt-2 text-text-secondary font-medium">Add users, assign roles and manage profiles.</p>
        </div>
        <button
          onClick={openNewUserModal}
          className="px-6 py-2.5 rounded-xl bg-accent text-white font-bold hover:bg-accent/90 transition-all shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)]"
        >
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/80">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase">User</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase">Role</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase">Joined</th>
                <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <Avatar image={user.image} label={user.name || user.email} />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-navy dark:text-white truncate">{user.name || user.email}</div>
                        {(user.name || user.nickname) && (
                          <div className="text-xs text-text-secondary truncate">{user.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      user.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                      user.role === 'EDITOR' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-text-secondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="text-accent hover:text-accent/80 font-medium text-sm min-h-[44px] inline-flex items-center mr-4"
                    >
                      Edit
                    </Link>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:text-red-600 font-medium text-sm min-h-[44px] inline-flex items-center"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-navy dark:text-white">Add New User</h2>

            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 border border-black/10 px-4 py-3 text-navy dark:text-white focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 border border-black/10 px-4 py-3 text-navy dark:text-white focus:border-accent focus:ring-1 focus:ring-accent pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 border border-black/10 px-4 py-3 text-navy dark:text-white focus:border-accent focus:ring-1 focus:ring-accent pr-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 border border-black/10 px-4 py-3 text-navy dark:text-white focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value={Role.USER}>User</option>
                  <option value={Role.EDITOR}>Editor</option>
                  <option value={Role.ADMIN}>Admin</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-navy dark:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
