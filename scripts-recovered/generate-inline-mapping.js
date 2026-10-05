const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function run() {
    const media = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/media.json'), 'utf8'));
    
    // Create lookup map: originalFilename -> sha256
    const mediaMap = new Map();
    for (const m of media) {
        if (!m.isMissing) {
            mediaMap.set(m.originalFilename, m.sha256);
        }
    }

    const posts = await prisma.post.findMany({
        where: {
            content: {
                contains: 'wp-content/uploads'
            }
        },
        select: {
            id: true,
            title: true,
            content: true
        }
    });

    console.log(`Found ${posts.length} posts with inline media references.`);
    
    let report = "# Phase 7A Inline URL Rewrite Mapping\n\n";
    let unmappedCount = 0;
    
    for (const post of posts) {
        // Regex to find image src attributes with wp-content/uploads
        const regex = /src="([^"]*wp-content\/uploads\/[^"]+)"/g;
        let match;
        const matches = [];
        while ((match = regex.exec(post.content)) !== null) {
            matches.push(match[1]);
        }
        
        if (matches.length > 0) {
            report += `### Post ID: ${post.id} (${post.title})\n`;
            for (const url of matches) {
                // Extract filename
                const filename = url.split('/').pop();
                const sha256 = mediaMap.get(filename);
                
                report += `- Original URL: ${url}\n`;
                if (sha256) {
                    const b2Url = `https://s3.us-east-005.backblazeb2.com/entertainlawyers/editorial/media/${sha256}/${filename}`;
                    report += `  - Target URL: ${b2Url}\n`;
                } else {
                    report += `  - Target URL: [UNMAPPED - Missing from media.json]\n`;
                    unmappedCount++;
                }
            }
            report += `\n`;
        }
    }
    
    fs.writeFileSync(path.join(__dirname, '../docs/PHASE7A_INLINE_URL_MAPPING.md'), report);
    console.log(`Report generated. Unmapped references: ${unmappedCount}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
