const { PrismaClient } = require('@prisma/client');
async function run() {
    const prisma = new PrismaClient();
    
    const count = await prisma.redirect.count();
    console.log("Redirect count:", count);
    
    // Check for broken redirects
    const redirects = await prisma.redirect.findMany();
    let broken = 0;
    
    for (const r of redirects) {
        if (r.destination.startsWith('/resources/')) {
            const uuid = r.destination.split('/resources/')[1];
            const res = await prisma.resource.findUnique({ where: { id: uuid } });
            if (!res) broken++;
        }
        else if (r.destination.startsWith('/news/')) {
            const uuid = r.destination.split('/news/')[1];
            const post = await prisma.post.findUnique({ where: { id: uuid } });
            if (!post) broken++;
        }
    }
    
    console.log("Broken redirects pointing to nonexistent targets:", broken);
    
    await prisma.$disconnect();
}
run();
