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
  console.log("=== PHASE 1: NETLIFY STAGING AUDIT ===");
  
  const routes = ['/', '/about', '/contact', '/blogs', '/news', '/resources', '/study', '/pricing', '/login', '/admin'];
  
  for (const route of routes) {
    const res = await req(route);
    console.log(`[${res.status}] ${route}`);
    if (res.status === 200) {
      const $ = cheerio.load(res.data);
      const text = $('body').text().toLowerCase();
      
      const issues = [];
      if (text.includes('lorem ipsum')) issues.push('Lorem ipsum found');
      if (text.includes('undefined')) issues.push('"undefined" text found');
      if (text.includes('nan') && !text.includes('finance')) issues.push('"NaN" text found (maybe)');
      if (text.includes('coming soon')) issues.push('"Coming soon" found');
      
      const images = [];
      $('img').each((i, el) => images.push($(el).attr('src')));
      const placeholders = images.filter(src => src && (src.includes('placeholder') || src.startsWith('data:image')));
      if (placeholders.length > 0) issues.push(`Placeholder images: ${placeholders.length}`);
      
      if (issues.length > 0) {
        console.log(`  -> ISSUES: ${issues.join(', ')}`);
      }
    } else if (res.status >= 300 && res.status < 400) {
      console.log(`  -> Redirects to: ${res.headers.location}`);
    }
  }

  console.log("\n=== Checking Specific Resources ===");
  const resources = await prisma.resource.findMany({ take: 5, select: { id: true, title: true } });
  for (const r of resources) {
    const res = await req(`/resources/${r.id}`);
    console.log(`[${res.status}] /resources/${r.id} (${r.title})`);
  }

  console.log("\n=== Checking WP 3907 PDF Split ===");
  const splitResources = await prisma.resource.findMany({
    where: { OR: [{ id: 'e2a93f0d-8456-5361-bd37-86cef34fbf82' }, { id: '1cbfe25a-658b-5cf4-9d36-f9d72df004a3' }] },
    select: { id: true, title: true, type: true }
  });
  for (const r of splitResources) {
    const res = await req(`/resources/${r.id}`);
    console.log(`[${res.status}] WP 3907 split /resources/${r.id} (${r.title})`);
  }

  console.log("\n=== Checking B2 Media Routes ===");
  // Test public route rejection for private document
  const privateRes = await req('/api/media/documents/test.pdf');
  console.log(`[${privateRes.status}] /api/media/documents/test.pdf`);
  
  // Test an actual public image (find one from DB or just hit a known route if possible)
  const imagePost = await prisma.post.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, title: true }});
  if (imagePost) {
    console.log(`Note: Posts use inline content images. We can test one via app logic.`);
  }

}

audit().then(() => prisma.$disconnect());
