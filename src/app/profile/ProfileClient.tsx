'use client';

import { useState } from 'react';
import { updateProfile, changePassword } from '@/modules/user/user.actions';
import { User, BookOpen, Shield, Phone, Mail, GraduationCap } from 'lucide-react';

interface ProfileClientProps {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    education: string;
    university: string;
    hasPassword: boolean;
  };
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');

  // Details state
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [education, setEducation] = useState(user.education);
  const [university, setUniversity] = useState(user.university);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState({ type: '', text: '' });

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsMessage({ type: '', text: '' });

    try {
      const res = await updateProfile({ name, phone, education, university });
      if (!res.success) throw new Error(res.error);
      setDetailsMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setDetailsMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityLoading(true);
    setSecurityMessage({ type: '', text: '' });

    if (newPassword.length < 8) {
      setSecurityMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      setSecurityLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Passwords do not match.' });
      setSecurityLoading(false);
      return;
    }

    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (!res.success) throw new Error(res.error);
      setSecurityMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMessage({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors relative ${
            activeTab === 'details'
              ? 'text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <User className="w-4 h-4" />
          Personal Details
          {activeTab === 'details' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-t-full"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors relative ${
            activeTab === 'security'
              ? 'text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security
          {activeTab === 'security' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-t-full"></div>
          )}
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {activeTab === 'details' && (
          <form onSubmit={handleUpdateDetails} className="space-y-6 max-w-2xl">
            {detailsMessage.text && (
              <div className={`p-4 rounded-xl text-sm font-medium border backdrop-blur-sm ${
                detailsMessage.type === 'success'
                  ? 'bg-green-50/80 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-900/30'
                  : 'bg-red-50/80 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
              }`}>
                {detailsMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-zinc-800 border-transparent rounded-xl text-text-secondary cursor-not-allowed sm:text-sm font-medium"
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-muted">Your email address cannot be changed.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full pl-11 pr-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none block w-full pl-11 pr-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium"
                    placeholder="+977 98..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">Degree / Education</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <BookOpen className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="appearance-none block w-full pl-11 pr-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium"
                    placeholder="e.g. BALLB"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-navy dark:text-white mb-2">University / College</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <GraduationCap className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="appearance-none block w-full pl-11 pr-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium"
                    placeholder="e.g. Tribhuvan University"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={detailsLoading}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 shadow-sm disabled:opacity-50"
              >
                {detailsLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
            {securityMessage.text && (
              <div className={`p-4 rounded-xl text-sm font-medium border backdrop-blur-sm ${
                securityMessage.type === 'success'
                  ? 'bg-green-50/80 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-900/30'
                  : 'bg-red-50/80 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
              }`}>
                {securityMessage.text}
              </div>
            )}

            {!user.hasPassword ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl text-sm border border-yellow-200 dark:border-yellow-900/50">
                You logged in using an external provider (like Google). Password management is handled by your provider.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-navy dark:text-white mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? (
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
                  <label className="block text-sm font-bold text-navy dark:text-white mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium pr-12"
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
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
                  <label className="block text-sm font-bold text-navy dark:text-white mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-black/10 dark:border-white/10 rounded-xl shadow-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-slate-50 dark:bg-zinc-950 text-navy dark:text-white sm:text-sm font-medium pr-12"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={securityLoading}
                    className="w-full inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 shadow-sm disabled:opacity-50"
                  >
                    {securityLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
