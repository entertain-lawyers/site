import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  console.log(`--- DATABASE TARGET VERIFICATION ---`);
  const isPreview = dbUrl.includes('preview') || dbUrl.includes('branch_') || dbUrl.includes('neondb');
  console.log(`URL Pattern matching preview/neon: ${isPreview ? 'YES' : 'NO'}`);
  console.log(`Database Host: ${dbUrl.split('@')[1]?.split('/')[0] || 'Unknown'}`);

  const legacyNames = [
    'English-I', 'Legal Methods', 'Political Science-I', 'Sub1', 
    'English-II', 'Introduction to Law and Legal System', 'Nepali', 'Political Science-II', 
    'Family Law-I', 'Law of Tort', 'Family Law-II', 'Company Law', 'Labor Law', 
    'Law of Evidence', 'Civil Procedure', 'Criminal Procedure', 'International Law', 
    'Banking and Insurance Law', 'Cyber Law', 'Alternative Dispute Resolution', 'Comparative Constitutional Law', 'Land Law and Land Reform', 
    'Legal Aid and Public Interest Litigation', 'Legal Drafting and Conveyancing', 
    'Clinical Legal Education', 'Elective-I', 'Elective-II', 'Professional Ethics', 
    'Research Methodology', 'Elective-III', 'Elective-IV', 'Internship', 'Moot Court'
  ];

  const subjects = await prisma.subject.findMany({
    include: {
      resources: true,
      units: true,
      semester: true
    }
  });

  // Need to be careful to not flag the canonical "Clinical Law - I: Alternative Dispute Resolution"
  // So we explicitly match names from the legacy list. We also manually added 'Sub1' above.
  // Wait, there's a legacy 'Clinical Law - I: Alternative Dispute Resolution' in Sem 7? 
  // Let's filter out exactly the known legacy ones. We saw 37 in the earlier query.
  
  // We'll map all subjects and see which ones are the 83 canonical.
  const canonicalNamesBySem = {
    1: ['Legal Method', 'Legal Nepali - I', 'Alternative English (for Foreigners in Lieu of Legal Nepali)', 'Legal English - I', 'Political Theory', 'Nepali History', 'Sociology', 'Economics - I'],
    2: ['Jurisprudence - I', 'Legal Nepali - II', 'Alternative English (for Foreigners in Lieu of Legal Nepali)', 'Legal English - II', 'Political Thoughts', 'Global History', 'Anthropology', 'Economics - II'],
    3: ['Jurisprudence - II', 'Constitutional Law - I', 'International Relations and Diplomacy', 'Criminal Law - I', 'Public International Law - I', 'Property Law', 'Comparative Law'],
    4: ['Criminal Law - II', 'Public International Law - II', 'Constitutional Law - II', 'Family Law', 'Law of Contract - I', 'Procedural Law - I', 'Nepali Legal System'],
    5: ['Law of Contract - II', 'Criminology and Penology', 'Procedural Law - II', 'Company Law and Governance', 'International Institutions', 'Legal Research Methodology', 'Juvenile Delinquency', 'Election Law', 'Securities Law', 'International Air and Space Law'],
    6: ['Corporate Law and Management', 'Intellectual Property Law', 'Human Rights Law', 'Interpretation of Law', 'Law of Torts and Consumer Protection', 'Seminar - I (Doctrinal)', 'Insurance Law', 'Socio Economic Crime', 'International Humanitarian Law', 'Forensic Science'],
    7: ['Evidence Law', 'International Trade Law', 'Environmental Law', 'Clinical Law - I: Alternative Dispute Resolution', 'Administrative Law', 'Labour Law', 'Forensic Medicine', 'Fiscal Law', 'International Refugee Law', 'Media Law'],
    8: ['Law, Poverty and Development', 'Gender and Inclusive Justice', 'Moot Court - I (Civil Case)', 'Private International Law', 'Cyber Law and Artificial Intelligence', 'Clinical Law - II (Conveyancing)', 'International Rivers and Sea Law', 'Natural Resources Law', 'Investment Law', 'Business and Human Rights Law'],
    9: ['Moot Court - II (Criminal Case)', 'Law of Banking and Negotiable Instruments', 'Legislative Drafting', 'Taxation Law', 'Seminar - II (Non-Doctrinal)', 'Energy Law', 'Victimology', 'Population Law', 'Competition Law'],
    10: ['Clinical Law - III (Placement)', 'Social Work and Social Welfare Law', 'Professional Ethics and Lawyering Skills', 'Dissertation']
  };

  const canonical: any[] = [];
  const extras: any[] = [];
  
  // Also we need to check if multiple subjects have the same name in the same semester.
  const seenCanonical = new Set<string>();

  for (const s of subjects) {
    // Note: Alternative English is in both sem 1 and sem 2. 
    // We already renamed them in the DB to have '(Semester X)' suffix if I remember correctly?
    // Let's just check if it's canonical.
    let isCanonical = false;
    let expectedNames = canonicalNamesBySem[s.semester.order as keyof typeof canonicalNamesBySem] || [];
    
    // Check against expected names (fuzzy match for alternative english)
    for (const expected of expectedNames) {
      if (s.name.includes(expected) || expected.includes(s.name)) {
        // If we already saw this exact name for this semester, the second one is a duplicate (extra)
        const key = `${s.semester.order}-${expected}`;
        if (!seenCanonical.has(key)) {
          isCanonical = true;
          seenCanonical.add(key);
          break;
        }
      }
    }
    
    if (isCanonical) {
      canonical.push(s);
    } else {
      extras.push(s);
    }
  }

  console.log(`\n--- CANONICAL SUBJECTS COUNT: ${canonical.length} ---`);
  let unitCount = 0;
  for (const s of canonical) {
    unitCount += s.units.length;
  }
  console.log(`CANONICAL UNITS COUNT: ${unitCount}`);

  console.log(`\n--- LEGACY EXTRA SUBJECTS (Count: ${extras.length}) ---`);
  for (const ex of extras) {
    console.log(`- ${ex.name} (ID: ${ex.id}, Sem: ${ex.semester.order}): Resources: ${ex.resources.length}, Units: ${ex.units.length}`);
    if (ex.resources.length > 0) {
      for (const r of ex.resources) {
        console.log(`    Resource ID: ${r.id} | Title: "${r.title}"`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
