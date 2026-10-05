const { PrismaClient } = require('@prisma/client');
async function run() {
    const prisma = new PrismaClient();
    const counts = {
        Users: await prisma.user.count(),
        Posts: await prisma.post.count(),
        Resources: await prisma.resource.count(),
        Semesters: await prisma.semester.count(),
        Subjects: await prisma.subject.count(),
        Units: await prisma.unit.count(),
        Documents: await prisma.document.count(),
        Redirects: await prisma.redirect.count(),
        Purchases: await prisma.purchase.count(),
        Entitlements: await prisma.entitlement.count(),
        Subscriptions: await prisma.subscription.count(),
        PaymentTransactions: await prisma.paymentTransaction.count(),
        AuditLogs: await prisma.auditLog.count()
    };
    console.log(JSON.stringify(counts, null, 2));
    
    // Verify subjectId mappings
    const nullSubjects = await prisma.resource.count({ where: { subjectId: null } });
    const nonNullSubjects = await prisma.resource.count({ where: { subjectId: { not: null } } });
    console.log(`NULL Subjects: ${nullSubjects}, Non-NULL: ${nonNullSubjects}`);
    
    await prisma.$disconnect();
}
run();
