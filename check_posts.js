const { PrismaClient } = require('@prisma/client');
async function run() {
    const prisma = new PrismaClient();
    const posts = await prisma.post.findMany({ select: { id: true, metaTitle: true }});
    console.log(posts.slice(0, 5));
    await prisma.$disconnect();
}
run();
