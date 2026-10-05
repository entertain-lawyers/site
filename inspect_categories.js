const fs = require('fs');
const data = JSON.parse(fs.readFileSync('wp_posts_grouped.json', 'utf8'));

const targets = {
  114: "Criminal Law-II",
  137: "Intellectual Property Law",
  142: "Labour Law",
  122: "Family Law",
  104: "Civil (Precedent)",
  105: "Criminal (Precedent)",
  106: "Writs (Precedent)",
  129: "Criminology and Penology",
  143: "Election Law",
  150: "Fiscal Law",
  151: "Gender and Inclusive Justice",
  147: "Interpretation of Law",
  128: "Juvenile Delinquency",
  139: "Law of Banking and Negotiable Instruments",
  148: "Social Work and Social Welfare Law",
  146: "Socio Economic Crime",
  149: "Corporate Law and Management"
};

for (const [catId, catName] of Object.entries(targets)) {
  console.log(`\n=== ${catName} (ID: ${catId}) ===`);
  const posts = data[catId] || [];
  console.log(`Total Posts: ${posts.length}`);
  posts.slice(0, 5).forEach(p => console.log(`- [${p.id}] ${p.title}`));
}
