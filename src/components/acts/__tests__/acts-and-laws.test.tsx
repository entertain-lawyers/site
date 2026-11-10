import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ActsAndLawsClient, { ActItem } from '../ActsAndLawsClient';

const MOCK_ACTS: ActItem[] = [
  {
    id: '1',
    title: 'Constitution of Nepal (नेपालको संविधान)',
    titleEn: 'Constitution of Nepal',
    slug: 'constitution-of-nepal',
    category: 'CONSTITUTION',
    description: 'Supreme law of the federal republic.',
    documentUrl: 'https://example.com/constitution.pdf',
    fileSize: 1024000,
    publishDate: new Date('2015-09-20'),
    status: 'PUBLISHED',
  },
  {
    id: '2',
    title: 'Arbitration Act, 2055',
    titleEn: 'Arbitration Act',
    slug: 'arbitration-act-2055',
    category: 'ACTS',
    description: 'Arbitration framework in Nepal.',
    documentUrl: 'https://example.com/arbitration.pdf',
    fileSize: 512000,
    publishDate: new Date('1999-04-15'),
    status: 'PUBLISHED',
  },
  {
    id: '3',
    title: 'Supreme Court Rules, 2074',
    titleEn: 'Supreme Court Rules',
    slug: 'supreme-court-rules-2074',
    category: 'RULES_REGULATIONS',
    description: 'Supreme court procedures.',
    documentUrl: 'https://example.com/sc-rules.pdf',
    fileSize: 800000,
    publishDate: new Date('2017-10-10'),
    status: 'PUBLISHED',
  },
];

describe('ActsAndLawsClient Component Suite', () => {
  it('renders header, subtitle, search input and shortlist categories', () => {
    const html = renderToStaticMarkup(<ActsAndLawsClient initialActs={MOCK_ACTS} />);

    expect(html).toContain('Acts and Laws');
    expect(html).toContain('Get all the important Acts, Laws &amp; Regulations in Alphabetical order');
    expect(html).toContain('Search Acts, Laws, Regulations...');
    expect(html).toContain('Short list: All');
    expect(html).toContain('Constitution');
    expect(html).toContain('Rules / Regulations');
    expect(html).toContain('International Treaties');
    expect(html).toContain('Historical Documents');
  });

  it('renders numbered cards with View and Download buttons matching the sketch', () => {
    const html = renderToStaticMarkup(<ActsAndLawsClient initialActs={MOCK_ACTS} />);

    expect(html).toContain('Constitution of Nepal');
    expect(html).toContain('Arbitration Act, 2055');
    expect(html).toContain('View');
    expect(html).toContain('Download');
    // Check numbered badges
    expect(html).toContain('1');
    expect(html).toContain('2');
  });

  it('displays empty state gracefully when no acts are provided', () => {
    const html = renderToStaticMarkup(<ActsAndLawsClient initialActs={[]} />);

    expect(html).toContain('No acts or laws found');
  });
});
