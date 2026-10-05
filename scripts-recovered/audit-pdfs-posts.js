const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const posts = await prisma.post.findMany({
        where: { title: { contains: '10th Semester' } },
        select: { id: true, title: true, type: true }
    });
    console.log("Found posts:", JSON.stringify(posts, null, 2));
}
run().finally(() => prisma.$disconnect());
