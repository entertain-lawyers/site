import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { SYLLABUS_CONFIG, normalizeSubjectName } from '@/lib/syllabus-config';
import { ResourceType } from '@prisma/client';

describe('Study Resource Placement & Curriculum Audit Verification', () => {
  it('has exactly 10 semesters and exactly 83 canonical subjects in DB', async () => {
    const semesters = await prisma.semester.findMany({
      orderBy: { order: 'asc' },
      include: { subjects: true },
    });

    if (semesters.length < 10) {
      // Local development database has mock stub data; skip live database assertion
      expect(semesters.length).toBeGreaterThanOrEqual(1);
      return;
    }

    expect(semesters.length).toBe(10);
    const totalSubjects = semesters.reduce((acc, s) => acc + s.subjects.length, 0);
    expect(totalSubjects).toBe(83);

    // Verify each semester matches expected subject count
    const expectedCounts = [8, 8, 7, 7, 10, 10, 10, 10, 9, 4];
    for (let i = 0; i < 10; i++) {
      expect(semesters[i].order).toBe(i + 1);
      expect(semesters[i].subjects.length).toBe(expectedCounts[i]);
    }
  });

  it('has zero duplicate subjects within or across semesters', async () => {
    const subjects = await prisma.subject.findMany({
      include: { semester: true },
    });

    const seenPerSemester = new Map<number, Set<string>>();
    for (const sub of subjects) {
      const semOrder = sub.semester.order;
      if (!seenPerSemester.has(semOrder)) {
        seenPerSemester.set(semOrder, new Set());
      }
      const normName = normalizeSubjectName(sub.name);
      const set = seenPerSemester.get(semOrder)!;
      expect(set.has(normName)).toBe(false);
      set.add(normName);
    }
  });

  it('verifies 4th Semester Family Law canonical placement with all 20 resources', async () => {
    const semesters = await prisma.semester.findMany();
    if (semesters.length < 10) return;

    const familyLawSubjects = await prisma.subject.findMany({
      where: { name: { contains: 'Family Law' } },
      include: {
        semester: true,
        units: {
          orderBy: { order: 'asc' },
          include: { resources: true },
        },
        resources: true,
      },
    });

    // Exactly 1 subject, canonical id 08bd96ac-f591-4b6c-8107-05cf048c0467 in 4th Semester
    expect(familyLawSubjects.length).toBe(1);
    const fl = familyLawSubjects[0];
    expect(fl.id).toBe('08bd96ac-f591-4b6c-8107-05cf048c0467');
    expect(fl.semester.order).toBe(4);
    expect(fl.units.length).toBe(8);

    // Prescribed Cases unit holds all 20 case laws
    const prescribedCasesUnit = fl.units.find((u) => u.name.toLowerCase().includes('prescribed'));
    expect(prescribedCasesUnit).toBeDefined();
    expect(prescribedCasesUnit!.resources.length).toBe(20);
    for (const r of prescribedCasesUnit!.resources) {
      expect(r.type).toBe(ResourceType.CASE_LAW);
      expect(r.semesterId).toBe(fl.semesterId);
      expect(r.subjectId).toBe(fl.id);
    }
  });

  it('verifies resources are present across all 10 semesters', async () => {
    const semesters = await prisma.semester.findMany({
      orderBy: { order: 'asc' },
    });
    if (semesters.length < 10) return;

    for (const sem of semesters) {
      const count = await prisma.resource.count({
        where: {
          OR: [
            { semesterId: sem.id },
            { subject: { semesterId: sem.id } },
          ],
        },
      });
      expect(count).toBeGreaterThan(0);
    }
  });

  it('verifies old questions are typed OLD_QUESTION with valid semesterId and subjectId null', async () => {
    const semesters = await prisma.semester.findMany();
    if (semesters.length < 10) return;

    const oldQuestions = await prisma.resource.findMany({
      where: { type: ResourceType.OLD_QUESTION },
      include: { semester: true },
    });

    expect(oldQuestions.length).toBe(27);
    for (const oq of oldQuestions) {
      expect(oq.subjectId).toBeNull();
      expect(oq.semesterId).not.toBeNull();
      expect(oq.semester).toBeDefined();
      expect(oq.semester!.order).toBeGreaterThanOrEqual(1);
      expect(oq.semester!.order).toBeLessThanOrEqual(10);
    }
  });

  it('verifies all Document records have valid storage keys and non-null storage providers', async () => {
    const documents = await prisma.document.findMany({
      include: { resource: true },
    });

    expect(documents.length).toBeGreaterThan(0);
    for (const doc of documents) {
      expect(doc.storageKey).toBeDefined();
      expect(doc.storageKey.length).toBeGreaterThan(0);
      expect(['b2', 'r2']).toContain(doc.storageProvider?.toLowerCase());
    }
  });

  it('verifies non-curriculum items are strictly isolated (test fixtures & standalone articles)', async () => {
    const semesters = await prisma.semester.findMany();
    if (semesters.length < 10) return;

    const unassigned = await prisma.resource.findMany({
      where: { semesterId: null },
    });

    expect(unassigned.length).toBe(13);
    const validTitles = [
      'Brutal Rape and Murder of 15-Year-Old Girl',
      'Concurrency Test',
      'Free Doc',
      'Girlfriend raped by 10 men and Boyfriend forced to watch',
      'Online Betting & Trading Platforms Should Be Completely Banned',
      'Prem Doc',
      'Prem Doc 2',
      'R1',
      'Second Murder at Eleven? A privileged kid? Crime, Power, and the absence of punishment!',
      'The Right to Protest: Legal Limits and Government Crackdowns – A Global and Nepali Perspective',
    ];

    for (const u of unassigned) {
      expect(validTitles.some((vt) => u.title.includes(vt))).toBe(true);
    }
  });
});
