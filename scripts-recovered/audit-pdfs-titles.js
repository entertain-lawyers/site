const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const resources = await prisma.resource.findMany({
        select: { id: true, title: true, type: true }
    });
    
    console.log("Found resources:", resources.length);
    for (let i = 0; i < Math.min(20, resources.length); i++) {
        console.log(`- ${resources[i].title} (${resources[i].type})`);
    }
}
run().finally(() => prisma.$disconnect());
