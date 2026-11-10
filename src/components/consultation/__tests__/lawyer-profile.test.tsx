import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LawyerCard } from '../ConsultationClient';
import LawyerProfileView from '../LawyerProfileView';
import ConsultationForm from '../ConsultationForm';
import type { ConsultationLawyer } from '../ConsultationForm';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/modules/consultation/consultation.actions', () => ({ submitConsultationRequestAction: vi.fn() }));

const lawyer: ConsultationLawyer = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Sita Sharma',
  slug: 'sita-sharma',
  title: 'Advocate',
  specialization: 'Family and property law',
  practiceAreas: 'Divorce, Partition',
  serviceCities: 'Kathmandu, Pokhara',
  phone: '+977 9841234567',
  whatsappNumber: '+977 9841234567',
  email: 'sita@example.com',
  lawFirm: 'Pentagon Law Firm',
  qualifications: 'B.A. LL.B., LL.M.',
  achievements: 'Winner of the 23rd moot court competition',
  officeAddress: 'Dillibazar, Kathmandu',
  officeMapUrl: 'https://maps.google.com/?q=Dillibazar',
  facebookUrl: 'https://facebook.com/sita',
  instagramUrl: 'https://instagram.com/sita',
  linkedInUrl: 'https://linkedin.com/in/sita',
  websiteUrl: 'https://example.com',
  bio: 'Practising advocate focused on family dispute resolution.',
};

describe('Consult a Lawyer public profile', () => {
  it('renders a team-style directory card with a 4/5 portrait and essential info only', () => {
    const html = renderToStaticMarkup(<LawyerCard lawyer={lawyer} />);
    expect(html).toContain('Sita Sharma');
    expect(html).toContain('Advocate');
    expect(html).toContain('Kathmandu, Pokhara');
    expect(html).toContain('aspect-[4/5]');
    // Specialization, biography and contact channels stay out of the directory card.
    expect(html).not.toContain('Family and property law');
    expect(html).not.toContain('Practising advocate');
    expect(html).not.toContain('+977 9841234567');
  });

  it('renders View More / Consult action on the directory card linking to lawyer profile page', () => {
    const html = renderToStaticMarkup(<LawyerCard lawyer={lawyer} />);
    expect(html).toContain('View More / Consult');
    expect(html).toContain('href="/consultation/sita-sharma"');
    // Exactly one action link/button on the card.
    expect((html.match(/href="\/consultation\/sita-sharma"/g) ?? []).length).toBe(1);
  });

  it('renders the dedicated profile with biography, credentials, contact links, and a booking CTA', () => {
    const html = renderToStaticMarkup(<LawyerProfileView lawyer={lawyer} />);
    expect(html).toContain('Specialization');
    expect(html).toContain('Practising advocate focused on family dispute resolution.');
    expect(html).toContain('Pentagon Law Firm');
    expect(html).toContain('B.A. LL.B., LL.M.');
    expect(html).toContain('Winner of the 23rd moot court competition');
    expect(html).toContain('href="tel:+9779841234567"');
    expect(html).toContain('href="mailto:sita@example.com"');
    expect(html).toContain('href="https://wa.me/9779841234567?text=');
    expect(html).toContain('href="https://maps.google.com/?q=Dillibazar"');
    expect(html).toContain('https://facebook.com/sita');
    expect(html).toContain('https://instagram.com/sita');
    expect(html).toContain('https://linkedin.com/in/sita');
    expect(html).toContain('Book a Consultation');
    expect(html).toContain('href="/consultation/sita-sharma/book"');
  });

  it('only shows sections for data that exists in the backend', () => {
    const minimal: ConsultationLawyer = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Ram Bahadur',
      slug: 'ram-bahadur',
      title: 'Senior Advocate',
    };
    const html = renderToStaticMarkup(<LawyerProfileView lawyer={minimal} />);
    expect(html).toContain('Ram Bahadur');
    expect(html).not.toContain('About &amp; Experience');
    expect(html).not.toContain('Pentagon Law Firm');
    expect(html).not.toContain('Contact on WhatsApp');
    expect(html).not.toContain('Visit Office');
  });

  it('renders the sketch intake fields with required contact details and multilingual problem input', () => {
    const html = renderToStaticMarkup(<ConsultationForm selectedLawyer={lawyer} />);
    expect(html).toContain('Book a Consultation');
    expect(html).toContain('Full name');
    expect(html).toContain('Phone number');
    expect(html).toContain('WhatsApp number');
    expect(html).toContain('Your Permanent Address');
    expect(html).toContain('Your Temporary Address');
    expect(html).toContain('Explain your problem (English or Nepali or mix language)');
    expect(html).toContain('write your legal problem here...');
    expect(html).toContain('Advocate Sita Sharma');
  });
});
