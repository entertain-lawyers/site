import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/font/google', () => ({
  Roboto: () => ({ variable: 'mock-font' }),
}));

import PostDetail from '@/components/posts/PostDetail';
import { postMetadata } from '@/lib/seo';
import { ASPECT_RATIO_PRESETS } from '@/components/admin/ImageCropperModal';

describe('Featured Image 1200x630 Canva Aspect Ratio Suite', () => {
  it('includes 1200x630 Canva preset with accurate 1200/630 ratio in cropper presets', () => {
    const canvaPreset = ASPECT_RATIO_PRESETS.find((p) => p.label.includes('1200×630') || p.label.includes('Canva'));
    expect(canvaPreset).toBeDefined();
    expect(canvaPreset?.value).toBeCloseTo(1200 / 630, 4);
  });

  it('renders post detail hero image with aspect-[1200/630] without cropping 1200x630 designs', () => {
    const post = {
      id: 'test-1',
      title: 'Landmark Precedent on Cyber Law in Nepal',
      content: '<p>Article analysis content.</p>',
      type: 'BLOG' as const,
      createdAt: new Date('2026-11-20T00:00:00.000Z'),
      featuredImage: 'https://images.entertainlawyers.com/canva-banner-1200x630.jpg',
      author: {
        name: 'Advocate Sharma',
        image: null,
        bio: 'Legal Practitioner',
        website: null,
        role: 'Author',
        email: 'sharma@entertainlawyers.com',
      },
    };

    const html = renderToStaticMarkup(<PostDetail post={post} backUrl="/blogs" backLabel="Blogs" />);

    expect(html).toContain('aspect-[1200/630]');
    expect(html).toContain('canva-banner-1200x630.jpg');
    expect(html).toContain('object-cover object-center');
    expect(html).not.toContain('aspect-[16/9]');
  });

  it('configures OpenGraph and Twitter metadata with 1200x630 dimensions for social sharing', () => {
    const meta = postMetadata({
      title: 'Constitutional Law Primer',
      canonical: '/blogs/123',
      image: 'https://images.entertainlawyers.com/og-canva.jpg',
      content: 'A summary of constitutional jurisprudence in Nepal.',
    });

    const ogImages = meta.openGraph?.images as Array<{ url: string; width?: number; height?: number }>;
    expect(ogImages).toBeDefined();
    expect(ogImages[0].url).toBe('https://images.entertainlawyers.com/og-canva.jpg');
    expect(ogImages[0].width).toBe(1200);
    expect(ogImages[0].height).toBe(630);

    const twitter = meta.twitter;
    expect(twitter).toBeDefined();
    expect(twitter?.card).toBe('summary_large_image');
  });
});
