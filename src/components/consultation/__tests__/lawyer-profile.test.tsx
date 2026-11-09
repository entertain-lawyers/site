import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LawyerCard, LawyerDetails } from '../ConsultationClient';
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
};

describe('Consult a Lawyer public profile', () => {
  it('renders a compact directory card with identity, specialization, cities, and actions', () => {
    const html = renderToStaticMarkup(<LawyerCard lawyer={lawyer} onView={vi.fn()} onBook={vi.fn()} />);
    expect(html).toContain('Sita Sharma');
    expect(html).toContain('Advocate');
    expect(html).toContain('Family and property law');
    expect(html).toContain('Kathmandu, Pokhara');
    expect(html).toContain('View More');
    expect(html).toContain('Book Consultation');
  });

  it('renders the full profile and working call, email, WhatsApp, map, and social links', () => {
    const html = renderToStaticMarkup(<LawyerDetails lawyer={lawyer} onClose={vi.fn()} onBook={vi.fn()} />);
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
    expect(html).toContain('Direct Call');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Visit Office');
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
