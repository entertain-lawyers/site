import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Edit, Eye, Plus } from 'lucide-react';
import DeleteTeamMemberButton from './DeleteTeamMemberButton';
import BulkImportTeamDialog from './BulkImportTeamDialog';
import Image from 'next/image';

export const metadata = { title: 'Manage Team | Admin' };

export default async function AdminTeamPage() {
  let members: any[] = [];
  let dbError = false;

  try {
    members = await prisma.teamMember.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      dbError = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white">Team Members</h1>
          <p className="text-text-secondary mt-1">Manage the public team directory.</p>
        </div>
        <div className="flex items-center gap-3">
          <BulkImportTeamDialog />
          <Link
            href="/admin/team/new"
            className="bg-accent hover:bg-accent-dark text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Member
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 shadow-sm border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-950/50 border-b border-black/10 dark:border-white/10">
                <th className="p-4 font-bold text-sm text-text-secondary">Photo</th>
                <th className="p-4 font-bold text-sm text-text-secondary">Name & Designation</th>
                <th className="p-4 font-bold text-sm text-text-secondary">Status</th>
                <th className="p-4 font-bold text-sm text-text-secondary">Order</th>
                <th className="p-4 font-bold text-sm text-text-secondary">Last Updated</th>
                <th className="p-4 font-bold text-sm text-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {dbError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center bg-red-50 dark:bg-red-900/20">
                    <p className="text-red-600 dark:text-red-400 font-bold mb-1">Database Table Missing (P2021)</p>
                    <p className="text-red-500 dark:text-red-300 text-sm">Please update .env to a local database and run <code>npx prisma db push</code>.</p>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    No team members found. Click "Add Member" to create one.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      {member.imageUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden relative bg-slate-100 dark:bg-zinc-800">
                          <Image src={member.imageUrl} alt={member.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-text-muted font-bold text-lg">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-navy dark:text-white">{member.name}</div>
                      <div className="text-sm text-text-secondary">{member.designation}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        member.isPublished
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {member.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-text-secondary">{member.displayOrder}</td>
                    <td className="p-4 text-sm text-text-secondary">
                      {new Date(member.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-3">
                        {member.isPublished && (
                          <Link
                            href={`/team/${member.slug}`}
                            target="_blank"
                            className="text-text-muted hover:text-navy dark:hover:text-white transition-colors"
                            title="View Public Profile"
                          >
                            <Eye size={20} />
                          </Link>
                        )}
                        <Link
                          href={`/admin/team/${member.id}/edit`}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Edit Member"
                        >
                          <Edit size={20} />
                        </Link>
                        <DeleteTeamMemberButton id={member.id} name={member.name} />
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
