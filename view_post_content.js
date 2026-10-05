const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const post = await prisma.post.findFirst({
    where: { content: { contains: '<img' } }
  });
  if (post) {
    console.log(post.content.substring(0, 1000));
  } else {
    console.log("No posts with <img> found.");
  }
}
run().then(() => prisma.$disconnect());
