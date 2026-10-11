import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const c2_ids = [
  "0f2870b3-8870-5124-9e35-8a6073831edf",
  "218c93e5-0f08-51d7-8dd0-1c1b394a8a0c",
  "41ad1212-cf82-5a31-aa43-b35296ec7b82",
  "e666e6e3-87ea-55db-82e7-c7afb4abd356",
  "1133d3a5-c6e7-52c9-b758-a24107d953e4",
  "83a7eece-474d-53f9-bbd8-a7a7241ace16",
  "2e6a0f88-43e3-5f08-8c71-dff15fe8d7e8",
  "c9a85a73-5fd1-52b8-8711-b516837dfc68"
];

const c4_ids = [
  "c25d48cc-d48c-579c-9709-a3d52eb176ef",
  "01effe0f-fb3c-5cbd-80f1-1ad54a1de946",
  "7cacce29-a332-5096-94b7-e24ef644f67d",
  "63933c8e-ec80-54e0-b861-c1b7a91eda06",
  "2daee338-7a9e-5750-8de1-9b6ccf947999",
  "10b10ec1-021d-59f5-a990-9e782e645632",
  "0a3846ed-cd73-566d-a8cd-58ca47d29c16",
  "63d46554-9e46-522a-a5b4-d8041c35b816"
];

async function main() {
  console.log('--- Phase C.5 Database Audit ---');
  
  const allIds = [...c2_ids, ...c4_ids];
  const resources = await prisma.resource.findMany({ 
    where: { id: { in: allIds } },
    include: { subject: { include: { semester: true } } }
  });

  console.log('\\n1. Verifying Phase C.2 and C.4 Resources:');
  for (const r of resources) {
    console.log(`- ${r.id}: ${r.title.substring(0,40)}... -> ${r.subject?.name} (${r.subject?.semester?.name})`);
  }

  // Specifically check Sitaram Kedia
  const sitaram = resources.find(r => r.title.includes('Sitaram Kedia'));
  console.log('\\n2. Sitaram Kedia Investigation:');
  console.log(`Title: ${sitaram?.title}`);
  console.log(`Subject assigned: ${sitaram?.subject?.name}`);
  console.log(`Semester of Subject: ${sitaram?.subject?.semester?.name}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
