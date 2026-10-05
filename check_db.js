const { PrismaClient } = require('@prisma/client');
async function run() {
    const prisma = new PrismaClient();
    const result = await prisma.$queryRaw`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'Resource' AND column_name = 'subjectId';
    `;
    console.log("Database schema:", result);
    await prisma.$disconnect();
}
run();
