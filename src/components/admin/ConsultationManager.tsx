'use client';

import { useState, useTransition } from 'react';
import { 
  ConsultationStatus, 
  ContactMethod, 
  ConsultationMode 
} from '@prisma/client';
import { 
  adminUpdateConsultationStatusAction 
} from '@/modules/consultation/consultation.actions';
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageSquare, 
  Building2, 
  Video, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileText, 
  ExternalLink, 
  X,
  Scale,
  Receipt
} from 'lucide-react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { AnimatePresence, Backdrop, DialogPanel } from '@/components/motion/primitives';

interface ConsultationItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredContactMethod: ContactMethod;
  consultationMode: ConsultationMode;
  practiceArea: string;
  preferredTime: string | null;
  claimAmount: number | null;
  courtFeeEstimated: number | null;
  subject: string;
  description: string;
  referralSource: string | null;
  status: ConsultationStatus;
  adminNotes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ConsultationManagerProps {
  initialItems: ConsultationItem[];
  dbError?: boolean;
}

const STATUS_COLORS: Record<ConsultationStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  CONTACTED: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  SCHEDULED: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  CANCELLED: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
};

export default function ConsultationManager({ initialItems, dbError }: ConsultationManagerProps) {
  const [items, setItems] = useState<ConsultationItem[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ConsultationItem | null>(null);
  useEscapeKey(selectedItem !== null, () => setSelectedItem(null));
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (dbError) {
    return (
      <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-text-primary">Database Migration Pending</h3>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          The <code>ConsultationRequest</code> table schema is defined in <code>prisma/schema.prisma</code> and migration file <code>20261011000000_add_consultation_requests</code>. Apply the reviewed migration to your PostgreSQL database to enable live consultation intake records.
        </p>
      </div>
    );
  }

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      item.practiceArea.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Status Metrics
  const statusCounts = {
    TOTAL: items.length,
    NEW: items.filter((i) => i.status === 'NEW').length,
    CONTACTED: items.filter((i) => i.status === 'CONTACTED').length,
    SCHEDULED: items.filter((i) => i.status === 'SCHEDULED').length,
    COMPLETED: items.filter((i) => i.status === 'COMPLETED').length,
    CANCELLED: items.filter((i) => i.status === 'CANCELLED').length,
  };

  const handleOpenDetails = (item: ConsultationItem) => {
    setSelectedItem(item);
    setEditNotes(item.adminNotes || '');
    setUpdateFeedback(null);
  };

  const handleStatusChange = async (itemId: string, newStatus: ConsultationStatus) => {
    setIsUpdating(true);
    setUpdateFeedback(null);
    try {
      const res = await adminUpdateConsultationStatusAction({
        id: itemId,
        status: newStatus,
        adminNotes: selectedItem?.id === itemId ? editNotes : undefined,
      });

      if (res.success) {
        startTransition(() => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? { ...i, status: newStatus, adminNotes: selectedItem?.id === itemId ? editNotes : i.adminNotes }
                : i
            )
          );
          if (selectedItem?.id === itemId) {
            setSelectedItem((prev) => (prev ? { ...prev, status: newStatus, adminNotes: editNotes } : null));
          }
        });
        setUpdateFeedback('Status updated successfully');
      } else {
        setUpdateFeedback(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      setUpdateFeedback(err.message || 'Error updating status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedItem) return;
    setIsUpdating(true);
    setUpdateFeedback(null);
    try {
      const res = await adminUpdateConsultationStatusAction({
        id: selectedItem.id,
        status: selectedItem.status,
        adminNotes: editNotes,
      });

      if (res.success) {
        startTransition(() => {
          setItems((prev) =>
            prev.map((i) => (i.id === selectedItem.id ? { ...i, adminNotes: editNotes } : i))
          );
          setSelectedItem((prev) => (prev ? { ...prev, adminNotes: editNotes } : null));
        });
        setUpdateFeedback('Notes saved successfully');
      } else {
        setUpdateFeedback(res.error || 'Failed to save notes');
      }
    } catch (err: any) {
      setUpdateFeedback(err.message || 'Error saving notes');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(
          [
            { label: 'Total', count: statusCounts.TOTAL, key: 'ALL', color: 'border-border' },
            { label: 'New / Intake', count: statusCounts.NEW, key: 'NEW', color: 'border-amber-500/40 text-amber-600' },
            { label: 'Contacted', count: statusCounts.CONTACTED, key: 'CONTACTED', color: 'border-blue-500/40 text-blue-600' },
            { label: 'Scheduled', count: statusCounts.SCHEDULED, key: 'SCHEDULED', color: 'border-indigo-500/40 text-indigo-600' },
            { label: 'Completed', count: statusCounts.COMPLETED, key: 'COMPLETED', color: 'border-emerald-500/40 text-emerald-600' },
            { label: 'Cancelled', count: statusCounts.CANCELLED, key: 'CANCELLED', color: 'border-rose-500/40 text-rose-600' },
          ] as const
        ).map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => setStatusFilter(stat.key)}
            className={`p-3.5 rounded-2xl border text-left transition-all ${stat.color} ${
              statusFilter === stat.key
                ? 'bg-accent/10 border-accent shadow-sm'
                : 'bg-surface hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider">{stat.label}</div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-text-primary">{stat.count}</div>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, email, phone, or subject..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="ALL">All Statuses ({items.length})</option>
            <option value="NEW">NEW ({statusCounts.NEW})</option>
            <option value="CONTACTED">CONTACTED ({statusCounts.CONTACTED})</option>
            <option value="SCHEDULED">SCHEDULED ({statusCounts.SCHEDULED})</option>
            <option value="COMPLETED">COMPLETED ({statusCounts.COMPLETED})</option>
            <option value="CANCELLED">CANCELLED ({statusCounts.CANCELLED})</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-surface-alt border-b border-border text-text-muted font-bold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Client Name & Contact</th>
                <th className="py-3.5 px-4">Practice Area & Mode</th>
                <th className="py-3.5 px-4">Subject & Claim</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted text-sm">
                    No consultation requests match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const statusStyle = STATUS_COLORS[item.status];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetails(item)}
                    >
                      {/* Client info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-primary text-sm">{item.fullName}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{item.email}</div>
                        <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-accent" />
                          <span>{item.phone}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-alt border border-border">
                            {item.preferredContactMethod}
                          </span>
                        </div>
                      </td>

                      {/* Practice Area & Mode */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-text-primary">{item.practiceArea}</div>
                        <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                          {item.consultationMode === 'PHYSICAL' && <Building2 className="w-3 h-3 text-accent" />}
                          {item.consultationMode === 'ONLINE' && <Video className="w-3 h-3 text-blue-500" />}
                          {item.consultationMode === 'EITHER' && <Clock className="w-3 h-3 text-emerald-500" />}
                          <span>{item.consultationMode}</span>
                        </div>
                      </td>

                      {/* Subject & Claim */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-text-primary truncate" title={item.subject}>
                          {item.subject}
                        </div>
                        {item.claimAmount ? (
                          <div className="text-xs text-navy dark:text-[#ddba76] font-mono mt-0.5 flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            <span>Claim: रु. {item.claimAmount.toLocaleString('en-IN')}</span>
                            {item.courtFeeEstimated && (
                              <span className="text-text-muted font-normal">
                                (Fee: रु. {item.courtFeeEstimated.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-text-muted mt-0.5">No claim amount stated</div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-text-muted whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as ConsultationStatus)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors cursor-pointer ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(item);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-accent hover:bg-accent/10 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
      {selectedItem && (
        <Backdrop
          key="consultation-details"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <DialogPanel
            className="bg-surface rounded-3xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Consultation request from ${selectedItem.fullName}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-text-primary">{selectedItem.fullName}</h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      STATUS_COLORS[selectedItem.status].bg
                    } ${STATUS_COLORS[selectedItem.status].text} ${STATUS_COLORS[selectedItem.status].border}`}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1 font-mono">Case ID: {selectedItem.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact Action Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-alt rounded-2xl border border-border text-xs font-bold">
              <a
                href={`tel:${selectedItem.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Client ({selectedItem.phone})</span>
              </a>

              <a
                href={`mailto:${selectedItem.email}?subject=RE: ${encodeURIComponent(selectedItem.subject)}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border hover:bg-black/5 dark:hover:bg-white/5 text-text-primary transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </a>

              {selectedItem.phone && (
                <a
                  href={`https://wa.me/${selectedItem.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Practice Area:</span>
                <p className="font-semibold text-text-primary">{selectedItem.practiceArea}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Consultation Mode:</span>
                <p className="font-semibold text-text-primary">{selectedItem.consultationMode}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Preferred Time:</span>
                <p className="font-semibold text-text-primary">{selectedItem.preferredTime || 'Not specified'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Referral Source:</span>
                <p className="font-semibold text-text-primary font-mono">{selectedItem.referralSource || 'Direct'}</p>
              </div>

              {selectedItem.claimAmount && (
                <div className="space-y-1 sm:col-span-2 p-3 rounded-xl bg-accent/5 border border-accent/20">
                  <span className="text-accent text-xs font-bold uppercase tracking-wider">Claim Valuation:</span>
                  <p className="font-bold text-navy dark:text-[#ddba76] text-base">
                    रु. {selectedItem.claimAmount.toLocaleString('en-IN')}{' '}
                    {selectedItem.courtFeeEstimated && (
                      <span className="text-xs font-normal text-text-muted">
                        (Est. Section 69 Court Fee: रु. {selectedItem.courtFeeEstimated.toLocaleString('en-IN')})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Subject and Description */}
            <div className="space-y-2">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Subject:</span>
              <p className="font-bold text-text-primary">{selectedItem.subject}</p>
            </div>

            <div className="space-y-2">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Case Description:</span>
              <div className="p-4 rounded-2xl bg-surface-alt border border-border text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {selectedItem.description}
              </div>
            </div>

            {/* Admin Internal Notes Editor */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Internal Advocate Notes (Staff Only)
                </label>
                {updateFeedback && (
                  <span className="text-xs font-semibold text-accent">{updateFeedback}</span>
                )}
              </div>

              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add confidential notes on lawyer assignment, scheduled date/time, client callback notes, court fee findings..."
                className="w-full p-3 rounded-xl border border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-muted">Status:</span>
                  <select
                    value={selectedItem.status}
                    onChange={(e) => handleStatusChange(selectedItem.id, e.target.value as ConsultationStatus)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-text-primary"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveNotes}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </DialogPanel>
        </Backdrop>
      )}
      </AnimatePresence>
    </div>
  );
}
