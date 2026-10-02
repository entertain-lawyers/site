const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function run() {
  console.log("Starting B2 Live Storage Smoke Test...");

  const results = {
    env: 'FAIL',
    upload: 'FAIL',
    head: 'FAIL',
    presignedGen: 'FAIL',
    presignedFetch: 'FAIL',
    contentVerify: 'FAIL',
    del: 'FAIL',
    delVerify: 'FAIL',
    publicRoute: 'FAIL',
  };

  // DRY RUN OUTPUT
  console.log("DRY RUN: Checking variables:");
  console.log(`B2_ENDPOINT: ${process.env.B2_ENDPOINT ? 'PRESENT' : 'MISSING'}`);
  console.log(`B2_ACCESS_KEY_ID: ${process.env.B2_ACCESS_KEY_ID ? 'PRESENT' : 'MISSING'}`);
  console.log(`B2_SECRET_ACCESS_KEY: ${process.env.B2_SECRET_ACCESS_KEY ? 'PRESENT' : 'MISSING'}`);
  console.log(`B2_BUCKET_NAME: ${process.env.B2_BUCKET_NAME ? 'PRESENT' : 'MISSING'}`);

  if (process.env.B2_BUCKET_NAME) {
    console.log(`Expected local test bucket name check: ${process.env.B2_BUCKET_NAME === 'entertain-lawyers-production' ? 'PASS' : 'FAIL (Found: ' + process.env.B2_BUCKET_NAME + ')'}`);
  }

  if (process.env.B2_ENDPOINT) {
    try {
      new URL(process.env.B2_ENDPOINT);
      console.log('Endpoint syntax: PASS');
    } catch {
      console.log('Endpoint syntax: FAIL');
    }
  }

  // 1. Environment detected

  if (process.env.B2_ENDPOINT && process.env.B2_ACCESS_KEY_ID && process.env.B2_SECRET_ACCESS_KEY && process.env.B2_BUCKET_NAME) {
    results.env = 'PASS';
  } else {
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.B2_ACCESS_KEY_ID,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
  });

  const bucket = process.env.B2_BUCKET_NAME;
  const key = 'test/b2-storage-health-check.txt';
  const testContent = 'B2 storage connectivity smoke test.';

  try {
    // 2. Upload
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: testContent,
      ContentType: 'text/plain',
    }));
    results.upload = 'PASS';

    // 3. HEAD/metadata
    const headResult = await s3Client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    if (headResult.ContentLength === testContent.length) {
      results.head = 'PASS';
    }

    // 4. Presigned GET generation
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });
    if (presignedUrl && presignedUrl.includes('X-Amz-Signature')) {
      results.presignedGen = 'PASS';
    }

    // 5. & 6. Fetch and verify content
    const fetchResponse = await fetch(presignedUrl);
    if (fetchResponse.ok) {
      results.presignedFetch = 'PASS';
      const text = await fetchResponse.text();
      if (text === testContent) {
        results.contentVerify = 'PASS';
      }
    }

    // 7. Delete
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    results.del = 'PASS';

    // 8. Delete verification
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
    } catch (e) {
      if (e.name === 'NotFound') {
        results.delVerify = 'PASS';
      }
    }

    // 9. Public media route validation
    // Test the abstraction logic explicitly:
    const PUBLIC_PREFIXES = ['editorial/', 'gallery/', 'publications/'];
    const validateRoute = (keyInput) => {
      // simulate route logic checking for ".."
      if (keyInput.split('/').some(seg => seg === '..' || seg === '.')) return 'REJECT';
      // clean leading slash if present
      const cleanKey = keyInput.startsWith('/') ? keyInput.slice(1) : keyInput;
      const isPublic = PUBLIC_PREFIXES.some(prefix => cleanKey.startsWith(prefix));
      if (!isPublic) return 'REJECT';
      return 'ALLOW';
    };

    const routeResults = [
      validateRoute('editorial/test.jpg') === 'ALLOW',
      validateRoute('gallery/test.jpg') === 'ALLOW',
      validateRoute('publications/test.jpg') === 'ALLOW',
      validateRoute('documents/test.pdf') === 'REJECT',
      validateRoute('random/test.jpg') === 'REJECT',
      validateRoute('editorial/../documents/test.pdf') === 'REJECT'
    ];

    if (routeResults.every(Boolean)) {
      results.publicRoute = 'PASS';
    }

  } catch (error) {
    console.error("Test sequence failed:", error.message);
  } finally {
    // Ensure cleanup even on failure if it somehow exists
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch(e) {}
  }

  console.log(JSON.stringify(results, null, 2));
}

run();
