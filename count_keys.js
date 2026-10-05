const { PrismaClient } = require('@prisma/client');
async function run() {
    const prisma = new PrismaClient();
    const existingPostKeys = await prisma.post.findMany({ select: { id: true }});
    console.log(existingPostKeys.length);
    await prisma.$disconnect();
}
run();
