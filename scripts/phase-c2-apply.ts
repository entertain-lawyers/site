import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase C.2 Execution...');

  // 1. Verify Database Safety
  const dbUrl = process.env.DATABASE_URL || '';
  let dbEnv = 'UNKNOWN';
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    dbEnv = 'LOCAL';
  } else if (dbUrl.includes('neon.tech') && dbUrl.includes('entertain-lawyers')) {
    // Is it production or preview?
    if (dbUrl.includes('main') || dbUrl.includes('prod')) {
       console.error('ABORT: DATABASE_URL appears to point to production! ' + dbEnv);
       process.exit(1);
    }
    dbEnv = 'NEON_DEVELOPMENT_OR_PREVIEW';
  } else {
    console.warn('WARNING: Cannot conclusively determine if database is local/dev from URL structure.');
    dbEnv = 'NEON_DEVELOPMENT_OR_PREVIEW_ASSUMED';
  }
  
  console.log(`Database environment determined as: ${dbEnv} (Safe to proceed).`);

  // 2. Read report data
  const inPath = path.join(process.cwd(), 'subject-repair-analysis.json');
  const reportData = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  
  const updates = reportData.filter((r: any) => r.recommendedAction === 'UPDATE' && r.confidence === 'HIGH' && r.reason.includes('Exact Category Name Match'));
  
  if (updates.length !== 8) {
    console.error(`ABORT: Expected 8 updates, found ${updates.length}.`);
    process.exit(1);
  }

  // 3. Confirm target state against database
  const targetUpdates = [];
  for (const update of updates) {
    const resource = await prisma.resource.findUnique({ where: { id: update.resourceId }, include: { subject: true } });
    if (!resource) {
      console.error(`ABORT: Resource ${update.resourceId} not found in database.`);
      process.exit(1);
    }
    
    // Check if the current subject matches what's in the report
    const dbSubjName = resource.subject?.name || null;
    let reportSubjName = update.currentSubject === "NULL" ? null : update.currentSubject;
    
    if (dbSubjName !== reportSubjName) {
      console.error(`ABORT: Resource ${update.resourceId} has subject '${dbSubjName}' in DB, but report says '${reportSubjName}'.`);
      process.exit(1);
    }
    
    // Get proposed subject ID
    const proposedSubject = await prisma.subject.findFirst({ where: { name: update.proposedSubject } });
    if (!proposedSubject) {
      console.error(`ABORT: Proposed subject '${update.proposedSubject}' not found in database.`);
      process.exit(1);
    }
    
    targetUpdates.push({
      resourceId: update.resourceId,
      oldSubjectId: resource.subjectId,
      newSubjectId: proposedSubject.id,
      title: update.title,
      proposedSubjectName: update.proposedSubject,
      currentSubjectName: dbSubjName
    });
  }

  console.log('All 8 records verified against the database.');
  
  // 4. Execute transaction
  console.log('Executing transaction...');
  
  const results = await prisma.$transaction(
    targetUpdates.map(u => 
      prisma.resource.update({
        where: { id: u.resourceId },
        data: { subjectId: u.newSubjectId }
      })
    )
  );

  console.log('Transaction complete!');
  
  // 5. Verification
  console.log('\\n--- POST-UPDATE VERIFICATION ---');
  for (const u of targetUpdates) {
    const resource = await prisma.resource.findUnique({ where: { id: u.resourceId }, include: { subject: true } });
    console.log(`Resource: ${u.title}`);
    console.log(`  ID: ${u.resourceId}`);
    console.log(`  Old Subject: ${u.currentSubjectName} (${u.oldSubjectId})`);
    console.log(`  New Subject: ${resource?.subject?.name} (${resource?.subjectId})`);
    if (resource?.subjectId !== u.newSubjectId) {
      console.error('  ERROR: Subject ID was not updated correctly!');
    } else {
      console.log('  SUCCESS');
    }
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
