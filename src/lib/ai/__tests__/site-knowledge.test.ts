import { describe, it, expect } from 'vitest';
import { SITE_KNOWLEDGE, SITE_CONTACT, SITE_FACT_SHEET } from '../site-knowledge';
import { formatTeamMember } from '../site-facts';

describe('AI site knowledge', () => {
  it('covers the core site facts the assistant must know', () => {
    const ids = SITE_KNOWLEDGE.map((doc) => doc.refId);

    expect(ids).toContain('site-about');
    expect(ids).toContain('site-contact');
    expect(ids).toContain('site-consultation');
    expect(ids).toContain('site-explore');
    expect(ids).toContain('site-study');
    expect(ids).toContain('site-calculator');
    expect(ids).toContain('site-pricing');
    expect(ids).toContain('site-team-roster');
    expect(ids).toContain('site-faq');
    expect(ids).toContain('site-search');
    expect(ids).toContain('site-nepali');
    expect(ids).toContain('site-disclaimer');
    expect(ids).toContain('site-billing');
    expect(ids).toContain('site-reader');
    expect(ids).toContain('site-contribute');
    expect(ids).toContain('site-contact-team');
    expect(ids).toContain('site-privacy');
  });

  it('has a canonical fact sheet with the contact details and site map', () => {
    const sheet = SITE_FACT_SHEET;
    expect(sheet).toContain(SITE_CONTACT.phone);
    expect(sheet).toContain(SITE_CONTACT.email);
    expect(sheet).toContain(SITE_CONTACT.hours);
    expect(sheet).toContain('/consultation');
    expect(sheet).toContain('/team');
  });

  it('has unique refIds and absolute internal URLs', () => {
    const ids = SITE_KNOWLEDGE.map((doc) => doc.refId);
    expect(new Set(ids).size).toBe(ids.length);

    for (const doc of SITE_KNOWLEDGE) {
      expect(doc.url.startsWith('/')).toBe(true);
      expect(doc.title.trim().length).toBeGreaterThan(0);
      expect(doc.summary.trim().length).toBeGreaterThan(20);
    }
  });

  it('keeps the canonical contact details in the knowledge base', () => {
    expect(SITE_CONTACT.phone).toBe('+977 9822010737');
    expect(SITE_CONTACT.email).toBe('contact@entertainlawyers.com');

    const contactDoc = SITE_KNOWLEDGE.find((doc) => doc.refId === 'site-contact');
    expect(contactDoc?.summary).toContain(SITE_CONTACT.phone);
    expect(contactDoc?.summary).toContain(SITE_CONTACT.email);
    expect(contactDoc?.summary).toContain(SITE_CONTACT.address);
  });
});

describe('formatTeamMember', () => {
  const member = {
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
  };

  it('includes every available detail and the profile link', () => {
    const text = formatTeamMember(member);

    expect(text).toContain('Ram Babu Das');
    expect(text).toContain('Head of Website');
    expect(text).toContain('BALLB graduate passionate about legal research.');
    expect(text).toContain('Prithvi Narayan Campus');
    expect(text).toContain('Academic details: BALLB Graduate');
    expect(text).toContain('Experience: Criminal law and evidence law research');
    expect(text).toContain('Achievements:');
    expect(text).toContain('Practice areas / interests: Criminal Law, Evidence Law');
    expect(text).toContain('Languages: Nepali, English');
    expect(text).toContain('Email: baburam.jnk@gmail.com');
    expect(text).toContain('LinkedIn: https://www.linkedin.com/in/example');
    expect(text).toContain('Facebook: https://www.facebook.com/entertainlawyers');
    expect(text).toContain('Full profile: /team/ram-babu-das');
  });

  it('omits fields that are not present', () => {
    const text = formatTeamMember({
      name: 'Sachin Dahal',
      slug: 'sachin-dahal',
      designation: 'Researcher',
    });

    expect(text).toContain('Sachin Dahal');
    expect(text).toContain('Full profile: /team/sachin-dahal');
    expect(text).not.toContain('Experience:');
    expect(text).not.toContain('Email:');
    expect(text).not.toContain('undefined');
  });
});
