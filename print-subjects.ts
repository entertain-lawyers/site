import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.subject.findMany().then(subs => { 
  console.log(subs.map(s => s.name).sort().join('\n'));
  prisma.$disconnect();
});
