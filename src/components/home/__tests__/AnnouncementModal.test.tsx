import { describe, it, expect } from 'vitest';
import {
  getDismissalStorageKey,
} from '../AnnouncementModal';
import type { AnnouncementRecord } from '@/lib/announcements';

describe('AnnouncementModal Storage & Dismissal Logic', () => {
  const sampleAnnouncement: AnnouncementRecord = {
    id: 'announcement-1',
    title: "We're Updating Our Website!",
    message: 'Some materials may be temporarily unavailable.',
    isActive: true,
    startDate: null,
    expiryDate: null,
    linkText: null,
    linkUrl: null,
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T01:00:00.000Z',
  };

  describe('getDismissalStorageKey', () => {
    it('generates consistent key with announcement id and timestamp', () => {
      const key = getDismissalStorageKey(sampleAnnouncement);
      expect(key).toBe(`el_announcement_announcement-1_${new Date('2026-11-18T01:00:00.000Z').getTime()}`);
    });

    it('generates a new key when updatedAt changes (allowing re-announcing to dismissed visitors)', () => {
      const key1 = getDismissalStorageKey(sampleAnnouncement);

      const updatedAnnouncement = {
        ...sampleAnnouncement,
        updatedAt: '2026-11-18T05:30:00.000Z',
      };
      const key2 = getDismissalStorageKey(updatedAnnouncement);

      expect(key1).not.toBe(key2);
      expect(key2).toBe(`el_announcement_announcement-1_${new Date('2026-11-18T05:30:00.000Z').getTime()}`);
    });

    it('generates a new key when announcement id changes', () => {
      const key1 = getDismissalStorageKey(sampleAnnouncement);

      const newAnnouncement = {
        ...sampleAnnouncement,
        id: 'announcement-2',
      };
      const key2 = getDismissalStorageKey(newAnnouncement);

      expect(key1).not.toBe(key2);
      expect(key2).toContain('announcement-2');
    });
  });
});
