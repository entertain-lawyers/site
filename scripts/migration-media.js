const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../wordpress-migration-source');
const STAGING_DIR = path.join(__dirname, '../migration-staging');
const TMP_UPLOADS_DIR = '/tmp/wp-uploads';

function computeHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(file => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });
    return arrayOfFiles;
}

// Regex to detect WP thumbnail sizing pattern: e.g. -150x150.jpg, -768x432.png
const thumbRegex = /-\d{2,4}x\d{2,4}\.[a-zA-Z]{3,4}$/;

function run() {
    console.log("Extracting media archives...");
    execSync(`rm -rf ${TMP_UPLOADS_DIR}`);
    execSync(`mkdir -p ${TMP_UPLOADS_DIR}/english`);
    execSync(`mkdir -p ${TMP_UPLOADS_DIR}/nepali`);
    execSync(`unzip -q -o "${path.join(SRC_DIR, 'english', 'entertainlawyers-english-uploads.zip')}" -d ${TMP_UPLOADS_DIR}/english`);
    execSync(`unzip -q -o "${path.join(SRC_DIR, 'nepali', 'entertainlawyers-nepali-uploads.zip')}" -d ${TMP_UPLOADS_DIR}/nepali`);

    const mediaInventory = [];
    const hashSet = new Set();

    let originalCount = 0;
    let derivativeCount = 0;
    let pdfCount = 0;
    let duplicateCount = 0;

    for (const site of ['english', 'nepali']) {
        const siteUploadsDir = path.join(TMP_UPLOADS_DIR, site);
        const files = getAllFiles(siteUploadsDir);

        for (const f of files) {
            const ext = path.extname(f).toLowerCase();
            const relPath = f.replace(siteUploadsDir + '/', '');
            const filename = path.basename(f);
            const size = fs.statSync(f).size;
            const hash = computeHash(f);

            let isDerivative = false;
            let mimeType = 'application/octet-stream';

            if (ext === '.pdf') {
                mimeType = 'application/pdf';
                pdfCount++;
            } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                mimeType = `image/${ext.replace('.', '')}`;
                if (thumbRegex.test(filename)) {
                    isDerivative = true;
                    derivativeCount++;
                } else {
                    originalCount++;
                }
            } else {
                originalCount++;
            }

            let isDuplicate = false;
            if (hashSet.has(hash)) {
                isDuplicate = true;
                duplicateCount++;
            } else {
                hashSet.add(hash);
            }

            mediaInventory.push({
                sourceSite: site,
                originalRelativePath: relPath,
                originalFilename: filename,
                extension: ext,
                mimeType,
                byteSize: size,
                sha256: hash,
                isDerivative,
                isDuplicate,
                referencedBy: [], // To be populated
                isMissing: false
            });
        }
    }

    // Cross-reference with HTML content
    console.log("Cross-referencing media with staged content...");
    const posts = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'posts.json'), 'utf-8'));
    const resources = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, 'resources.json'), 'utf-8'));

    let referencedCount = 0;
    let missingReferenceCount = 0;

    const allContent = [...posts, ...resources];

    const mediaMap = new Map(); // map filename to media record for quick lookup
    mediaInventory.forEach(m => mediaMap.set(m.originalFilename, m));

    allContent.forEach(item => {
        // Simple regex to find filenames in src="..." or href="..."
        const urls = [...item.content.matchAll(/(?:src|href)=["']([^"']+\.(?:jpg|jpeg|png|gif|pdf|webp))["']/gi)];

        urls.forEach(u => {
            const fullUrl = u[1];
            const filename = path.basename(fullUrl);

            // If the filename has query params e.g. image.jpg?v=123, strip them
            const cleanFilename = filename.split('?')[0];

            const mediaRecord = mediaMap.get(cleanFilename);
            if (mediaRecord) {
                mediaRecord.referencedBy.push({ model: item.type ? 'Resource' : 'Post', id: item.wordpressPostId });
                referencedCount++;
            } else {
                missingReferenceCount++;
                // Record the missing reference safely
                mediaInventory.push({
                    sourceSite: 'unknown',
                    originalRelativePath: fullUrl,
                    originalFilename: cleanFilename,
                    extension: path.extname(cleanFilename).toLowerCase(),
                    mimeType: 'unknown',
                    byteSize: 0,
                    sha256: null,
                    isDerivative: false,
                    isDuplicate: false,
                    referencedBy: [{ model: item.type ? 'Resource' : 'Post', id: item.wordpressPostId }],
                    isMissing: true
                });
            }
        });
    });

    // Split into media and documents (PDFs)
    const documents = mediaInventory.filter(m => m.extension === '.pdf');
    const standardMedia = mediaInventory.filter(m => m.extension !== '.pdf');

    fs.writeFileSync(path.join(STAGING_DIR, 'media.json'), JSON.stringify(standardMedia, null, 2));
    fs.writeFileSync(path.join(STAGING_DIR, 'documents.json'), JSON.stringify(documents, null, 2));

    console.log(`Media Staged: Total ${mediaInventory.length} | Originals: ${originalCount} | Derivatives: ${derivativeCount} | PDFs: ${pdfCount}`);
    console.log(`References: Found ${referencedCount} | Missing ${missingReferenceCount}`);
    execSync(`rm -rf ${TMP_UPLOADS_DIR}`); // Cleanup
}

run();
