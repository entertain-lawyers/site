const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const e = await prisma.event.findFirst({ where: { featuredImage: { contains: 'placeholder' } } });
  const p = await prisma.publication.findFirst({ where: { coverImage: { contains: 'placeholder' } } });
  const g = await prisma.galleryImage.findFirst({ where: { url: { contains: 'placeholder' } } });
  console.log("Events:", e);
  console.log("Publications:", p);
  console.log("GalleryImages:", g);
}
run().then(() => prisma.$disconnect());
