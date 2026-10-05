const fs = require('fs');
let content = fs.readFileSync('scripts-recovered/migration-redirects.js', 'utf8');

const additional = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    let rCreated = 0, rUpdated = 0;
    
    for (const r of redirects) {
        if (!r.reviewRequired && r.targetPath) {
            const res = await prisma.redirect.upsert({
                where: { sourceUrl: r.originalUrl },
                update: {
                    targetUrl: r.targetPath,
                    statusCode: r.statusCode
                },
                create: {
                    sourceUrl: r.originalUrl,
                    targetUrl: r.targetPath,
                    statusCode: r.statusCode
                }
            });
            if (res.createdAt.getTime() === res.updatedAt.getTime()) rCreated++;
            else rUpdated++;
        }
    }
    await prisma.$disconnect();
    console.log(\`Database Import: \${rCreated} created, \${rUpdated} updated.\`);
`;

content = content.replace("console.log(`Redirects Staged", additional + "\n    console.log(`Redirects Staged");
fs.writeFileSync('scripts-recovered/migration-redirects.js', content);
