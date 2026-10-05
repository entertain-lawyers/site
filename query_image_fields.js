const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const g = await prisma.gallery.findFirst({ select: { id: true, imageUrl: true }});
  const e = await prisma.event.findFirst({ select: { id: true, imageUrl: true }});
  const p = await prisma.publication.findFirst({ select: { id: true, coverImage: true }});
  console.log("Gallery:", g);
  console.log("Event:", e);
  console.log("Publication:", p);
}
run().then(() => prisma.$disconnect());
