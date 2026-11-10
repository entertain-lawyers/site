import * as cheerio from 'cheerio';

async function testFetch() {
  const url = 'https://entertainlawyers.vercel.app/semesters/6d1892ea-c16f-57f7-b850-98642803c338';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Page Title:', $('title').text());
  console.log('Sections found:', $('section').length);

  $('section').each((i, sec) => {
    const title = $(sec).find('h2').first().text().trim();
    const links = $(sec).find('a[href^="/resources/"]');
    console.log(`Section ${i+1}: "${title}" - Resources count: ${links.length}`);
    if (title.includes('Family Law')) {
      links.each((j, a) => {
        console.log(`   Link ${j+1}: ${$(a).text().trim()} -> ${$(a).attr('href')}`);
      });
    }
  });
}

testFetch().catch(console.error);
