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
  
  console.log(JSON.stringify(semesters, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
