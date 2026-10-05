const fs = require('fs');
const prismaTaxonomy = JSON.parse(fs.readFileSync('prisma_taxonomy.json', 'utf8'));

const wpCategories = [
  { id: 113, name: "Case Law", parent: 0, posts: 6 },
  { id: 121, name: "Notes", parent: 0, posts: 0 },
  { id: 126, name: "Question Paper", parent: 0, posts: 10 },
  { id: 79, name: "Precedent", parent: 0, posts: 1 },
  { id: 104, name: "Civil", parent: 79, posts: 109 },
  { id: 105, name: "Criminal", parent: 79, posts: 45 },
  { id: 106, name: "Writs", parent: 79, posts: 85 },
  { id: 145, name: "Company Law and Governance", parent: 113, posts: 22 },
  { id: 123, name: "Contract Law-I", parent: 113, posts: 30 },
  { id: 135, name: "Contract Law-II", parent: 113, posts: 21 },
  { id: 149, name: "Corporate Law and Management", parent: 113, posts: 17 },
  { id: 115, name: "Criminal Law-I", parent: 113, posts: 11 },
  { id: 114, name: "Criminal Law-II", parent: 113, posts: 9 },
  { id: 129, name: "Criminology and Penology", parent: 113, posts: 7 },
  { id: 143, name: "Election Law", parent: 113, posts: 7 },
  { id: 127, name: "Environmental Law", parent: 113, posts: 8 },
  { id: 138, name: "Evidence Law", parent: 113, posts: 20 },
  { id: 122, name: "Family Law", parent: 113, posts: 19 },
  { id: 150, name: "Fiscal Law", parent: 113, posts: 1 },
  { id: 151, name: "Gender and Inclusive Justice", parent: 113, posts: 12 },
  { id: 137, name: "Intellectual Property Law", parent: 113, posts: 8 },
  { id: 147, name: "Interpretation of Law", parent: 113, posts: 4 },
  { id: 128, name: "Juvenile Delinquency", parent: 113, posts: 7 },
  { id: 142, name: "Labour Law", parent: 113, posts: 10 },
  { id: 139, name: "Law of Banking and Negotiable Instruments", parent: 113, posts: 15 },
  { id: 125, name: "Property Law", parent: 113, posts: 11 },
  { id: 148, name: "Social Work and Social Welfare Law", parent: 113, posts: 0 },
  { id: 146, name: "Socio Economic Crime", parent: 113, posts: 4 },
  { id: 144, name: "Taxation Law", parent: 113, posts: 0 },
  { id: 118, name: "Criminal Law Notes-I", parent: 121, posts: 0 },
  { id: 119, name: "Criminal Law Notes-II", parent: 121, posts: 0 }
];

// Helper to find subject in Prisma taxonomy
function findSubject(queryName) {
  for (const sem of prismaTaxonomy) {
    for (const sub of sem.subjects) {
      if (sub.name.toLowerCase() === queryName.toLowerCase() || 
          sub.name.toLowerCase().replace('law of ', '') === queryName.toLowerCase().replace(' law', '') ||
          sub.name.toLowerCase().includes(queryName.toLowerCase()) || 
          queryName.toLowerCase().includes(sub.name.toLowerCase())) {
        return { subject: sub.name, semester: sem.name, subId: sub.id, semId: sem.id };
      }
    }
  }
  return null;
}

const mappings = [];

for (const wp of wpCategories) {
  let proposedSemester = "UNRESOLVED";
  let proposedSubject = "UNRESOLVED";
  let confidence = "LOW";
  let reason = "No direct string match in Prisma schema.";
  let decision = "HUMAN DECISION REQUIRED";

  if (wp.parent === 0) {
     if (['Case Law', 'Notes', 'Question Paper', 'Precedent'].includes(wp.name)) {
        proposedSemester = "N/A (Parent Category)";
        proposedSubject = "N/A (Dictates ResourceType)";
        confidence = "HIGH";
        reason = "Root category dictates ResourceType Enum, not Semester/Subject.";
        decision = "N/A";
     }
  } else {
     const match = findSubject(wp.name);
     if (match) {
        proposedSemester = match.semester;
        proposedSubject = match.subject;
        confidence = "HIGH";
        reason = `Direct or strong substring match found in Prisma schema.`;
        decision = "Review mapping accuracy";
     } else {
        // Known ambiguous
        if (wp.name === 'Company Law and Governance') {
           const matchCompany = findSubject("Company Law");
           if (matchCompany) {
              proposedSemester = matchCompany.semester;
              proposedSubject = matchCompany.subject;
              confidence = "MEDIUM";
              reason = "Partial match on 'Company Law'. Requires verification if Governance is included.";
           }
        } else if (wp.name === 'Evidence Law') {
           const matchEv = findSubject("Law of Evidence");
           if (matchEv) {
              proposedSemester = matchEv.semester;
              proposedSubject = matchEv.subject;
              confidence = "HIGH";
              reason = "Semantic match ('Evidence Law' -> 'Law of Evidence').";
           }
        }
     }
  }

  mappings.push({
    wpCategoryId: wp.id,
    wpCategoryName: wp.name,
    wpParentId: wp.parent,
    proposedSemester,
    proposedSubject,
    confidence,
    reason,
    humanDecision: decision
  });
}

const mdLines = [
  "# WORDPRESS SEMESTER/SUBJECT MAPPING REVIEW",
  "",
  "## 1. Current Prisma Taxonomy",
  "The following Semesters and Subjects exist in the current PostgreSQL database:",
  ""
];

for (const sem of prismaTaxonomy) {
  mdLines.push(`### ${sem.name}`);
  for (const sub of sem.subjects) {
    mdLines.push(`- ${sub.name} (ID: \`${sub.id}\`)`);
  }
}

mdLines.push("");
mdLines.push("## 2. WordPress Study Categories & Proposed Mapping");
mdLines.push("| WP Category ID | WP Category | WP Parent | Proposed Semester | Proposed Subject | Confidence | Reason | Human Decision |");
mdLines.push("|---|---|---|---|---|---|---|---|");

for (const m of mappings) {
  mdLines.push(`| ${m.wpCategoryId} | ${m.wpCategoryName} | ${m.wpParentId} | ${m.proposedSemester} | ${m.proposedSubject} | ${m.confidence} | ${m.reason} | **${m.humanDecision}** |`);
}

mdLines.push("");
mdLines.push("## 3. ResourceType Mapping Proposals");
mdLines.push("- WP Category `113` (Case Law) -> `ResourceType.CASE_LAW` (HIGH CONFIDENCE)");
mdLines.push("- WP Category `121` (Notes) -> `ResourceType.LAW_NOTE` (HIGH CONFIDENCE)");
mdLines.push("- WP Category `126` (Question Paper) -> `ResourceType.OLD_QUESTION` (HIGH CONFIDENCE)");
mdLines.push("- WP Category `79` (Precedent) -> **UNRESOLVED** (Is it Case Law? Law Note? Other? HUMAN DECISION REQUIRED)");

mdLines.push("");
mdLines.push("## 4. Explicit Human Decisions Required");
mdLines.push("1. **Precedent Classification:** Should posts in `Civil`, `Criminal`, and `Writs` under `Precedent` map to `CASE_LAW`, `LAW_NOTE`, or `OTHER`? They have no Semester/Subject equivalent in the current schema.");
mdLines.push("2. **Unmatched Electives/Subjects:** Categories like `Criminology and Penology`, `Election Law`, `Fiscal Law`, `Gender and Inclusive Justice` do not have an exact matching Subject in the 1st-10th Semester Prisma schema. Should these be mapped to `Elective-I`, `Elective-II`, etc., or should new Subjects be created in Prisma?");
mdLines.push("3. **Partial Matches:** Is `Company Law and Governance` exactly the same as Prisma's `Company Law`?");

fs.writeFileSync('docs/WORDPRESS_SEMESTER_SUBJECT_MAPPING_REVIEW.md', mdLines.join('\n'));

fs.writeFileSync('docs/wordpress-semester-subject-mapping.review.json', JSON.stringify({
  resourceTypeMappings: [
    { wpCategoryId: 113, prismaResourceType: "CASE_LAW", confidence: "HIGH" },
    { wpCategoryId: 121, prismaResourceType: "LAW_NOTE", confidence: "HIGH" },
    { wpCategoryId: 126, prismaResourceType: "OLD_QUESTION", confidence: "HIGH" },
    { wpCategoryId: 79, prismaResourceType: "UNRESOLVED", confidence: "LOW", humanDecision: "Must classify Precedent" }
  ],
  subjectMappings: mappings
}, null, 2));

console.log("Documents generated successfully.");
