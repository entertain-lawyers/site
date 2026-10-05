const fs = require('fs');

const loadJson = (filename) => {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (e) {
        return [];
    }
};

const source = loadJson('migration-staging-recovered/source-extracted.json');
const posts = loadJson('migration-staging-recovered/posts.json');
const resources = loadJson('migration-staging-recovered/resources.json');
const reviewQueue = loadJson('migration-staging-recovered/review-queue.json');
const skipped = loadJson('migration-staging-recovered/skipped.json');
const phase7b = loadJson('migration-staging-recovered/phase7b-final-correction-plan.json');

const wpPosts = source.filter(p => p.post_type === 'post' && p.post_status === 'publish');

const totals = {
    MIGRATED_POST: 0,
    MIGRATED_AS_RESOURCE: 0,
    PHASE_7B_RESOURCE: 0,
    REVIEW_HELD: 0,
    INTENTIONALLY_EXCLUDED: 0,
    REVISION_TRASH_IGNORED: 0,
    DUPLICATE_ALREADY_REPRESENTED: 0,
    GENUINELY_MISSING: 0,
    UNKNOWN: 0
};

const results = [];

const findPhase7B = (id) => {
    if(!phase7b || !phase7b.stageA) return null;
    return phase7b.stageA.find(x => x.wpId === String(id));
};

wpPosts.forEach(wp => {
    let classification = 'UNKNOWN';
    let target = 'N/A';
    
    const idNum = Number(wp.ID);

    // 1. Check posts.json
    const inPosts = posts.find(p => p.wordpressPostId === idNum);
    if (inPosts) {
        classification = 'MIGRATED_POST';
        target = inPosts.type || 'POST';
    }
    
    // 2. Check resources.json
    if (classification === 'UNKNOWN') {
        const inRes = resources.find(r => r.wordpressPostId === idNum);
        if (inRes) {
            classification = 'MIGRATED_AS_RESOURCE';
            target = inRes.type || 'RESOURCE';
        }
    }

    // 3. Check Phase 7B
    if (classification === 'UNKNOWN') {
        const p7 = findPhase7B(idNum);
        if (p7) {
            classification = 'PHASE_7B_RESOURCE';
            target = p7.resourceId;
        }
    }

    // 4. Check review queue
    if (classification === 'UNKNOWN') {
        const inReview = reviewQueue.find(r => r.wordpressPostId === idNum);
        if (inReview) {
            classification = 'REVIEW_HELD';
        }
    }

    // 5. Check skipped
    if (classification === 'UNKNOWN') {
        const inSkip = skipped.find(s => s.ID === idNum);
        if (inSkip) {
            const rsn = (inSkip.reason || '').toLowerCase();
            if (rsn.includes('duplicate')) {
                classification = 'DUPLICATE_ALREADY_REPRESENTED';
            } else if (rsn.includes('empty') || rsn.includes('invalid') || rsn.includes('no content')) {
                classification = 'INTENTIONALLY_EXCLUDED';
            } else {
                classification = 'INTENTIONALLY_EXCLUDED';
            }
        }
    }

    if (classification === 'UNKNOWN') {
        classification = 'GENUINELY_MISSING';
    }

    totals[classification]++;
    results.push({
        wpId: idNum,
        title: wp.post_title,
        postType: wp.post_type,
        classification,
        target
    });
});

console.log("CLASSIFICATION TOTALS:");
console.table(totals);
