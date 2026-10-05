const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DATABASE COUNTS ---');
  console.log('Users:', await prisma.user.count());
  
  const posts = await prisma.post.findMany({ select: { status: true }});
  const draftPosts = posts.filter(p => p.status === 'DRAFT').length;
  const pubPosts = posts.filter(p => p.status === 'PUBLISHED').length;
  console.log('Posts Total:', posts.length, 'DRAFT:', draftPosts, 'PUBLISHED:', pubPosts);
  
  const resources = await prisma.resource.count();
  console.log('Resources:', resources);

  console.log('Purchases:', await prisma.purchase.count());
  console.log('Entitlements:', await prisma.entitlement.count());
  console.log('Subscriptions:', await prisma.subscription.count());
  console.log('PaymentTransactions:', await prisma.paymentTransaction.count());
  console.log('AccessLogs:', await prisma.accessLog.count());
  console.log('AuditLogs:', await prisma.auditLog.count());
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
