const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const fixId = (model) => {
    const regex = new RegExp(`(model ${model} \\{[\\s\\S]*?id\\s+String\\s+@id)\\s*\\n`, 'g');
    schema = schema.replace(regex, '$1 @default(uuid())\n');
};

const fixUpdatedAt = (model) => {
    const regex = new RegExp(`(model ${model} \\{[\\s\\S]*?updatedAt\\s+DateTime)\\s*\\n`, 'g');
    schema = schema.replace(regex, '$1 @updatedAt\n');
};

const models = ['Event', 'FAQ', 'Gallery', 'GalleryImage', 'Publication', 'Redirect', 'Tag', 'Category'];
models.forEach(fixId);
models.forEach(fixUpdatedAt);

// User createdAt/updatedAt
schema = schema.replace(/createdAt\s+DateTime\s+@default\(now\(\)\)/g, 'createdAt     DateTime             @default(now())');
schema = schema.replace(/updatedAt\s+DateTime\s+@default\(now\(\)\)/g, 'updatedAt     DateTime             @updatedAt');

fs.writeFileSync('prisma/schema.prisma', schema);
