const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {};
  data.User = await prisma.user.count();
  data.Account = await prisma.account.count();
  data.Session = await prisma.session.count();
  data.VerificationToken = await prisma.verificationToken.count();
  data.Semester = await prisma.semester.count();
  data.Subject = await prisma.subject.count();
  data.Unit = await prisma.unit.count();
  data.Resource = await prisma.resource.count();
  data.Document = await prisma.document.count();
  data.Post = await prisma.post.count();
  data.Redirect = await prisma.redirect.count();
  data.Purchase = await prisma.purchase.count();
  data.PaymentTransaction = await prisma.paymentTransaction.count();
  data.Subscription = await prisma.subscription.count();
  data.Entitlement = await prisma.entitlement.count();
  data.AccessLog = await prisma.accessLog.count();
  data.AuditLog = await prisma.auditLog.count();

  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
