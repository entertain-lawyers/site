// Mock process.cwd and window
process.cwd = () => __dirname;

const originalEnv = process.env.NODE_ENV;
let errorThrown = false;

try {
  process.env.NODE_ENV = 'production';
  // Deliberately empty R2_PUBLIC_BUCKET_NAME to trigger error
  delete process.env.R2_PUBLIC_BUCKET_NAME;
  
  // Require fresh
  require('ts-node').register({ transpileOnly: true });
  require('./src/lib/storage/index.ts');
  
} catch (e) {
  errorThrown = true;
  console.log("Error correctly thrown:", e.message);
} finally {
  process.env.NODE_ENV = originalEnv;
}

if (!errorThrown) {
  console.error("Test failed: Error was NOT thrown for missing config in production!");
  process.exit(1);
} else {
  console.log("Test passed: Fallback successfully eliminated.");
}
