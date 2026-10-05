const fs = require('fs');

const f = 'src/modules/admin/admin-resource.actions.ts';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
`  // Delete related records manually to avoid foreign key constraints since there is no onDelete: Cascade
  await prisma.entitlement.deleteMany({ where: { resourceId: args.id } });
  await prisma.purchase.deleteMany({ where: { resourceId: args.id } });
  await prisma.uploadIntent.deleteMany({ where: { resourceId: args.id } });
  await prisma.accessLog.deleteMany({ where: { resourceId: args.id } });
  
  if (resource?.documentId) {
    // Delete the document record if it exists
    await prisma.document.delete({ where: { id: resource.documentId } });
  }

  await prisma.resource.delete({
    where: { id: args.id }
  });`,
`  // 1. Check dependencies to prevent destructive loss of history.
  const dependencies = await prisma.$transaction([
    prisma.purchase.count({ where: { resourceId: args.id } }),
    prisma.entitlement.count({ where: { resourceId: args.id } }),
    prisma.accessLog.count({ where: { resourceId: args.id } }),
  ]);
  
  const [purchaseCount, entitlementCount, accessCount] = dependencies;
  
  if (purchaseCount > 0 || entitlementCount > 0 || accessCount > 0) {
    throw new Error('This resource has existing purchases, entitlements, or access logs and cannot be physically deleted. Please Archive it instead.');
  }

  // Safe to delete if we reached here (e.g. genuinely disposable draft).
  // We can clean up ephemeral UploadIntents safely.
  await prisma.uploadIntent.deleteMany({ where: { resourceId: args.id } });
  
  // NOTE: We do not delete the document if it has access logs, but we already checked accessCount is 0!
  // However, a document could be shared? No, it's 1:1 with resource usually.
  // We will leave the Document orphaned for future async GC, ensuring total safety.

  await prisma.resource.delete({
    where: { id: args.id }
  });`
);

fs.writeFileSync(f, c);
console.log('Updated deleteResourceAction');
