import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PostActionDropdown from '../PostActionDropdown';
import type { AdminPostRow } from '../PostsTableClient';

describe('PostActionDropdown Component Suite', () => {
  const dummyPost: AdminPostRow = {
    id: '123',
    titleHtml: 'Test Post Title',
    type: 'NEWS',
    status: 'PUBLISHED',
    authorName: 'John Doe',
    author: null,
    categories: 'Law',
    dateHeadline: 'Published',
    dateValue: 'Nov 10, 2026',
    currentTab: 'all',
    lang: 'en',
    wpEditUrl: '',
  };

  it('renders Action button with proper accessibility attributes', () => {
    const html = renderToStaticMarkup(
      <PostActionDropdown
        post={dummyPost}
        role="ADMIN"
        wpAdminBase={{ en: 'https://wp.example.com', ne: 'https://ne.example.com' }}
        busy={false}
        onUpdateStatus={async () => {}}
        onDeleteSingle={async () => {}}
      />
    );

    expect(html).toContain('Action');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('respects busy disabled state on the trigger button', () => {
    const html = renderToStaticMarkup(
      <PostActionDropdown
        post={dummyPost}
        role="ADMIN"
        wpAdminBase={{ en: 'https://wp.example.com', ne: 'https://ne.example.com' }}
        busy={true}
        onUpdateStatus={async () => {}}
        onDeleteSingle={async () => {}}
      />
    );

    expect(html).toContain('disabled=""');
  });
});
