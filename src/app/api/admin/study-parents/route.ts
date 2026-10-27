import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
  // Re-read the role from the database; JWT roles can be stale after a demotion.
  const user = await requireRole(Role.ADMIN, Role.EDITOR);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'semesterId') {
      const parents = await prisma.semester.findMany({ select: { id: true, name: true }, orderBy: { order: 'asc' } });
      return NextResponse.json(parents);
    } else if (type === 'subjectId') {
      const parents = await prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { order: 'asc' } });
      return NextResponse.json(parents);
    }
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
