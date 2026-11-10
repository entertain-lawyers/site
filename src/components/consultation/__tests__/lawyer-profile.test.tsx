import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LawyerCard, LawyerProfilePanel } from '../ConsultationClient';
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
    const html = renderToStaticMarkup(<LawyerCard lawyer={lawyer} onToggle={vi.fn()} />);
    expect(html).toContain('Sita Sharma');
    expect(html).toContain('Advocate');
    expect(html).toContain('Divorce');
    expect(html).toContain('Kathmandu, Pokhara');
    expect(html).toContain('aspect-[4/5]');
    // Biography and contact channels stay out of the collapsed card.
    expect(html).not.toContain('Practising advocate');
    expect(html).not.toContain('+977 9841234567');
  });

  it('renders exactly one primary action on the collapsed card', () => {
    const html = renderToStaticMarkup(<LawyerCard lawyer={lawyer} onToggle={vi.fn()} />);
    expect(html).toContain('View More');
    expect(html).toContain('aria-expanded="false"');
    // No competing booking action on the collapsed card.
    expect(html).not.toContain('Book Consultation');
    expect(html).not.toContain('Book a Consultation');
    expect((html.match(/<button /g) ?? []).length).toBe(1);
  });

  it('marks the expanded card state on the toggle', () => {
    const html = renderToStaticMarkup(<LawyerCard lawyer={lawyer} expanded onToggle={vi.fn()} />);
    expect(html).toContain('Close Profile');
    expect(html).toContain('aria-expanded="true"');
  });

  it('renders the expanded profile with biography, credentials, contact links, and a single booking CTA', () => {
    const html = renderToStaticMarkup(
      <LawyerProfilePanel lawyer={lawyer} onClose={vi.fn()} onBook={vi.fn()} />
    );
    expect(html).toContain('Lawyer profile');
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
    expect((html.match(/Book a Consultation/g) ?? []).length).toBe(1);
  });

  it('only shows sections for data that exists in the backend', () => {
    const minimal: ConsultationLawyer = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Ram Bahadur',
      slug: 'ram-bahadur',
      title: 'Senior Advocate',
    };
    const html = renderToStaticMarkup(
      <LawyerProfilePanel lawyer={minimal} onClose={vi.fn()} onBook={vi.fn()} />
    );
    expect(html).toContain('Ram Bahadur');
    expect(html).not.toContain('About');
    expect(html).not.toContain('Pentagon Law Firm');
    expect(html).not.toContain('WhatsApp');
    expect(html).not.toContain('Visit Office');
  });

  it('renders the sketch intake fields with required contact details and multilingual problem input', () => {
    const html = renderToStaticMarkup(<ConsultationForm />);
    for (const field of ['Full name', 'Phone number', 'WhatsApp number', 'Permanent address', 'Temporary address', 'Explain your legal problem']) {
      expect(html).toContain(field);
    }
    expect(html).toContain('English, Nepali, or a mix of both is welcome.');
    expect(html).toContain('dir="auto"');
    expect(html).toContain('Submit</button>');
  });
});
