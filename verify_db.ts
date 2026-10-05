import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Posts:', await prisma.post.count());
  console.log('Events:', await prisma.event.count());
  console.log('Publications:', await prisma.publication.count());
  console.log('Galleries:', await prisma.gallery.count());
  console.log('GalleryImages:', await prisma.galleryImage.count());
  console.log('FAQs:', await prisma.fAQ.count());
  console.log('Users:', await prisma.user.count());
  console.log('Semesters:', await prisma.semester.count());
  console.log('Subjects:', await prisma.subject.count());
  console.log('Units:', await prisma.unit.count());
  console.log('Resources:', await prisma.resource.count());
  console.log('Documents:', await prisma.document.count());
}

main().catch(console.error).finally(() => prisma.$disconnect());
