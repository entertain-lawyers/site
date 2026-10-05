const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

async function run() {
  const posts = await prisma.post.findMany({
    where: { content: { contains: '/api/media/' } },
    take: 5
  });
  
  if (posts.length === 0) {
    console.log("No posts with inline /api/media images found.");
  }

  for (const post of posts) {
    const matches = post.content.match(/\/api\/media\/[a-zA-Z0-9_\-\.\/]+/g);
    if (matches) {
      for (const match of matches) {
        console.log("Testing:", match);
        const url = `https://entertainlawyers.netlify.app${match}`;
        https.get(url, (res) => {
          console.log(`[${res.statusCode}] ${url}`);
          if (res.statusCode >= 300 && res.statusCode < 400) {
            console.log(`  -> Redirects to: ${res.headers.location}`);
          }
        });
      }
    }
  }
}
run().then(() => setTimeout(() => prisma.$disconnect(), 3000));
