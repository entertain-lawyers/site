const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const posts = await prisma.post.count();
    const resources = await prisma.resource.count();
    const docs = await prisma.document.count();
    const semesters = await prisma.semester.count();
    const subjects = await prisma.subject.count();
    const redirects = await prisma.redirect.count();
    
    // Auth
    const users = await prisma.user.count();
    const accounts = await prisma.account.count();
    
    console.log(`Posts: ${posts} (Expected 75 migrated + any dummies)`);
    console.log(`Resources: ${resources} (Expected 155 migrated + 6 dummies = 161)`);
    console.log(`Documents: ${docs} (Expected 21 migrated + 4 dummies = 25)`);
    console.log(`Semesters: ${semesters} (Expected 3 migrated + 2 dummies = 5)`);
    console.log(`Subjects: ${subjects} (Expected 3 migrated + 2 dummies = 5)`);
    console.log(`Redirects: ${redirects} (Expected 210)`);
    console.log(`Users: ${users} (Expected 7)`);
    console.log(`Accounts: ${accounts} (Expected 1)`);
    await prisma.$disconnect();
}
run();
