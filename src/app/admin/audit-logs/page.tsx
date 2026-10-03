import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

export default async function AuditLogsPage() {
  const session = await auth();

  // ONLY Admins can view audit logs
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect('/admin');
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      User: {
        select: { email: true, role: true }
      }
    },
    take: 100 // Limit to latest 100 for now
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'UPDATE': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'DELETE': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'PUBLISH': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Audit Logs</h1>
          <p className="mt-2 text-text-secondary font-medium">Track editorial actions and administrative changes.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Entity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const details = log.details as any || {};

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-secondary">
                        {log.createdAt.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-navy dark:text-white">{log.User ? log.User.email : 'System/Deleted'}</span>
                          <span className="text-xs text-text-muted">{log.User?.role || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-navy dark:text-white">
                        {log.entityType}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={JSON.stringify(details)}>
                        {details.title ? (
                          <span className="font-medium text-navy dark:text-white">{details.title}</span>
                        ) : (
                          JSON.stringify(details)
                        )}
                        {details.updatedFields && (
                          <span className="ml-2 text-xs text-text-muted">(Updated: {details.updatedFields.join(', ')})</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-navy dark:text-white">No audit logs</h3>
                      <p className="text-sm text-text-secondary">Actions performed by editors and admins will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
