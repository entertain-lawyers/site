const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PrismaClient } = require('@prisma/client');
const { generatePostId, generateResourceId } = require('./migration-identity');

const prisma = new PrismaClient();

async function run() {
    const reconData = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-post-resource-reconciliation.json'), 'utf8'));
    
    // Fetch deep details for the 11 Posts
    const postIds = reconData.filter(r => r.provisionalDisposition === 'B. SHOULD_BE_RESOURCE').map(r => r.neonRecord.id);
    const dbPosts = await prisma.post.findMany({
        where: { id: { in: postIds } },
        include: { author: true }
    });
    
    // Fetch redirect details
    const redirects = await prisma.redirect.findMany({
        where: { destination: { contains: '/news/' } } // we will filter in memory
    });
    
    // Check Phase 5 decisions again
    const phase5 = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-staging-recovered/phase5-decisions.json'), 'utf8'));
    
    const finalReport = [];
    
    for (const r of reconData) {
        let entry = { ...r };
        
        if (r.provisionalDisposition === 'B. SHOULD_BE_RESOURCE') {
            const dbPost = dbPosts.find(p => p.id === r.neonRecord.id);
            if (dbPost) {
                entry.dbPostDetails = {
                    id: dbPost.id,
                    title: dbPost.title,
                    slug: dbPost.slug,
                    contentLength: dbPost.content.length,
                    createdAt: dbPost.createdAt,
                    updatedAt: dbPost.updatedAt,
                    authorEmail: dbPost.author ? dbPost.author.email : null,
                    seoTitle: dbPost.seoTitle,
                    seoDescription: dbPost.seoDescription
                };
            }
            
            // Check Phase 5 decision for subject/semester
            const dec = phase5.find(d => d.source.wpPostId === r.wpPostId);
            entry.phase5Decision = dec;
            
            // Determine ResourceType
            entry.proposedResourceType = 'OLD_QUESTION'; // since all 11 are "Old Questions"
            
            // Target deterministic ID
            entry.targetResourceId = generateResourceId('english', r.wpPostId); // assuming english based on previous scripts
        }
        
        if (r.provisionalDisposition === 'D. NEEDS_BUSINESS_DECISION') {
            // Check Phase 5 decision just in case (probably none since they were dflip)
            const dec = phase5.find(d => d.source.wpPostId === r.wpPostId);
            entry.phase5Decision = dec;
            
            // Heuristics for ResourceType
            const title = (r.wpTitle || '').toLowerCase();
            const filename = r.pdfFilename.toLowerCase();
            
            let type = 'OTHER';
            if (title.includes('question') || filename.includes('question')) type = 'OLD_QUESTION';
            else if (title.includes('moot')) type = 'OTHER';
            else if (title.includes('clinical') || title.includes('conveyancing')) type = 'OTHER';
            else if (title.includes('syllabus')) type = 'OTHER';
            
            entry.proposedResourceType = type;
            entry.targetResourceId = generateResourceId('english', r.wpPostId);
        }
        
        finalReport.push(entry);
    }
    
    fs.writeFileSync(path.join(__dirname, '../migration-staging-recovered/phase7b-final-prep.json'), JSON.stringify(finalReport, null, 2));
    console.log("Prep complete");
}

run().finally(() => prisma.$disconnect());
