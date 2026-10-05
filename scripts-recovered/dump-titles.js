const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const resources = await prisma.resource.findMany({ select: { id: true, title: true }});
    console.log(JSON.stringify(resources, null, 2));
}
run().finally(() => prisma.$disconnect());
