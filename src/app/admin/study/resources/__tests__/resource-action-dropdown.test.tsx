import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import ResourceActionDropdown from '../ResourceActionDropdown';

describe('ResourceActionDropdown Component Suite', () => {
  it('renders Action button with proper accessibility attributes', () => {
    const html = renderToStaticMarkup(
      <ResourceActionDropdown
        id="res-123"
        status="PUBLISHED"
        canDelete={true}
      />
    );

    expect(html).toContain('Action');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders Action button for draft and archived resources', () => {
    const draftHtml = renderToStaticMarkup(
      <ResourceActionDropdown
        id="res-draft"
        status="DRAFT"
        canDelete={false}
      />
    );
    expect(draftHtml).toContain('Action');

    const archivedHtml = renderToStaticMarkup(
      <ResourceActionDropdown
        id="res-archived"
        status="ARCHIVED"
        canDelete={true}
      />
    );
    expect(archivedHtml).toContain('Action');
  });
});
