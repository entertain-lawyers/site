const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const semesters = await prisma.semester.count();
  const subjects = await prisma.subject.findMany({
    orderBy: [{ semesterId: 'asc' }, { order: 'asc' }, { name: 'asc' }]
  });
  const units = await prisma.unit.count();
  const resources = await prisma.resource.count();
  const documents = await prisma.document.count();
  const purchases = await prisma.purchase.count();
  const entitlements = await prisma.entitlement.count();
  
  console.log(`Users: ${users}`);
  console.log(`Semesters: ${semesters}`);
  console.log(`Subjects Total: ${subjects.length}`);
  
  const semCounts = {};
  const semOrders = {};
  let duplicates = 0;
  
  for (const s of subjects) {
    semCounts[s.semesterId] = (semCounts[s.semesterId] || 0) + 1;
    if (!semOrders[s.semesterId]) semOrders[s.semesterId] = [];
    if (semOrders[s.semesterId].includes(s.order)) duplicates++;
    semOrders[s.semesterId].push(s.order);
  }
  
  console.log('Subject distribution per Semester:', semCounts);
  console.log('Duplicate Orders:', duplicates);
  
  for (const [semId, orders] of Object.entries(semOrders)) {
    console.log(`Semester ${semId} orders: min ${Math.min(...orders)}, max ${Math.max(...orders)}`);
  }

  console.log(`Units: ${units}`);
  console.log(`Resources: ${resources}`);
  console.log(`Documents: ${documents}`);
  console.log(`Purchases: ${purchases}`);
  console.log(`Entitlements: ${entitlements}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
