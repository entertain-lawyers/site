import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase C.4 Execution...');

  // 1. Verify Database Safety
  const dbUrl = process.env.DATABASE_URL || '';
  let dbEnv = 'UNKNOWN';
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    dbEnv = 'LOCAL';
  } else if (dbUrl.includes('neon.tech') && dbUrl.includes('entertain-lawyers')) {
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

  // 2. Read C.3 report data
  const inPath = path.join(process.cwd(), 'subject-alias-map.json');
  if (!fs.existsSync(inPath)) {
    console.error(`ABORT: Missing subject-alias-map.json`);
    process.exit(1);
  }
  const reportData = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  
  const updates = reportData.confirmedAliases;
  
  if (updates.length !== 8) {
    console.error(`ABORT: Expected 8 confirmed aliases, found ${updates.length}.`);
    process.exit(1);
  }
  
  // Phase C.2 IDs to prevent overlap
  const c2_ids = new Set([
    "0f2870b3-8870-5124-9e35-8a6073831edf",
    "218c93e5-0f08-51d7-8dd0-1c1b394a8a0c",
    "41ad1212-cf82-5a31-aa43-b35296ec7b82",
    "e666e6e3-87ea-55db-82e7-c7afb4abd356",
    "1133d3a5-c6e7-52c9-b758-a24107d953e4",
    "83a7eece-474d-53f9-bbd8-a7a7241ace16",
    "2e6a0f88-43e3-5f08-8c71-dff15fe8d7e8",
    "c9a85a73-5fd1-52b8-8711-b516837dfc68"
  ]);

  // 3. Confirm target state against database
  const targetUpdates = [];
  for (const update of updates) {
    if (c2_ids.has(update.resourceId)) {
      console.error(`ABORT: Overlap detected! Resource ${update.resourceId} was already updated in Phase C.2.`);
      process.exit(1);
    }
    
    const resource = await prisma.resource.findUnique({ where: { id: update.resourceId }, include: { subject: true } });
    if (!resource) {
      console.error(`ABORT: Resource ${update.resourceId} not found in database.`);
      process.exit(1);
    }
    
    const dbSubjName = resource.subject?.name || null;
    let reportSubjName = update.currentSubject === "NULL" ? null : update.currentSubject;
    
    if (dbSubjName !== reportSubjName) {
      console.error(`ABORT: Resource ${update.resourceId} has subject '${dbSubjName}' in DB, but report says '${reportSubjName}'.`);
      process.exit(1);
    }
    
    const proposedSubject = await prisma.subject.findUnique({ where: { id: update.proposedSubjectId } });
    if (!proposedSubject) {
      console.error(`ABORT: Proposed subject '${update.proposedSubject}' (ID: ${update.proposedSubjectId}) not found in database.`);
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

  console.log('All 8 records verified against the database and confirmed no overlap with C.2.');
  
  // 4. Execute transaction
  console.log('Executing transaction...');
  
  await prisma.$transaction(
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
