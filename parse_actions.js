const fs = require('fs');
const path = require('path');

const actionFiles = fs.readdirSync('src/modules/admin').filter(f => f.endsWith('.actions.ts')).map(f => path.join('src/modules/admin', f));

actionFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const hasRequireAdmin = content.includes('requireAdmin');
    const hasRequireAuth = content.includes('requireAuth');
    const hasPrisma = content.includes('prisma.');
    const hasFake = content.includes('TODO:') || content.includes('Not implemented') || content.includes('placeholder') || content.includes('mock');
    console.log(`${file}: auth=${hasRequireAuth || hasRequireAdmin}, db=${hasPrisma}, fake=${hasFake}`);
});
