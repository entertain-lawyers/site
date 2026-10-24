/**
 * Canonical, human-maintained knowledge about the site itself.
 *
 * These docs are embedded into the AI index (`AIEmbedding`) alongside posts,
 * resources and team members, so the assistant can answer basic questions
 * about Entertain Lawyers — who we are, what we offer, how to reach us, where
 * things live on the site — without inventing anything.
 *
 * Keep this file in sync when contact details, navigation or policies change.
 * Static facts here should match the visible pages (`/about`, `/contact`,
 * `/consultation`, `/pricing`, `/explore`).
 */

export const SITE_NAME = 'Entertain Lawyers';
export const SITE_URL = 'https://entertainlawyers.com';
export const SITE_TAGLINE = 'Connecting with Legal Updates';

export const SITE_CONTACT = {
  phone: '+977 9822010737',
  phoneRaw: '+9779822010737',
  whatsapp: 'https://wa.me/9779822010737',
  email: 'contact@entertainlawyers.com',
  address: 'Pokhara Metropolitan City-1, Kaski, Nepal',
  chambers: 'Prithvi Narayan Law Campus, Pokhara — Kaski, Gandaki Province, Nepal',
  hours: 'Sunday – Friday, 10:00 AM – 5:00 PM (closed Saturdays and court holidays)',
  map: 'https://www.google.com/maps/search/?api=1&query=Prithvi+Narayan+Campus,+Pokhara,+Kaski,+Nepal',
} as const;

export const SITE_SOCIALS = [
  { label: 'Facebook', url: 'https://www.facebook.com/entertainlawyers' },
  { label: 'Instagram', url: 'https://www.instagram.com/entertainlawyers' },
  { label: 'YouTube', url: 'https://youtube.com/entertainlawyers' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@entertain.lawyers' },
  { label: 'Twitter / X', url: 'https://twitter.com/entertainlawyers' },
] as const;

export interface SiteKnowledgeDoc {
  refId: string;
  title: string;
  meta: string | null;
  url: string;
  category: string;
  lang: string;
  /** Sent to the LLM as retrieved context. */
  summary: string;
  /** Embedded as the vector source (usually the same, occasionally richer). */
  text: string;
}

function doc(
  refId: string,
  title: string,
  url: string,
  category: string,
  body: string,
  meta: string | null = null
): SiteKnowledgeDoc {
  const summary = body.replace(/\s+/g, ' ').trim();
  return { refId, title, meta, url, category, lang: 'en', summary, text: `${title}. ${summary}` };
}

export const SITE_KNOWLEDGE: SiteKnowledgeDoc[] = [
  doc(
    'site-about',
    'About Entertain Lawyers — Nepali Legal Education Platform',
    '/about',
    'site-about',
    `Entertain Lawyers (entertainlawyers.com) is a Nepali legal-education platform and law chambers based in Pokhara, Kaski. Tagline: "${SITE_TAGLINE}".
It provides comprehensive study materials for BA.LLB and LLB students: law notes, case laws, old examination questions, legal news, blogs, historical facts, legal personalities and publications.
Primary users are law students, law aspirants, legal professionals and the general public looking for legal information or a consultation.
Mission: to make quality legal education resources accessible to law students across Nepal and to empower legal scholars with a comprehensive, meticulously curated platform for study materials, precedent case laws and exam resources.
Vision: to become the most trusted digital companion for every law student and legal professional in Nepal.
Why choose us: authenticated materials, regular syllabus updates, a secure reading environment, and a user-first experience built for the Nepalese legal context.
The site also offers professional legal consultation through its advocates, in person at the Pokhara chambers or online.`,
    'About the platform'
  ),

  doc(
    'site-contact',
    'Contact Entertain Lawyers — Phone, WhatsApp, Email, Address & Office Hours',
    '/contact',
    'site-contact',
    `How to contact Entertain Lawyers:
Phone: ${SITE_CONTACT.phone}
WhatsApp: ${SITE_CONTACT.phone} (${SITE_CONTACT.whatsapp})
Email: ${SITE_CONTACT.email}
Address: ${SITE_CONTACT.address}
Law chambers: ${SITE_CONTACT.chambers}
Office hours: ${SITE_CONTACT.hours}
Directions / map: ${SITE_CONTACT.map}
Social media: Facebook facebook.com/entertainlawyers, Instagram instagram.com/entertainlawyers, YouTube youtube.com/entertainlawyers, TikTok @entertain.lawyers, Twitter/X @entertainlawyers.
For legal matters, call or WhatsApp ${SITE_CONTACT.phone}, email ${SITE_CONTACT.email}, or use the consultation form at /consultation.`,
    'Contact information'
  ),

  doc(
    'site-consultation',
    'Legal Consultation Services — Book an Advocate',
    '/consultation',
    'site-service',
    `Entertain Lawyers offers professional legal consultation with its advocates, in person at the Pokhara chambers or online.
Matters covered include Civil Law, Criminal Law, Corporate Law, Intellectual Property (IP) Law and Family Law.
To book: open /consultation and fill the consultation form with your name, email, phone, preferred contact method (phone, email or WhatsApp), consultation mode (physical, online or either), practice area, subject, description and preferred time. The team keeps every request strictly confidential.
You can also call or WhatsApp ${SITE_CONTACT.phone} or email ${SITE_CONTACT.email}.
The consultation page also shows the chamber address (${SITE_CONTACT.chambers}) and office hours (${SITE_CONTACT.hours}).
Consultation requests are for getting a clear assessment of a real legal matter; the free AI assistant only provides general legal education, not personal legal advice.`,
    'Consultation'
  ),

  doc(
    'site-explore',
    'Website Guide — What You Can Find on Entertain Lawyers',
    '/explore',
    'site-navigation',
    `Main sections of entertainlawyers.com:
• /study — study materials filtered by semester, subject, unit and type (law notes, case laws, old questions).
• /semesters — browse all semesters and the subjects/units inside them.
• /explore — visual index of Law Notes, Case Laws, Old Questions, Legal News, Historical Facts and Blogs.
• /news — Nepali legal news and updates.
• /blogs — articles and opinion pieces by law students and legal professionals.
• /historical-facts — history of law in Nepal, constitutions and rights; /historical-facts/personalities covers legal personalities.
• /publications — publications and reports.
• /events — events and notices.
• /resources/[id] — a resource's detail page; premium resources open in the secure reader after purchase or subscription.
• /calculator — Nepal court fee calculator under Section 69 of the National Civil Procedure Code, 2017 (Muluki Diwani Karyavidhi Samhita 2074).
• /pricing — subscription plans for premium content.
• /consultation — book a legal consultation.
• /team — profiles of the Entertain Lawyers team.
• /faqs — frequently asked questions about the platform and services.
• /gallery — photo gallery.
• /nepali — Nepali-language content and posts.
• /about and /contact — who we are and how to reach us.
• /search — site-wide search across study materials, news, blogs, facts and more.
• /login, /profile and /dashboard — account, purchases, subscriptions and reading access.
• /privacy-policy and /terms — policies.
A floating "Kanun Saathi" assistant is available on every page for questions about the site and legal education.`,
    'Navigation'
  ),

  doc(
    'site-study',
    'Law Study Materials — Semesters, Subjects, Units, Notes, Case Laws and Old Questions',
    '/study',
    'site-study',
    `Entertain Lawyers organises legal study material in a strict hierarchy: Semester → Subject → Unit → Resource → Document.
Resource types: LAW_NOTE (law notes), CASE_LAW (case law summaries) and OLD_QUESTION (past exam papers).
Use /study to filter by semester, subject, unit and type, or /semesters to browse semester by semester. /explore gives a visual entry point for each category.
Some resources are free and some are premium. A premium resource can be unlocked with a one-time purchase or an active subscription; after that it opens in the secure PDF reader at /read/[resourceId].
The library is written for BA.LLB and LLB students in Nepal and is updated as the syllabus and court rulings change.
If a specific subject or note is not visible, it may not be published yet — use the search bar or contact the team.`,
    'Study library'
  ),

  doc(
    'site-calculator',
    'Nepal Court Fee Calculator — Section 69, National Civil Procedure Code 2017',
    '/calculator',
    'site-tool',
    `Entertain Lawyers provides a free Nepal court fee (अदालती दस्तुर / कोर्ट फी) calculator at /calculator.
It estimates the progressive court fee for civil suits under Section 69 of the National Civil Procedure Code, 2017 (Muluki Diwani Karyavidhi Samhita 2074), based on the claim amount (बिगो).
The page also explains related rules: court fee meaning under Section 63(2); recovery of court fee by the winning party under Section 83(1); a fee of NPR 1,000 where the claim amount is not specified under Sections 71(2) and 70; an additional 15% of the filing fee on appeal under Section 73; and payment at the court's cash counter with the original voucher submitted to the registration section.
The calculator is an educational estimate. For the exact fee in a real case, confirm with the concerned court or book a consultation.`,
    'Court fee calculator'
  ),

  doc(
    'site-pricing',
    'Premium Access, Subscriptions and Payment',
    '/pricing',
    'site-pricing',
    `Premium content on Entertain Lawyers can be accessed in two ways: a one-time purchase of an individual resource, or a subscription plan that unlocks all premium resources for its duration.
See current plans and prices at /pricing. Subscription features include access to all premium resources, the secure PDF viewer, materials for all semesters, regular updates, priority support and an ad-free reading experience.
Subscriptions are non-recurring: you are charged once for the plan duration, and there are no hidden fees — the listed price is the final price.
Payments are handled through Nepali gateways (eSewa and Khalti). After a successful payment the entitlement is attached to your account automatically; failed payments return to the failure page and no access is granted.
Premium documents cannot be downloaded and require an internet connection because they open in a secure viewer that protects intellectual property. The content is reviewed and updated regularly to reflect the syllabus and latest court rulings.
For billing or access problems, contact ${SITE_CONTACT.email} or call ${SITE_CONTACT.phone}.`,
    'Pricing and premium access'
  ),

  doc(
    'site-account',
    'Accounts, Login, Registration and Reading Access',
    '/login',
    'site-account',
    `Creating an account on Entertain Lawyers: use /login and choose registration/sign-in. Email verification and password reset are supported (forgot-password and reset-password pages).
Your /profile page manages personal details and security settings. /dashboard shows your account, purchases, subscriptions and entitlements.
After signing in, purchased or subscribed premium resources open in the secure reader at /read/[resourceId]. If you see "Access Denied", the resource is premium and your account has no active purchase or subscription for it.
Google sign-in is supported in addition to email/password.
For account problems, contact ${SITE_CONTACT.email}.`,
    'Accounts'
  ),

  doc(
    'site-assistant',
    'Kanun Saathi (कानुन साथी) — The Entertain Lawyers AI Assistant',
    '/',
    'site-assistant',
    `Kanun Saathi (कानुन साथी) is the AI assistant of Entertain Lawyers. It appears as a floating button on the site and answers questions about the platform and about Nepali legal education — law notes, case laws, acts, old questions, study materials and the site's services.
It answers from the site's own indexed content and links the matching pages. It is an education assistant, not a lawyer: it does not give personal legal advice. For advice about a real case, it points users to a consultation with the team.
It replies in English, romanized Nepali or Devanagari, matching the language of the question, and addresses users respectfully as "विद्वान् ज्यू".
It can also answer basic questions about the site itself: the team and their profiles, contact details, office hours, consultation booking, study library, pricing, payment and navigation.`,
    'AI assistant'
  ),

  doc(
    'site-policies',
    'Terms of Service and Privacy Policy',
    '/terms',
    'site-policy',
    `Entertain Lawyers publishes its Terms of Service at /terms and Privacy Policy at /privacy-policy.
The policies cover account use, acceptable use of study materials, intellectual property and the secure reader, payments and subscriptions, and how personal data (account details, consultation requests, access logs) is collected, used and protected.
Consultation requests are treated as confidential and handled only by authorised advocates. For any privacy request, contact ${SITE_CONTACT.email}.`,
    'Policies'
  ),

  doc(
    'site-faq',
    'Frequently Asked Questions — Free Content, Accounts, Downloads, Billing and Contributions',
    '/faqs',
    'site-faq',
    `Common questions about Entertain Lawyers:
Is everything free? No. Many law notes, case laws and old questions are free, while some resources are premium. Free sections include the court fee calculator, search, news, blogs, historical facts, publications, events and team pages. Premium resources unlock with a one-time purchase or an active subscription.
Do I need an account? Only to buy or subscribe, manage your profile, or open premium resources. Free material can be browsed without signing in.
Can I download or print premium PDFs? No. Premium documents open in a secure online reader, so they need an internet connection and cannot be downloaded. Free pages can be viewed in the browser.
A subject or note is missing — what now? Content is added and updated regularly. Use the search bar or contact the team with the semester, subject and unit you need.
Do you give legal advice? The study material and Kanun Saathi are educational only. For advice on a real matter, book a consultation and speak to an advocate.
Can I write for the site or collaborate on research? The team welcomes contributions and research collaboration — email ${SITE_CONTACT.email} with your topic and a short writing sample.
How do I report a mistake or a broken link? Email ${SITE_CONTACT.email} with the page URL and the correction.
Refunds, failed payments or duplicate charges? Email ${SITE_CONTACT.email} or call ${SITE_CONTACT.phone} with your account email, transaction ID and date; the team reviews billing issues case by case.`,
    'FAQ'
  ),

  doc(
    'site-search',
    'Search Guide — How to Find Notes, Case Laws and Old Questions',
    '/search',
    'site-navigation',
    `To find content on Entertain Lawyers:
Use the search icon/bar in the site header on any page, or open /search. Search covers study resources, law notes, case laws, old questions, news, blogs, historical facts, publications, events and team profiles.
You can also browse structurally: /semesters → semester → subject → unit, or /study with filters for semester, subject, unit and resource type.
Search works in English and Nepali/Devanagari. If an exact note is not found, try a shorter keyword (for example the subject name or a section number), check the semester page, or ask Kanun Saathi with the semester and subject.
If content is still missing, email ${SITE_CONTACT.email} — some material may not be published yet.`,
    'Search'
  ),

  doc(
    'site-nepali',
    'Nepali Language Content and Multilingual Support',
    '/nepali',
    'site-navigation',
    `Entertain Lawyers publishes Nepali-language content at /nepali, with posts at /nepali/post/[id] and category pages at /nepali/[category].
The interface and study library are primarily in English, while news, blogs and historical facts include Nepali posts. The site also has an English/Nepali language toggle where available.
Kanun Saathi replies in the language of the question: English, romanized Nepali, or Devanagari Nepali, and addresses users respectfully as "विद्वान् ज्यू".
If a Nepali answer is not available for a topic, the assistant says so and points to the closest English page or to a consultation.`,
    'Nepali content'
  ),

  doc(
    'site-disclaimer',
    'Educational Use and Legal Disclaimer',
    '/terms',
    'site-policy',
    `Entertain Lawyers is a legal-education platform. Its notes, case law summaries, old questions, news, blogs, calculator and AI assistant are provided for study and general information only.
Nothing on the site creates an advocate–client relationship or constitutes personal legal advice. Court fee results from /calculator are estimates; confirm the exact amount with the concerned court.
For advice about a real dispute, transaction or case, book a consultation at /consultation and speak with an advocate. Consultation requests are confidential and handled only by authorised advocates.
The Terms of Service at /terms and Privacy Policy at /privacy-policy govern use of the site, accounts, payments and content.`,
    'Disclaimer'
  ),

  doc(
    'site-billing',
    'Payments, Failed Transactions, Duplicate Charges and Refunds',
    '/pricing',
    'site-pricing',
    `Payments on Entertain Lawyers are handled through eSewa and Khalti. Subscriptions are one-time (non-recurring) charges for the plan duration; the listed price is the final price with no hidden fees.
After a successful payment, access is attached to your account automatically. If a payment fails, you are returned to /payment/failure and no access is granted; you can retry from /pricing.
If money was deducted but access did not appear, or you were charged twice, email ${SITE_CONTACT.email} or call ${SITE_CONTACT.phone} with your account email, transaction ID, amount, date and payment gateway. The team verifies the transaction and resolves it case by case.
Refund and cancellation requests are reviewed by the team on a case-by-case basis under the Terms of Service at /terms; contact the team before assuming an outcome.
For a one-time resource purchase, access is tied to the signed-in account used at checkout.`,
    'Billing'
  ),

  doc(
    'site-reader',
    'Secure Reader — Why Premium PDFs Cannot Be Downloaded',
    '/resources',
    'site-pricing',
    `Premium resources on Entertain Lawyers open in a secure online PDF reader at /read/[resourceId] rather than as a downloadable file, to protect the authors' intellectual property.
This means premium documents need an internet connection and cannot be downloaded, printed or shared as files. Free resources can be read in the browser.
If the reader shows "Access Denied", the resource is premium and the signed-in account has no active purchase or subscription covering it. Buy the resource or subscribe at /pricing, then reopen the link.
If a document will not load, refresh the page, sign out and back in, or email ${SITE_CONTACT.email} with the resource link.`,
    'Secure reader'
  ),

  doc(
    'site-contribute',
    'Write for Us, Research Collaboration and Joining the Team',
    '/team',
    'site-team',
    `Entertain Lawyers works with law students, researchers and legal professionals who want to contribute notes, case law summaries, articles, news or historical facts.
To propose a contribution, collaboration or a role on the team, email ${SITE_CONTACT.email} with your name, institution, the topic or section you want to work on, and a short writing sample or CV.
Editorial work follows the site's structure — semester, subject and unit — and contributions should be accurate, referenced and written in clear English or Nepali.
The current team and their research interests are listed at /team; individual profiles include email and social links for direct contact about a specific area.`,
    'Contribute'
  ),

  doc(
    'site-contact-team',
    'Contacting a Team Member Directly',
    '/team',
    'site-team',
    `Every published team member has a profile at /team/[slug] with their designation, biography, qualifications, experience, achievements, research interests and, where provided, email and social links.
For a question about a member's research area, notes or collaboration, use the email or LinkedIn/Facebook link on their profile. For general site, billing or consultation questions, use ${SITE_CONTACT.email} or ${SITE_CONTACT.phone}.
The team is based in Pokhara, Kaski, and works Sunday to Friday, ${SITE_CONTACT.hours.replace(/^Sunday – Friday, /, '')}.
When asking Kanun Saathi about a member by name, it returns every detail stored on the site plus the profile link.`,
    'Contacting the team'
  ),

  doc(
    'site-privacy',
    'Privacy, Personal Data and Account Deletion',
    '/privacy-policy',
    'site-policy',
    `The Privacy Policy at /privacy-policy explains what Entertain Lawyers collects (account details, consultation requests, purchase records and basic access logs), why it is collected, and how it is protected.
Consultation requests are confidential and handled only by authorised advocates. Payment data is processed by eSewa/Khalti; the site does not store card or wallet credentials.
To access, correct or delete your personal data, or to close your account, email ${SITE_CONTACT.email} from the address linked to the account. Some records may be retained where required by law or for payment reconciliation.
To stop non-essential email, use the unsubscribe link in the message or contact the team.`,
    'Privacy'
  ),

  doc(
    'site-team-roster',
    'Our Team — Entertain Lawyers Members and Designations',
    '/team',
    'site-team',
    `Entertain Lawyers has a published team directory at /team with an individual profile page for every member at /team/[slug].
The directory lists each member's name, designation, short bio, photo, email and social links; each profile page adds their full biography, academic details/qualifications, experience, achievements, practice areas and languages.
When asked about a specific member by name, give their designation, bio, qualifications, experience, achievements, practice areas, languages and contact/profile links.
For collaboration, research or website queries, contact the relevant member by email or use ${SITE_CONTACT.email}.`,
    'Team directory'
  ),
];

/** Quick access to the canonical contact doc. */
export const SITE_CONTACT_DOC = SITE_KNOWLEDGE.find((d) => d.refId === 'site-contact')!;

/**
 * Compact, authoritative fact sheet injected into every AI prompt.
 *
 * Retrieval can miss the contact page for an odd phrasing; these lines are
 * always present so the model never has to guess a phone number, email,
 * address or opening time.
 */
export const SITE_FACT_SHEET = [
  `Site: ${SITE_NAME} (${SITE_URL}) — ${SITE_TAGLINE}`,
  `Phone / WhatsApp: ${SITE_CONTACT.phone}`,
  `Email: ${SITE_CONTACT.email}`,
  `Address: ${SITE_CONTACT.address}`,
  `Law chambers: ${SITE_CONTACT.chambers}`,
  `Office hours: ${SITE_CONTACT.hours}`,
  'Sections: /study, /semesters, /explore, /news, /blogs, /historical-facts, /publications, /events, /calculator, /pricing, /consultation, /team, /faqs, /search, /nepali, /about, /contact.',
  'The assistant is Kanun Saathi (कानुन साथी). It gives legal education only, never personal legal advice; for a real matter it points to /consultation.',
].join('\n');
