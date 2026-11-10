import fs from 'fs';

const files = [
  'migration-staging/manifest.json',
  'migration-staging-recovered/pdf_manifest.json',
  'migration-staging-recovered/phase7b-final-correction-plan.json',
  'scratch/wp_ne_cats.json'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    const stat = fs.statSync(f);
    console.log(`${f}: size = ${stat.size} bytes`);
  } else {
    console.log(`${f}: does not exist`);
  }
}
