const https = require('https');

const BASE_URL = 'https://entertainlawyers.netlify.app';
const ROUTES = [
  '/',
  '/about',
  '/contact',
  '/explore',
  '/study',
  '/study/semesters',
  '/resources',
  '/pricing',
  '/news',
  '/blogs',
  '/nepali',
  '/privacy-policy',
  '/login',
  '/admin' // testing auth redirect / 403
];

const req = (path) => new Promise((resolve) => {
  const start = Date.now();
  https.get(`${BASE_URL}${path}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      resolve({
        path,
        status: res.statusCode,
        url: res.headers.location || `${BASE_URL}${path}`,
        time: Date.now() - start,
        hasError: data.includes('Error') || data.includes('500') || data.includes('Application error'),
        length: data.length
      });
    });
  }).on('error', (err) => {
    resolve({ path, status: 'ERROR', error: err.message, time: Date.now() - start });
  });
});

async function run() {
  console.log('Testing routes on', BASE_URL);
  for (const r of ROUTES) {
    const res = await req(r);
    console.log(`- ${res.path}: ${res.status} (${res.time}ms) [Length: ${res.length}] ErrorText? ${res.hasError}`);
    if (res.status >= 300 && res.status < 400) {
      console.log(`  -> Redirects to: ${res.url}`);
    }
  }
}
run();
