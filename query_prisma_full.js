const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const semesters = await prisma.semester.findMany({
    include: {
      subjects: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { order: 'asc' }
  });
  
  const fs = require('fs');
  fs.writeFileSync('prisma_taxonomy.json', JSON.stringify(semesters, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
