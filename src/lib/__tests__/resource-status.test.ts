import { describe, it, expect } from 'vitest';
import { resourceBodyStatus } from '../resource-status';

// Drives both the admin "Document Status" badge and the public resource page
// (Read Document / Read Resource / PDF Coming Soon).
describe('resourceBodyStatus', () => {
  it('is UPLOADED when a PDF is attached, even if text exists too', () => {
    expect(resourceBodyStatus({ documentId: 'doc-1', content: null })).toBe('UPLOADED');
    expect(resourceBodyStatus({ documentId: 'doc-1', content: '<p>Notes</p>' })).toBe('UPLOADED');
  });

  it('is WRITTEN for text-only resources such as migrated case summaries', () => {
    expect(resourceBodyStatus({ documentId: null, content: '<b>Facts of the Case:</b> ...' })).toBe('WRITTEN');
  });

  it('is EMPTY when there is neither a PDF nor non-blank text', () => {
    expect(resourceBodyStatus({ documentId: null, content: null })).toBe('EMPTY');
    expect(resourceBodyStatus({ documentId: null, content: '' })).toBe('EMPTY');
    expect(resourceBodyStatus({ documentId: null, content: '   \n ' })).toBe('EMPTY');
  });
});
