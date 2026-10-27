import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

// pdf.js needs its worker as a separate same-origin file. Serving it from a
// third-party CDN was blocked by our Content-Security-Policy, which broke the
// secure reader for every paid PDF.
const require = createRequire(import.meta.url);
const source = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
const destination = resolve(process.cwd(), 'public/pdf.worker.min.mjs');

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);

console.log('Copied pdf.js worker to public/pdf.worker.min.mjs');
