const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {};
  data.semesters = await prisma.semester.count();
  data.subjects = await prisma.subject.count();
  data.units = await prisma.unit.count();
  data.resources = await prisma.resource.count();
  data.documents = await prisma.document.count();

  const resourcesByType = await prisma.resource.groupBy({
    by: ['type'],
    _count: true,
  });
  data.resourcesByType = resourcesByType;

  const resourcesByStatus = await prisma.resource.groupBy({
    by: ['status'],
    _count: true,
  });
  data.resourcesByStatus = resourcesByStatus;

  data.resourceSubjectNull = await prisma.resource.count({ where: { subjectId: null } });
  data.resourceSubjectNotNull = await prisma.resource.count({ where: { subjectId: { not: null } } });
  data.resourceUnitNull = await prisma.resource.count({ where: { unitId: null } });
  data.resourceUnitNotNull = await prisma.resource.count({ where: { unitId: { not: null } } });

  data.resourcesWithDocument = await prisma.resource.count({ where: { documentId: { not: null } } });
  data.resourcesWithoutDocument = await prisma.resource.count({ where: { documentId: null } });

  const semesters = await prisma.semester.findMany({ include: { subjects: true } });
  data.semesterToSubject = semesters.map(s => ({ name: s.name, subjects: s.subjects.length }));

  const subjects = await prisma.subject.findMany({ include: { units: true } });
  data.subjectToUnit = subjects.map(s => ({ name: s.name, units: s.units.length }));

  const units = await prisma.unit.findMany({ include: { resources: true } });
  data.unitToResource = units.map(u => ({ title: u.title, resources: u.resources.length }));

  data.documentsList = await prisma.document.findMany({
    include: { resource: true }
  });

  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
