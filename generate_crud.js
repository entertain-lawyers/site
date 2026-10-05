const fs = require('fs');
const path = require('path');

const models = [
  { name: 'Semester', lower: 'semester', plural: 'semesters', fields: ['name', 'slug', 'order'] },
  { name: 'Subject', lower: 'subject', plural: 'subjects', fields: ['name', 'slug', 'order', 'semesterId'] },
  { name: 'Unit', lower: 'unit', plural: 'units', fields: ['name', 'title', 'order', 'subjectId'] }
];

for (const model of models) {
  const actionsPath = `src/modules/admin/admin-${model.lower}.actions.ts`;
  const actionsContent = `'use server';
import { createSafeAction } from '@/lib/safe-action';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const createSchema = z.object({
  name: z.string().min(2),
  ${model.fields.includes('slug') ? 'slug: z.string().regex(/^[a-z0-9-]+$/).optional().or(z.literal("")),' : ''}
  ${model.fields.includes('title') ? 'title: z.string().optional(),' : ''}
  order: z.number().int().default(0),
  ${model.fields.includes('semesterId') ? 'semesterId: z.string().uuid(),' : ''}
  ${model.fields.includes('subjectId') ? 'subjectId: z.string().uuid(),' : ''}
});

export const create${model.name}Action = createSafeAction(async (args: z.infer<typeof createSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');
  const data: any = { name: args.name, order: args.order };
  ${model.fields.includes('slug') ? 'if (args.slug) data.slug = args.slug;' : ''}
  ${model.fields.includes('title') ? 'if (args.title) data.title = args.title;' : ''}
  ${model.fields.includes('semesterId') ? 'data.semesterId = args.semesterId;' : ''}
  ${model.fields.includes('subjectId') ? 'data.subjectId = args.subjectId;' : ''}
  
  await prisma.${model.lower}.create({ data });
  revalidatePath('/admin/study/${model.plural}');
  revalidatePath('/study');
  return { success: true };
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  ${model.fields.includes('slug') ? 'slug: z.string().regex(/^[a-z0-9-]+$/).optional().or(z.literal("")),' : ''}
  ${model.fields.includes('title') ? 'title: z.string().optional(),' : ''}
  order: z.number().int().default(0),
  ${model.fields.includes('semesterId') ? 'semesterId: z.string().uuid(),' : ''}
  ${model.fields.includes('subjectId') ? 'subjectId: z.string().uuid(),' : ''}
});

export const update${model.name}Action = createSafeAction(async (args: z.infer<typeof updateSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');
  const data: any = { name: args.name, order: args.order };
  ${model.fields.includes('slug') ? 'data.slug = args.slug || null;' : ''}
  ${model.fields.includes('title') ? 'data.title = args.title || null;' : ''}
  ${model.fields.includes('semesterId') ? 'data.semesterId = args.semesterId;' : ''}
  ${model.fields.includes('subjectId') ? 'data.subjectId = args.subjectId;' : ''}

  await prisma.${model.lower}.update({ where: { id: args.id }, data });
  revalidatePath('/admin/study/${model.plural}');
  revalidatePath('/study');
  return { success: true };
});

const deleteSchema = z.object({ id: z.string().uuid() });
export const delete${model.name}Action = createSafeAction(async (args: z.infer<typeof deleteSchema>, session) => {
  if (session.role !== Role.ADMIN && session.role !== Role.EDITOR) throw new Error('Unauthorized');
  try {
    await prisma.${model.lower}.delete({ where: { id: args.id } });
    revalidatePath('/admin/study/${model.plural}');
    revalidatePath('/study');
    return { success: true };
  } catch (e: any) {
    if (e.code === 'P2003') {
      throw new Error('Cannot delete this ${model.name} because it contains child items. Remove or move them first.');
    }
    throw e;
  }
});
`;
  fs.writeFileSync(actionsPath, actionsContent);

  const pagesDir = `src/app/admin/study/${model.plural}`;
  fs.mkdirSync(pagesDir, { recursive: true });

  const listPageContent = `import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Admin${model.name}sPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) redirect('/');
  const items = await prisma.${model.lower}.findMany({ orderBy: { order: 'asc' } });
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Manage ${model.name}s</h1>
        <Link href="/admin/study/${model.plural}/new" className="bg-accent text-white px-4 py-2 rounded-lg font-bold">Add New</Link>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow border dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-4 font-bold text-sm">Name</th>
              <th className="px-6 py-4 font-bold text-sm">Order</th>
              <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-zinc-800">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                <td className="px-6 py-4 font-medium dark:text-white">{item.name}</td>
                <td className="px-6 py-4 dark:text-white">{item.order}</td>
                <td className="px-6 py-4 text-right">
                  <Link href={\`/admin/study/${model.plural}/\${item.id}/edit\`} className="text-blue-600 hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(pagesDir, 'page.tsx'), listPageContent);
}

console.log('Generated boilerplate');
