import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
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
