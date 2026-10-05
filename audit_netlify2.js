const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cheerio = require('cheerio');
const https = require('https');

const BASE_URL = 'https://entertainlawyers.netlify.app';

function req(path) {
  return new Promise((resolve) => {
    https.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    }).on('error', (err) => resolve({ path, status: 'ERROR', error: err.message, data: '' }));
  });
}

async function audit() {
  console.log("=== RE-RUNNING PHASE 1 AUDIT ===");
  
  const routes = ['/', '/about', '/contact', '/blogs', '/news', '/resources', '/study', '/pricing', '/login'];
  
  for (const route of routes) {
    const res = await req(route);
    console.log(`[${res.status}] ${route}`);
    if (res.status === 200) {
      const $ = cheerio.load(res.data);
      $('script, style, noscript').remove(); // Strip scripts to only get rendered DOM text
      
      const text = $('body').text().toLowerCase();
      
      const issues = [];
      if (text.includes('lorem ipsum')) issues.push('Lorem ipsum found');
      // "undefined" as an exact word boundary so we don't catch random stuff
      if (/\bundefined\b/i.test(text)) issues.push('"undefined" text found');
      if (/\bnan\b/i.test(text) && !text.includes('finance')) issues.push('"NaN" text found');
      if (text.includes('coming soon')) issues.push('"Coming soon" found');
      
      const images = [];
      $('img').each((i, el) => images.push($(el).attr('src')));
      const placeholders = images.filter(src => src && (src.includes('placeholder') || src.startsWith('data:image')));
      // Next.js uses data:image/gif;base64,R0lGOD... for placeholders when loading, so let's ignore that standard one
      const badImages = placeholders.filter(src => !src.includes('R0lGOD'));
      
      if (badImages.length > 0) issues.push(`Placeholder images: ${badImages.length}`);
      
      if (issues.length > 0) {
        console.log(`  -> ISSUES: ${issues.join(', ')}`);
      }
    }
  }
}

audit().then(() => prisma.$disconnect());
