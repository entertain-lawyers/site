async function inspectSearch() {
  const searchRes = await fetch('https://entertainlawyers.vercel.app/api/search?q=Family');
  const searchJson = await searchRes.json();
  console.log('Search Results for "Family":', JSON.stringify(searchJson, null, 2));
}

inspectSearch().catch(console.error);
