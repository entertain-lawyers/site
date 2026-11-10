import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACTS_SEED_DATA = [
  {
    title: 'Constitution of Nepal (नेपालको संविधान)',
    titleEn: 'Constitution of Nepal',
    slug: 'constitution-of-nepal',
    category: 'CONSTITUTION',
    description: 'Promulgated on 20 September 2015 (3 Ashwin 2072), establishing Nepal as a federal democratic republic.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2021/01/Constitution-of-Nepal.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Arbitration Act, 2055 (मध्यस्थता ऐन, २०५५)',
    titleEn: 'Arbitration Act, 2055',
    slug: 'arbitration-act-2055',
    category: 'ACTS',
    description: 'An Act to provide legal provisions regarding domestic and international arbitration in Nepal.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/arbitration-act-2055-1999.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Banking Offences and Punishment Act, 2064 (बैंकिङ्ग कसूर तथा सजाय ऐन, २०६४)',
    titleEn: 'Banking Offences and Punishment Act, 2064',
    slug: 'banking-offences-and-punishment-act-2064',
    category: 'ACTS',
    description: 'Provides for controlling banking crimes and offenses in financial institutions.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/banking-offences-and-punishment-act-2064-2008.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Company Act, 2063 (कम्पनी ऐन, २०६३)',
    titleEn: 'Company Act, 2063',
    slug: 'company-act-2063',
    category: 'ACTS',
    description: 'Primary legislation governing incorporation, governance, and liquidation of companies in Nepal.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/the-companies-act-2063-2006.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Constitution of the Kingdom of Nepal, 2047 (नेपाल अधिराज्यको संविधान, २०४७)',
    titleEn: 'Constitution of the Kingdom of Nepal, 2047',
    slug: 'constitution-of-the-kingdom-of-nepal-2047',
    category: 'HISTORICAL_DOCUMENTS',
    description: 'Historical constitutional document drafted following the 1990 People’s Movement establishing parliamentary democracy.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/Constitution-of-the-Kingdom-of-Nepal-2047.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Consumer Protection Act, 2075 (उपभोक्ता संरक्षण ऐन, २०७५)',
    titleEn: 'Consumer Protection Act, 2075',
    slug: 'consumer-protection-act-2075',
    category: 'ACTS',
    description: 'Enacted to protect consumers from unfair commercial practices, substandard products, and black marketing.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2019/04/Consumer-Protection-Act-2075-2018.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'District Court Rules, 2075 (जिल्ला अदालत नियमावली, २०७५)',
    titleEn: 'District Court Rules, 2075',
    slug: 'district-court-rules-2075',
    category: 'RULES_REGULATIONS',
    description: 'Procedural rules formulated for case management, evidence hearings, and administration in District Courts.',
    documentUrl: 'https://supremecourt.gov.np/web/assets/downloads/district_court_rules_2075.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Electronic Transactions Act, 2063 (विद्युतीय कारोबार ऐन, २०६३)',
    titleEn: 'Electronic Transactions Act, 2063',
    slug: 'electronic-transactions-act-2063',
    category: 'ACTS',
    description: 'Regulates cyber law, electronic signatures, data security, and cybercrimes in Nepal.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/electronic-transaction-act-2063-2008.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Evidence Act, 2031 (प्रमाण ऐन, २०३१)',
    titleEn: 'Evidence Act, 2031',
    slug: 'evidence-act-2031',
    category: 'ACTS',
    description: 'Defines rules on admissibility of oral, documentary, and expert evidence in legal proceedings.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/evidence-act-2031-1974.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Government of Nepal Act, 2004 (नेपाल सरकारको वैधानिक कानुन, २००४)',
    titleEn: 'Government of Nepal Act, 2004',
    slug: 'government-of-nepal-act-2004',
    category: 'HISTORICAL_DOCUMENTS',
    description: 'The first written constitution of Nepal announced by Prime Minister Padma Shamsher in 2004 BS.',
    documentUrl: null,
    status: 'PUBLISHED' as const,
  },
  {
    title: 'High Court Rules, 2073 (उच्च अदालत नियमावली, २०७३)',
    titleEn: 'High Court Rules, 2073',
    slug: 'high-court-rules-2073',
    category: 'RULES_REGULATIONS',
    description: 'Rules framed under the Administration of Justice Act, 2073 for proceedings and appeals in the High Courts.',
    documentUrl: 'https://supremecourt.gov.np/web/assets/downloads/high_court_rules_2073.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Labor Act, 2074 (श्रम ऐन, २०७४)',
    titleEn: 'Labor Act, 2074',
    slug: 'labor-act-2074',
    category: 'ACTS',
    description: 'Comprehensive employment legislation regulating worker rights, hiring, benefits, and labor disputes.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/labour-act-2074-2017.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Muluki Ain, 1910 (वि.सं. १९१० को मुलुकी ऐन)',
    titleEn: 'Muluki Ain, 1910',
    slug: 'muluki-ain-1910',
    category: 'HISTORICAL_DOCUMENTS',
    description: 'Historic civil and penal legal code promulgated by Prime Minister Junga Bahadur Rana in 1910 BS.',
    documentUrl: null,
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Muluki Civil Code, 2074 (मुलुकी देवानी संहिता, २०७४)',
    titleEn: 'Muluki Civil Code, 2074',
    slug: 'muluki-civil-code-2074',
    category: 'ACTS',
    description: 'Codifies civil rights, contracts, family law, inheritance, and property relations in Nepal.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/the-civil-code-2074-2017.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Muluki Criminal Code, 2074 (मुलुकी अपराध संहिता, २०७४)',
    titleEn: 'Muluki Criminal Code, 2074',
    slug: 'muluki-criminal-code-2074',
    category: 'ACTS',
    description: 'Substantive penal code outlining offenses, liabilities, and punishments under Nepal law.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/the-penal-code-2074-2017.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'National Civil Procedure Code, 2074 (मुलुकी देवानी कार्यविधि संहिता, २०७४)',
    titleEn: 'National Civil Procedure Code, 2074',
    slug: 'national-civil-procedure-code-2074',
    category: 'ACTS',
    description: 'Governs institution of civil suits, jurisdiction, summons, trials, and enforcement of decrees.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/the-civil-procedure-code-2074-2017.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'National Criminal Procedure Code, 2074 (मुलुकी फौजदारी कार्यविधि संहिता, २०७४)',
    titleEn: 'National Criminal Procedure Code, 2074',
    slug: 'national-criminal-procedure-code-2074',
    category: 'ACTS',
    description: 'Governs investigation of crimes, arrest, bail, trial procedure, and execution of criminal judgments.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/the-criminal-procedure-code-2074-2017.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'National Intellectual Property Policy, 2073 (राष्ट्रिय बौद्धिक सम्पत्ति नीति, २०७३)',
    titleEn: 'National Intellectual Property Policy, 2073',
    slug: 'national-intellectual-property-policy-2073',
    category: 'POLICIES',
    description: 'Strategic policy framework guiding patent, trademark, copyright, and geographical indications.',
    documentUrl: null,
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Nepal Citizenship (Amendment) Ordinance, 2078 (नेपाल नागरिकता पहिलो संशोधन अध्यादेश, २०७८)',
    titleEn: 'Nepal Citizenship (Amendment) Ordinance, 2078',
    slug: 'nepal-citizenship-amendment-ordinance-2078',
    category: 'ORDINANCE',
    description: 'Promulgated ordinance concerning provisions for citizenship by descent and naturalization.',
    documentUrl: null,
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Nepal Legal Practitioners Council Act, 2050 (नेपाल कानून व्यवसायी परिषद् ऐन, २०५०)',
    titleEn: 'Nepal Legal Practitioners Council Act, 2050',
    slug: 'nepal-legal-practitioners-council-act-2050',
    category: 'ACTS',
    description: 'Regulates licensing, professional conduct, ethical standards, and disciplining of advocates in Nepal.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/nepal-legal-practitioners-council-act-2050-1993.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Right to Information Act, 2064 (सूचनाको हक सम्बन्धी ऐन, २०६४)',
    titleEn: 'Right to Information Act, 2064',
    slug: 'right-to-information-act-2064',
    category: 'ACTS',
    description: 'Guarantees the constitutional right of citizens to access information of public importance.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/right-to-information-act-2064-2007.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Supreme Court Rules, 2074 (सर्वोच्च अदालत नियमावली, २०७४)',
    titleEn: 'Supreme Court Rules, 2074',
    slug: 'supreme-court-rules-2074',
    category: 'RULES_REGULATIONS',
    description: 'Supreme Court bench administration, writ petition jurisdiction, review, and appellate procedures.',
    documentUrl: 'https://supremecourt.gov.np/web/assets/downloads/supreme_court_rules_2074.pdf',
    status: 'PUBLISHED' as const,
  },
  {
    title: 'Treaty Act, 2047 (नेपाल सन्धि ऐन, २०४७)',
    titleEn: 'Treaty Act, 2047',
    slug: 'treaty-act-2047',
    category: 'INTERNATIONAL_TREATIES',
    description: 'Defines procedures for negotiation, signing, ratification, accession, and implementation of treaties.',
    documentUrl: 'https://lawcommission.gov.np/en/wp-content/uploads/2018/10/nepal-treaty-act-2047-1990.pdf',
    status: 'PUBLISHED' as const,
  },
];

async function main() {
  console.log('Seeding Acts and Laws...');
  for (const act of ACTS_SEED_DATA) {
    await prisma.actLaw.upsert({
      where: { slug: act.slug },
      update: act,
      create: act,
    });
  }
  const count = await prisma.actLaw.count();
  console.log(`Seeding complete. Total Acts & Laws in database: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
