const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');

const gzStream = fs.createReadStream('wordpress-migration-source/english/entertainlawyers-english.sql.gz');
const gunzip = zlib.createGunzip();
const rl = readline.createInterface({
  input: gzStream.pipe(gunzip),
  crlfDelay: Infinity
});

let inWpPosts = false;
let inWpPostMeta = false;

rl.on('line', (line) => {
  if (line.startsWith('INSERT INTO `wp_posts`')) {
      inWpPosts = true;
      inWpPostMeta = false;
  } else if (line.startsWith('INSERT INTO `wp_postmeta`')) {
      inWpPosts = false;
      inWpPostMeta = true;
  } else if (line.startsWith('INSERT INTO')) {
      inWpPosts = false;
      inWpPostMeta = false;
  }
  
  if (inWpPosts && line.includes('3907')) {
      // Very naive split just to see the rows that match
      const tuples = line.split('),(');
      for (const t of tuples) {
          if (t.startsWith('3907,') || t.includes(',3907,')) {
              console.log("WP_POSTS MATCH:", t.substring(0, 500));
          }
      }
  }
  
  if (inWpPostMeta && line.includes('3907')) {
      const tuples = line.split('),(');
      for (const t of tuples) {
          if (t.includes(',3907,')) {
              console.log("WP_POSTMETA MATCH:", t.substring(0, 500));
          }
      }
  }
});
