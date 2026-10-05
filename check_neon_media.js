const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function run() {
    const prisma = new PrismaClient();
    const posts = await prisma.post.findMany({ select: { content: true } });
    
    let referencedImages = 0;
    
    const extractUrls = (content) => {
        if (!content) return [];
        const matches = [...content.matchAll(/(?:src|href)=["']([^"']+\.(?:jpg|jpeg|png|gif|pdf|webp))["']/gi)];
        return matches.map(m => m[1]);
    };
    
    const allUrls = [];
    for (const p of posts) allUrls.push(...extractUrls(p.content));
    
    console.log("Total referenced URLs in Neon Posts:", allUrls.length);
    await prisma.$disconnect();
}
run();
