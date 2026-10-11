import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncFaqs, processFaqItem, WP_EN_API, WP_NE_API } from './sync-faqs';

describe('FAQ Synchronization', () => {
    let mockPrisma: any;
    let mockFetch: any;

    beforeEach(() => {
        mockPrisma = {
            fAQ: {
                findFirst: vi.fn(),
                update: vi.fn(),
                create: vi.fn(),
            }
        };
        mockFetch = vi.fn();
    });

    it('should paginate through endpoints until an empty or 400 array is returned', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true, json: async () => Array(100).fill({ id: 1, title: { rendered: 'Q' }, status: 'publish' })
        })
        .mockResolvedValueOnce({
            ok: true, json: async () => [{ id: 2, title: { rendered: 'Q2' }, status: 'publish' }]
        })
        .mockResolvedValueOnce({
            ok: true, json: async () => []
        });

        // Test only EN for simplicity in pagination check
        vi.spyOn(console, 'log').mockImplementation(() => {});
        await syncFaqs(mockPrisma, mockFetch);
        
        // It should call fetch multiple times for EN and NE
        expect(mockFetch).toHaveBeenCalledWith(`${WP_EN_API}?per_page=100&page=1`);
        expect(mockFetch).toHaveBeenCalledWith(`${WP_EN_API}?per_page=100&page=2`);
    });

    it('should separate EN and NE languages appropriately', async () => {
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('nepali')) {
                return Promise.resolve({ ok: true, json: async () => [{ id: 101, title: { rendered: 'NE Q' }, status: 'publish' }] });
            }
            return Promise.resolve({ ok: true, json: async () => [{ id: 100, title: { rendered: 'EN Q' }, status: 'publish' }] });
        });

        vi.spyOn(console, 'log').mockImplementation(() => {});
        mockPrisma.fAQ.findFirst.mockResolvedValue(null);

        await syncFaqs(mockPrisma, mockFetch);

        expect(mockPrisma.fAQ.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ language: 'en', question: 'EN Q' })
        }));
        
        expect(mockPrisma.fAQ.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ language: 'ne', question: 'NE Q' })
        }));
    });

    it('should prevent duplicates and update existing FAQs', async () => {
        mockPrisma.fAQ.findFirst.mockResolvedValue({ id: 'existing-id-123' });
        
        const wpItem = {
            id: 55,
            title: { rendered: 'Existing Question' },
            content: { rendered: 'New Answer' },
            status: 'publish',
            menu_order: 2
        };

        await processFaqItem(mockPrisma, wpItem, 'en');

        expect(mockPrisma.fAQ.create).not.toHaveBeenCalled();
        expect(mockPrisma.fAQ.update).toHaveBeenCalledWith({
            where: { id: 'existing-id-123' },
            data: { answer: 'New Answer', order: 2, status: 'PUBLISHED' }
        });
    });

    it('should retry on API errors', async () => {
        mockFetch
            .mockRejectedValueOnce(new Error('Network failure'))
            .mockResolvedValueOnce({ ok: true, json: async () => [] });
        
        const { fetchFaqsPage } = await import('./sync-faqs');
        const res = await fetchFaqsPage(WP_EN_API, 1, mockFetch);
        expect(res).toEqual([]);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});
