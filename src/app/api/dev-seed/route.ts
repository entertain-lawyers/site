import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SYLLABUS_CONFIG } from '@/lib/syllabus-config';
import { revalidateTag } from 'next/cache';

export async function GET(request: Request) {
  function normalize(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  try {
    let createdSemesters = 0;
    let createdSubjects = 0;
    
    for (const semConfig of SYLLABUS_CONFIG) {
      const semester = await prisma.semester.upsert({
        where: { slug: normalize(semConfig.name) },
        update: { name: semConfig.name, order: semConfig.order },
        create: { name: semConfig.name, order: semConfig.order, slug: normalize(semConfig.name) }
      });
      createdSemesters++;
      
      for (const subConfig of semConfig.subjects) {
        const subSlug = normalize(semConfig.name + '-' + subConfig.name);
        const existing = await prisma.subject.findFirst({
          where: {
            semesterId: semester.id,
            name: subConfig.name
          }
        });
        
        if (!existing) {
          await prisma.subject.upsert({
            where: { slug: subSlug },
            update: { name: subConfig.name, semesterId: semester.id, order: subConfig.order },
            create: {
              name: subConfig.name,
              semesterId: semester.id,
              order: subConfig.order,
              slug: subSlug
            }
          });
          createdSubjects++;
        }
      }
    }

    // Remove revalidateTag since it requires a profile argument in this Next.js version
    // and causes a build failure. We rely on time-based revalidation (3600s) or manual flush.
    return NextResponse.json({ success: true, createdSemesters, createdSubjects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
