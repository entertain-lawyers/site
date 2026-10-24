import { describe, it, expect, beforeAll, vi } from 'vitest';

const { MEMBERS, PLANS, SEMESTERS } = vi.hoisted(() => ({
  MEMBERS: [
    {
      name: 'Ram Babu Das',
      slug: 'ram-babu-das',
      designation: 'Head of Website',
      shortBio: 'BALLB graduate passionate about legal research.',
      biography: 'Ram Babu Das is a BALLB graduate from Prithvi Narayan Campus.',
      email: 'baburam.jnk@gmail.com',
      linkedinUrl: 'https://www.linkedin.com/in/example',
      facebookUrl: 'https://www.facebook.com/entertainlawyers',
      qualifications: 'BALLB Graduate - Prithvi Narayan Campus',
      experience: 'Criminal law and evidence law research',
      achievements: 'Prepared comprehensive notes',
      practiceAreas: 'Criminal Law, Evidence Law',
      languages: 'Nepali, English',
    },
    {
      name: 'Sushma Acharya',
      slug: 'sushma-acharya',
      designation: 'Researcher',
      shortBio: 'Undergraduate law student at National Law College.',
      biography: 'Shusma Acharya researches intellectual property and constitutional law.',
      email: 'shusmaacharya20@gmail.com',
      qualifications: 'BALLB Aspirant - National Law College',
      achievements: 'Winner of the 7th BRU Memorial Moot Court Competition 2026',
    },
    {
      name: 'Sachin Dahal',
      slug: 'sachin-dahal',
      designation: 'Researcher',
      shortBio: 'BALLB student interested in jurisprudence.',
      email: 'sachindahal98079@gmail.com',
    },
    {
      name: 'Smriti Sharma',
      slug: 'smriti-sharma',
      designation: 'Researcher',
      shortBio: 'Undergraduate law student at Kathmandu School of Law.',
      email: 'smriti.sharma@example.com',
    },
  ],
  PLANS: [{ name: 'Test Plan', priceAmount: 1000, durationDays: 30, currency: 'NPR' }],
  SEMESTERS: [
    {
      id: 'sem-1',
      name: '1st Semester',
      order: 1,
      subjects: [
        { name: 'English-I', order: 1 },
        { name: 'Legal Method', order: 1 },
        { name: 'Legal Methods', order: 2 },
      ],
    },
    {
      id: 'sem-3',
      name: '3rd Semester',
      order: 3,
      subjects: [
        { name: 'Jurisprudence - II', order: 1 },
        { name: 'Family Law-I', order: 2 },
        { name: 'Constitutional Law - I', order: 2 },
      ],
    },
  ],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: { findMany: vi.fn(async () => MEMBERS) },
    plan: { findMany: vi.fn(async () => PLANS) },
    semester: { findMany: vi.fn(async () => SEMESTERS) },
  },
}));

import { answerSiteFacts, detectReplyLang, formatTeamMemberField } from '../site-facts';

async function ask(message: string, history: Array<{ role: string; content: string }> = []) {
  const answer = await answerSiteFacts(message, { history });
  expect(answer, `expected a deterministic answer for: ${message}`).not.toBeNull();
  return answer!;
}

describe('detectReplyLang', () => {
  it('detects Devanagari and romanized Nepali', () => {
    expect(detectReplyLang('सम्पर्क विवरण दिनुहोस्')).toBe('ne');
    expect(detectReplyLang('malai timro email chahiyo')).toBe('ne');
    expect(detectReplyLang('What is your email?')).toBe('en');
  });
});

describe('answerSiteFacts — team', () => {
  beforeAll(() => {
    // First call populates the module cache from the mocked database.
  });

  it('gives a concise, conversational intro for a full name', async () => {
    const answer = await ask('Who is Ram Babu Das?');
    expect(answer.reply).toContain('Ram Babu Das is our Head of Website');
    expect(answer.reply).toContain('BALLB graduate passionate about legal research.');
    // The short bio is just a tagline, so the intro adds the opening of the biography.
    expect(answer.reply).toContain('BALLB graduate from Prithvi Narayan Campus.');
    // …and then skips the academic line, which would repeat the same facts.
    expect(answer.reply).not.toContain('Academic details:');
    expect(answer.reply).toContain('Practice areas / interests: Criminal Law, Evidence Law');
    expect(answer.reply).toContain('Full profile: /team/ram-babu-das');
    expect(answer.reply).toContain('Want me to share the email');
    // The default answer must not dump the entire profile.
    expect(answer.reply).not.toContain('Achievements:');
    expect(answer.reply).not.toContain('Email: baburam.jnk@gmail.com');
    expect(answer.sources[0]).toMatchObject({ url: '/team/ram-babu-das', category: 'team' });
  });

  it('returns every stored detail when the full profile is requested', async () => {
    const answer = await ask('Show me the full profile of Ram Babu Das');
    expect(answer.reply).toContain('Ram Babu Das');
    expect(answer.reply).toContain('Head of Website');
    expect(answer.reply).toContain('Experience: Criminal law and evidence law research');
    expect(answer.reply).toContain('Achievements:\n• Prepared comprehensive notes');
    expect(answer.reply).toContain('Languages: Nepali, English');
    expect(answer.reply).toContain('Email: baburam.jnk@gmail.com');
    expect(answer.reply).toContain('Full profile: /team/ram-babu-das');
  });

  it('matches a unique first name when the question has team intent', async () => {
    const answer = await ask('Tell me about Sachin');
    expect(answer.reply).toContain('Sachin Dahal');
    expect(answer.reply).toContain('jurisprudence');
  });

  it('does not turn a missing name into a different person', async () => {
    const answer = await ask('Who is Amrit?');
    expect(answer.reply).toContain('couldn\'t find "Amrit"');
    expect(answer.reply).toContain('Closest name on the team: Smriti Sharma');
    expect(answer.reply).toContain('a different person');
    // The intro for Smriti must not be used as the answer to "Who is Amrit?".
    expect(answer.reply).not.toContain('Smriti Sharma is a Researcher at Entertain Lawyers.');
  });

  it('says a missing name is not on the team in Nepali', async () => {
    const answer = await ask('अमृत को हुन्?');
    expect(answer.reply).toContain('भेटिएन');
  });

  it('treats "Head of Website" as a designation, not a request for social links', async () => {
    const answer = await ask('Who is the Head of Website?');
    expect(answer.reply).toContain('Ram Babu Das');
    expect(answer.reply).toContain('is our Head of Website');
    expect(answer.reply).toContain('BALLB graduate passionate about legal research.');
    expect(answer.reply).toContain('BALLB graduate from Prithvi Narayan Campus.');
    expect(answer.reply).toContain('Full profile: /team/ram-babu-das');
    expect(answer.reply).not.toContain('Email: baburam.jnk@gmail.com');
  });

  it('filters the roster by a named designation', async () => {
    const answer = await ask('Who are the researchers?');
    expect(answer.reply).toContain('Researcher');
    expect(answer.reply).toContain('Sushma Acharya');
    expect(answer.reply).toContain('Sachin Dahal');
    expect(answer.reply).not.toContain('Ram Babu Das');
  });

  it('filters the roster by a Nepali designation', async () => {
    const answer = await ask('अनुसन्धानकर्ता को को छन्?');
    expect(answer.reply).toContain('Researcher');
    expect(answer.reply).toContain('Sushma Acharya');
    expect(answer.reply).not.toContain('Ram Babu Das');
  });

  it('tolerates a one-letter spelling mistake in a name', async () => {
    const answer = await ask('Who is Shusma Acharya?');
    expect(answer.reply).toContain('Sushma Acharya');
  });

  it('answers a follow-up about a field from the previous turn', async () => {
    const history = [
      { role: 'user', content: 'Who is Ram Babu Das?' },
      { role: 'assistant', content: 'Ram Babu Das — Head of Website ... Full profile: /team/ram-babu-das' },
    ];
    const answer = await ask('What is his email?', history);
    expect(answer.reply).toContain('Ram Babu Das');
    expect(answer.reply).toContain('Email: baburam.jnk@gmail.com');
    expect(answer.reply).not.toContain('Achievements:');
  });

  it('expands "tell me more" with extra background, not the whole profile', async () => {
    const history = [
      { role: 'user', content: 'Who is Sushma Acharya?' },
      { role: 'assistant', content: 'Sushma Acharya — Researcher' },
    ];
    const answer = await ask('Tell me more', history);
    expect(answer.reply).toContain('A bit more on Sushma Acharya:');
    expect(answer.reply).toContain('Achievements:');
    expect(answer.reply).toContain('7th BRU');
    expect(answer.reply).toContain('researches intellectual property');
    expect(answer.reply).not.toContain('Email: shusmaacharya20@gmail.com');
  });

  it('lists the roster with designations and profile links', async () => {
    const answer = await ask('Who are the team members?');
    expect(answer.reply).toContain('team (4 members)');
    expect(answer.reply).toContain('Ram Babu Das — Head of Website');
    expect(answer.reply).toContain('Sushma Acharya — Researcher');
    expect(answer.reply).toContain('/team/sachin-dahal');
  });

  it('formats a missing field honestly instead of inventing one', () => {
    const text = formatTeamMemberField(MEMBERS[2], 'experience');
    expect(text).toContain('Sachin Dahal');
    expect(text).toContain('is not listed');
    expect(text).toContain('/team/sachin-dahal');
  });

  it('matches a Devanagari name and answers in Nepali', async () => {
    const answer = await ask('राम बाबु दास को हुन्?');
    expect(answer.reply).toContain('Ram Babu Das');
    expect(answer.reply).toContain('शैक्षिक विवरण');
    expect(answer.reply).toContain('पूरा प्रोफाइल: /team/ram-babu-das');
    // Stored biographies are English; a Nepali answer should not switch languages.
    expect(answer.reply).not.toContain('BALLB graduate from Prithvi Narayan Campus.');
  });

  it('handles a Nepali "tell me more" follow-up without dumping the profile', async () => {
    const history = [
      { role: 'user', content: 'राम बाबु दास को हुन्?' },
      { role: 'assistant', content: 'राम बाबु दास ...' },
    ];
    const answer = await ask('अझै भन्नुहोस्', history);
    expect(answer.reply).toContain('Ram Babu Das बारे अलि बढी:');
    expect(answer.reply).toContain('अनुभव: Criminal law and evidence law research');
    expect(answer.reply).toContain('पूरा प्रोफाइल: /team/ram-babu-das');
    expect(answer.reply).not.toContain('Email:');
    expect(answer.reply).not.toContain('Facebook:');
  });

  it('returns the full profile for a Nepali full-profile request', async () => {
    const history = [
      { role: 'user', content: 'राम बाबु दास को हुन्?' },
      { role: 'assistant', content: 'राम बाबु दास ...' },
    ];
    const answer = await ask('पूरा प्रोफाइल देखाउनुहोस्', history);
    expect(answer.reply).toContain('इमेल: baburam.jnk@gmail.com');
    expect(answer.reply).toContain('उपलब्धिहरू:');
    expect(answer.reply).not.toContain('बारे अलि बढी');
  });
});

describe('answerSiteFacts — site basics', () => {
  it('answers contact details with phone, email, hours and map', async () => {
    const answer = await ask('How can I contact you?');
    expect(answer.reply).toContain('+977 9822010737');
    expect(answer.reply).toContain('contact@entertainlawyers.com');
    expect(answer.reply).toContain('Pokhara Metropolitan City-1');
    expect(answer.reply).toContain('Sunday – Friday');
    expect(answer.reply).toContain('facebook.com/entertainlawyers');
  });

  it('answers contact details in Nepali for a Nepali question', async () => {
    const answer = await ask('सम्पर्क विवरण दिनुहोस्');
    expect(answer.reply).toContain('सम्पर्क गर्ने तरिका');
    expect(answer.reply).toContain('फोन: +977 9822010737');
    expect(answer.reply).toContain('इमेल: contact@entertainlawyers.com');
  });

  it('explains what the site offers', async () => {
    const answer = await ask('What is Entertain Lawyers?');
    expect(answer.reply).toContain('legal-education platform');
    expect(answer.reply).toContain('BA.LLB and LLB');
    expect(answer.reply).toContain('/team');
  });

  it('describes the assistant and its limits', async () => {
    const answer = await ask('Who are you?');
    expect(answer.reply).toContain('Kanun Saathi');
    expect(answer.reply).toContain('not a lawyer');
    expect(answer.reply).toContain('/consultation');
  });

  it('lists consultation services and practice areas', async () => {
    const answer = await ask('What services do you offer?');
    expect(answer.reply).toContain('Civil Law');
    expect(answer.reply).toContain('Intellectual Property');
    expect(answer.reply).toContain('/consultation');
    expect(answer.reply).toContain('confidential');
  });

  it('lists current plans and the payment flow', async () => {
    const answer = await ask('How much is the subscription?');
    expect(answer.reply).toContain('Test Plan: NPR 10 for 30 days');
    expect(answer.reply).toContain('eSewa and Khalti');
    expect(answer.reply).toContain('non-recurring');
    expect(answer.reply).toContain('/pricing');
  });

  it('answers "how do I pay?" with the payment methods', async () => {
    const answer = await ask('How do I pay?');
    expect(answer.reply).toContain('eSewa and Khalti');
    expect(answer.reply).toContain('/pricing');
  });

  it('distinguishes free and premium content', async () => {
    const answer = await ask('Is the site free?');
    expect(answer.reply).toContain('Not everything is free');
    expect(answer.reply).toContain('court fee calculator');
    expect(answer.reply).toContain('Premium');
  });

  it('explains why PDFs cannot be downloaded', async () => {
    const answer = await ask('Can I download the notes as PDF?');
    expect(answer.reply).toContain('cannot be downloaded');
    expect(answer.reply).toContain('/read/[resourceId]');
    expect(answer.reply).toContain('Access Denied');
  });

  it('handles billing problems with the right next step', async () => {
    const answer = await ask('My payment failed but money was deducted');
    expect(answer.reply).toContain('transaction ID');
    expect(answer.reply).toContain('contact@entertainlawyers.com');
    expect(answer.reply).toContain('/terms');
  });

  it('answers refund questions deterministically (including plurals)', async () => {
    const answer = await ask('Do you offer refunds?');
    expect(answer.reply).toContain('transaction ID');
    expect(answer.reply).toContain('case by case');
    expect(answer.reply).not.toContain('doctrine');
  });

  it('answers a Nepali refund question in Nepali', async () => {
    const answer = await ask('रिफन्ड कसरी पाउने?');
    expect(answer.reply).toContain('भुक्तानी');
    expect(answer.reply).toContain('transaction ID');
  });

  it('explains account, login and password reset', async () => {
    const answer = await ask('How do I reset my password?');
    expect(answer.reply).toContain('/forgot-password');
    expect(answer.reply).toContain('/dashboard');
  });

  it('explains privacy and account deletion', async () => {
    const answer = await ask('How do I delete my account?');
    expect(answer.reply).toContain('/privacy-policy');
    expect(answer.reply).toContain('contact@entertainlawyers.com');
  });

  it('explains how to search the site', async () => {
    const answer = await ask('How do I search the site?');
    expect(answer.reply).toContain('/search');
    expect(answer.reply).toContain('/semesters');
    expect(answer.reply).toContain('/study');
  });

  it('maps the main sections', async () => {
    const answer = await ask('What pages are on this site?');
    expect(answer.reply).toContain('/study');
    expect(answer.reply).toContain('/calculator');
    expect(answer.reply).toContain('/team');
  });

  it('explains the study hierarchy', async () => {
    const answer = await ask('Where can I find law notes?');
    expect(answer.reply).toContain('Semester → Subject → Unit');
    expect(answer.reply).toContain('/semesters');
    expect(answer.reply).toContain('Old questions');
  });

  it('lists a semester’s subjects from the live taxonomy', async () => {
    const answer = await ask('Which subjects are in the 1st semester?');
    expect(answer.reply).toContain('1st Semester subjects (2)');
    expect(answer.reply).toContain('English-I');
    expect(answer.reply).toContain('Legal Method');
    expect(answer.reply).not.toContain('Legal Methods');
    expect(answer.sources[0].url).toBe('/semesters/sem-1');
  });

  it('parses "3rd semester subjects" and Devanagari numbers', async () => {
    const english = await ask('3rd semester subjects?');
    expect(english.reply).toContain('3rd Semester subjects (3)');
    expect(english.reply).toContain('Constitutional Law - I');

    const nepali = await ask('१ सेमेस्टरका विषय के के छन्?');
    expect(nepali.reply).toContain('1st Semester का विषय');
  });

  it('points to news, blogs and updates', async () => {
    const answer = await ask('What is the latest news?');
    expect(answer.reply).toContain('/news');
    expect(answer.reply).toContain('/blogs');
  });

  it('answers founder questions from the about facts', async () => {
    const answer = await ask('Who is the founder?');
    expect(answer.reply).toContain('Founded and run by the Entertain Lawyers team');
  });

  it('explains the court fee calculator and its caveat', async () => {
    const answer = await ask('How is the court fee calculated?');
    expect(answer.reply).toContain('/calculator');
    expect(answer.reply).toContain('Section 69');
    expect(answer.reply).toContain('educational estimate');
  });

  it('recognizes "calculator" (not only "calculate")', async () => {
    const answer = await ask('Tell me about the court fee calculator');
    expect(answer.reply).toContain('/calculator');
    expect(answer.reply).toContain('Section 69');
  });

  it('offers a contribution route', async () => {
    const answer = await ask('Can I write for you?');
    expect(answer.reply).toContain('writing sample');
    expect(answer.reply).toContain('contact@entertainlawyers.com');
  });

  it('offers a route to report mistakes', async () => {
    const answer = await ask('I found a typo on a page');
    expect(answer.reply).toContain('report');
    expect(answer.reply).toContain('page URL');
  });

  it('explains language support', async () => {
    const answer = await ask('Which languages do you support?');
    expect(answer.reply).toContain('English');
    expect(answer.reply).toContain('/nepali');
  });

  it('states the education-only disclaimer', async () => {
    const answer = await ask('Are you a lawyer?');
    expect(answer.reply).toContain('not a lawyer');
    expect(answer.reply).toContain('advocate–client');
    expect(answer.reply).toContain('/consultation');
  });

  it('thanks the user briefly', async () => {
    const answer = await ask('Thank you!');
    expect(answer.reply).toContain('विद्वान् ज्यू');
    expect(answer.sources).toHaveLength(0);
  });
});

describe('answerSiteFacts — non-site questions', () => {
  it('does not hijack a substantive legal question', async () => {
    expect(await answerSiteFacts('What is the doctrine of basic structure?')).toBeNull();
    expect(await answerSiteFacts('Explain the difference between murder and culpable homicide')).toBeNull();
    expect(await answerSiteFacts('What are the essentials of a valid contract?')).toBeNull();
  });

  it('does not hijack a question that merely mentions a legal term', async () => {
    expect(await answerSiteFacts('What is a bank account freeze order?')).toBeNull();
  });
});
