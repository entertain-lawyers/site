const http = require('http');

const routes = [
    '/',
    '/study',
    '/resources',
    '/pricing',
    '/blogs',
    '/news',
    '/historical-facts',
    '/study/1st-semester',
    '/resources/a7a7261a-0359-5ca7-a5ec-9f66858e376a'
];

async function measure(path) {
    return new Promise((resolve) => {
        const start = performance.now();
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            const ttfb = performance.now() - start;
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const total = performance.now() - start;
                resolve({ path, ttfb, total, status: res.statusCode, size: data.length });
            });
        });
        req.on('error', (e) => resolve({ path, error: e.message }));
    });
}

async function run() {
    console.log("Measuring Baseline...");
    for (const r of routes) {
        const res = await measure(r);
        if (res.error) console.log(res.path, "Error", res.error);
        else console.log(`Path: ${res.path.padEnd(40)} | TTFB: ${(res.ttfb/1000).toFixed(2)}s | Total: ${(res.total/1000).toFixed(2)}s | Size: ${(res.size/1024).toFixed(1)} KB`);
    }
}
run();
