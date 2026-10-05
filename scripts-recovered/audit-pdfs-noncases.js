const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const resources = await prisma.resource.findMany({ 
        where: { title: { not: { contains: 'Case' } } },
        select: { id: true, title: true }
    });
    console.log(JSON.stringify(resources, null, 2));
}
run().finally(() => prisma.$disconnect());
