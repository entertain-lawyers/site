import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthorBioTrigger, { AuthorInfo } from '../AuthorBioTrigger';

describe('AuthorBioTrigger Component Suite', () => {
  it('renders author avatar with /logo.jpg fallback when no image is provided', () => {
    const author: AuthorInfo = {
      name: 'Advocate Ramesh Sharma',
      role: 'ADMIN',
    };

    const html = renderToStaticMarkup(<AuthorBioTrigger author={author} size="sm" showName />);

    expect(html).toContain('Advocate Ramesh Sharma');
    expect(html).toContain('/logo.jpg');
    expect(html).toContain('View short bio of Advocate Ramesh Sharma');
  });

  it('renders custom author image when provided', () => {
    const author: AuthorInfo = {
      name: 'Sunita Adhikari',
      image: 'https://example.com/avatar.jpg',
      role: 'EDITOR',
    };

    const html = renderToStaticMarkup(<AuthorBioTrigger author={author} size="md" showName />);

    expect(html).toContain('Sunita Adhikari');
    expect(html).toContain('https://example.com/avatar.jpg');
  });

  it('renders Nepali default label when lang="ne" and author is missing', () => {
    const html = renderToStaticMarkup(<AuthorBioTrigger author={null} size="xs" showName lang="ne" />);

    expect(html).toContain('सम्पादकीय समूह');
    expect(html).toContain('सम्पादकीय समूह को परिचय हेर्नुहोस्');
  });

  it('renders initials fallback when image is not present and name is given', () => {
    const author: AuthorInfo = {
      name: 'Bharat Karki',
      initials: 'BK',
    };

    const html = renderToStaticMarkup(<AuthorBioTrigger author={author} size="lg" showName />);

    expect(html).toContain('Bharat Karki');
  });

  it('supports custom child layout without breaking button accessibility', () => {
    const author: AuthorInfo = {
      name: 'Deepak Silwal',
    };

    const html = renderToStaticMarkup(
      <AuthorBioTrigger author={author}>
        <span className="custom-trigger">Click Author</span>
      </AuthorBioTrigger>
    );

    expect(html).toContain('custom-trigger');
    expect(html).toContain('Click Author');
    expect(html).toContain('aria-haspopup="dialog"');
  });
});
