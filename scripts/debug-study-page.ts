import * as cheerio from 'cheerio';

async function verifyStudyPage() {
  const url = 'https://entertainlawyers.vercel.app/study';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Page Title:', $('title').text());
  console.log('Total links to resources:', $('a[href^="/resources/"]').length);
  
  // Let's check api/search as well
  const searchRes = await fetch('https://entertainlawyers.vercel.app/api/search?q=Family');
  const searchJson = await searchRes.json();
  console.log('API Search for "Family":', searchJson);
}

verifyStudyPage().catch(console.error);
