const fs = require('fs');

const mediaFile = process.argv[2] || 'migration-staging-recovered/media.json';
const docsFile = process.argv[3] || 'migration-staging-recovered/documents.json';
const media = JSON.parse(fs.readFileSync(mediaFile, 'utf8'));
const docs = JSON.parse(fs.readFileSync(docsFile, 'utf8'));
const all = [...media, ...docs];

let physicalFiles = 0;
let uniqueImageTargets = 0;
let uniquePdfTargets = 0;
let totalUniqueTargets = 0;
let exactDuplicates = 0;

let originalImagesCount = 0;
let derivativesCount = 0;
let pdfsCount = 0;
let missingReferenceCount = 0;
let externalReferenceCount = 0;

const targetIdentitySet = new Set();
const filenameToHashes = new Map(); // filename -> Set of hashes
const hashToSizeExt = new Map(); // hash -> { size, ext }

let hashValidationFailed = false;

for (const m of all) {
    if (m.isExternal) {
        externalReferenceCount++;
        continue;
    }
    if (m.isMissing) {
        // Fallback for non-deduped file testing where isExternal isn't set yet
        if (m.originalRelativePath && m.originalRelativePath.startsWith('http')) {
            externalReferenceCount++;
            continue;
        }
        missingReferenceCount++;
        continue; // Do not count missing as physical
    }
    
    physicalFiles++;
    
    if (m.extension === '.pdf') {
        pdfsCount++;
    } else {
        if (m.isDerivative) derivativesCount++;
        else originalImagesCount++;
    }

    const identity = `${m.sha256}:${m.originalFilename}`;
    
    // Step 2 & 3: Classify
    if (targetIdentitySet.has(identity)) {
        exactDuplicates++;
    } else {
        targetIdentitySet.add(identity);
        totalUniqueTargets++;
        if (m.extension === '.pdf') {
            uniquePdfTargets++;
        } else {
            uniqueImageTargets++;
        }
    }
    
    // Step 4: Filename Collision Prep
    if (!filenameToHashes.has(m.originalFilename)) {
        filenameToHashes.set(m.originalFilename, new Set());
    }
    filenameToHashes.get(m.originalFilename).add(m.sha256);
    
    // Step 5: Hash Group Validation Prep
    if (hashToSizeExt.has(m.sha256)) {
        const existing = hashToSizeExt.get(m.sha256);
        // Only fail if size differs, OR if it's > 0 and extension differs
        if (existing.size !== m.byteSize || (m.byteSize > 0 && existing.ext !== m.extension)) {
            hashValidationFailed = true;
            console.error(`Hash validation failed for ${m.sha256} (Existing: size ${existing.size}, ext ${existing.ext} | Current: size ${m.byteSize}, ext ${m.extension})`);
        }
    } else {
        hashToSizeExt.set(m.sha256, { size: m.byteSize, ext: m.extension });
    }
}

// Compute Filename Collision Stats
let distinctFilenames = filenameToHashes.size;
let filenamesWithMultipleHashes = 0;
let totalDistinctHashVariants = 0;

for (const [filename, hashSet] of filenameToHashes.entries()) {
    if (hashSet.size > 1) {
        filenamesWithMultipleHashes++;
    }
    totalDistinctHashVariants += hashSet.size;
}

// Compute exact duplicate groups (How many targets had duplicates)
const duplicateGroups = physicalFiles - totalUniqueTargets; // This is exactDuplicates, but groups?
// A group is a unique identity that appeared > 1 times.
const identityCounts = new Map();
for (const m of all) {
    if (m.isMissing) continue;
    const identity = `${m.sha256}:${m.originalFilename}`;
    identityCounts.set(identity, (identityCounts.get(identity) || 0) + 1);
}
let exactDuplicateGroups = 0;
for (const count of identityCounts.values()) {
    if (count > 1) exactDuplicateGroups++;
}

console.log("=== COUNTS ===");
console.log(`Physical files: ${physicalFiles}`);
console.log(`Unique image targets: ${uniqueImageTargets}`);
console.log(`Unique PDF targets: ${uniquePdfTargets}`);
console.log(`Total unique targets: ${totalUniqueTargets}`);
console.log(`Exact duplicates: ${exactDuplicates}`);
console.log(`Missing reference: ${missingReferenceCount}`);
console.log(`External reference: ${externalReferenceCount}`);

console.log("\n=== SOURCE RECONCILIATION ===");
console.log(`Original Images: ${originalImagesCount}`);
console.log(`Derivatives: ${derivativesCount}`);
console.log(`PDFs: ${pdfsCount}`);

console.log("\n=== FILENAME COLLISION ANALYSIS ===");
console.log(`Distinct filenames: ${distinctFilenames}`);
console.log(`Filenames with >1 hash: ${filenamesWithMultipleHashes}`);
console.log(`Total distinct hash variants across filenames: ${totalDistinctHashVariants}`);
console.log(`Exact duplicate groups: ${exactDuplicateGroups}`);

console.log("\n=== HASH VALIDATION ===");
console.log(`Hash validation failed: ${hashValidationFailed}`);
