const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.post.findUnique({ where: { id: 'e928c98a-29f6-5e4e-95ae-7712d1a89d1d' } });
  console.log(p);
}
main().finally(() => prisma.$disconnect());
