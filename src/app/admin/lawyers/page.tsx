import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Scale, ShieldCheck, Phone, Mail, MessageCircle, MapPin, ExternalLink } from 'lucide-react';
import DeleteLawyerButton from './DeleteLawyerButton';
import ToggleLawyerButton from './ToggleLawyerButton';

export const metadata = { title: 'Manage Consultation Lawyers | Admin' };

export default async function AdminLawyersPage() {
  let lawyers: any[] = [];
  let dbError = false;

  try {
    lawyers = await prisma.consultationLawyer.findMany({
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
    });
  } catch (error: any) {
    console.error('[AdminLawyersPage] Error fetching consultation lawyers:', error);
    dbError = true;
  }

  const availableCount = lawyers.filter((l) => l.isAvailable).length;
  const certifiedCount = lawyers.filter((l) => l.licenseNumber).length;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent mb-1">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Practice Registry</span>
          </div>
          <h1 className="text-3xl font-black text-navy dark:text-white tracking-tight">
            Consultation Lawyers &amp; Advocates
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage certified lawyers and advocates shown to clients on the <strong>Consult a Lawyer</strong> page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/consultation"
            target="_blank"
            className="px-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-bold hover:bg-surface-alt transition-colors inline-flex items-center gap-1.5"
          >
            <span>View Public Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/lawyers/new"
            className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>Add Certified Lawyer</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase">Total Profiles</span>
            <p className="text-xl font-extrabold text-navy dark:text-white">{lawyers.length}</p>
          </div>
        </div>

        <div className="bg-surface border border-border p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase">Active for Booking</span>
            <p className="text-xl font-extrabold text-navy dark:text-white">{availableCount}</p>
          </div>
        </div>

        <div className="bg-surface border border-border p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase">Bar Council Verified</span>
            <p className="text-xl font-extrabold text-navy dark:text-white">{certifiedCount}</p>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-surface shadow-sm border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-alt border-b border-border text-xs uppercase tracking-wider text-text-muted font-bold">
                <th className="p-4">Advocate</th>
                <th className="p-4">Bar Council License &amp; Courts</th>
                <th className="p-4">Practice Specialization</th>
                <th className="p-4">Direct Contact</th>
                <th className="p-4">Booking Status</th>
                <th className="p-4">Order</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {dbError ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center bg-red-50 dark:bg-red-950/20 text-red-600">
                    Unable to load consultation lawyers. Please verify the database table.
                  </td>
                </tr>
              ) : lawyers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-text-muted">
                    <Scale className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-40" />
                    <p className="font-bold text-navy dark:text-white">No consultation lawyers listed yet.</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Click &ldquo;Add Certified Lawyer&rdquo; to add an advocate to the consultation portal.
                    </p>
                  </td>
                </tr>
              ) : (
                lawyers.map((lawyer) => (
                  <tr key={lawyer.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    {/* Advocate Photo & Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden relative bg-slate-100 dark:bg-zinc-800 shrink-0 border border-border">
                          {lawyer.imageUrl ? (
                            <Image src={lawyer.imageUrl} alt={lawyer.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-accent text-lg">
                              {lawyer.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-navy dark:text-white truncate flex items-center gap-1.5">
                            <span>{lawyer.name}</span>
                            {lawyer.isFeatured && (
                              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-accent font-semibold">{lawyer.title}</div>
                        </div>
                      </div>
                    </td>

                    {/* License & Court */}
                    <td className="p-4 text-xs space-y-1">
                      {lawyer.licenseNumber ? (
                        <div className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{lawyer.licenseNumber}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">No license recorded</span>
                      )}
                      {lawyer.courtJurisdiction && (
                        <div className="text-text-secondary truncate max-w-xs">{lawyer.courtJurisdiction}</div>
                      )}
                    </td>

                    {/* Specialization */}
                    <td className="p-4 text-xs">
                      <div className="font-bold text-text-primary max-w-xs truncate">
                        {lawyer.specialization || 'General Legal Practice'}
                      </div>
                      {lawyer.practiceAreas && (
                        <div className="text-text-muted text-[11px] truncate max-w-xs">
                          {lawyer.practiceAreas}
                        </div>
                      )}
                    </td>

                    {/* Direct Contact */}
                    <td className="p-4 text-xs space-y-1 text-text-secondary">
                      {lawyer.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-accent shrink-0" />
                          <span>{lawyer.phone}</span>
                        </div>
                      )}
                      {lawyer.email && (
                        <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 text-accent shrink-0" />
                          <span className="truncate">{lawyer.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Availability toggle */}
                    <td className="p-4">
                      <ToggleLawyerButton id={lawyer.id} isAvailable={lawyer.isAvailable} />
                    </td>

                    {/* Order */}
                    <td className="p-4 text-xs font-semibold text-text-muted">{lawyer.displayOrder}</td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/lawyers/${lawyer.id}/edit`}
                          className="p-2 text-text-muted hover:text-accent transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          title="Edit Profile"
                        >
                          <Edit size={16} />
                        </Link>
                        <DeleteLawyerButton id={lawyer.id} name={lawyer.name} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
