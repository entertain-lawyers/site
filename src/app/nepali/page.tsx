import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import { formatBSDate } from '@/lib/nepali-date';
import { Newspaper, Gavel, Zap, Scale, BookText, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import { HomeCategoryCard } from '@/components/home/HomeCategoryCard';

const HomeSearchBar = dynamic(() => import('@/components/home/HomeSearchBar'), {
  loading: () => <div className="h-12 w-full max-w-3xl mx-auto bg-surface-alt animate-pulse rounded-full mb-12"></div>
});

export const metadata: Metadata = {
  title: 'नेपाली संस्करण',
  description: 'Entertain Lawyers को नेपाली संस्करण - समाचार, नजिर, र कानून सम्बन्धी जानकारी।',
  alternates: { canonical: '/nepali' },
};

const NEPALI_CARDS = [
  { title: 'सामान्य समाचार', href: '/nepali/samanya-samachar', icon: Newspaper, subtitle: 'दैनिक र सामान्य समाचारहरू' },
  { title: 'अदालत समाचार', href: '/nepali/adalat-samachar', icon: Gavel, subtitle: 'विभिन्न अदालतका महत्वपूर्ण निर्णय तथा समाचार' },
  { title: 'मुख्य फैसला', href: '/nepali/mukhya-faisla', icon: Zap, subtitle: 'आजका प्रमुख र विशेष समाचारहरू' },
  { title: 'नजिरहरु', href: '/nepali/najirharu', icon: Scale, subtitle: 'सर्वोच्च अदालतका स्थापित नजिरहरू' },
  { title: 'ऐन तथा कानून', href: '/nepali/ain-kanun', icon: BookText, subtitle: 'नेपालका प्रचलित ऐन र कानूनहरू' },
  { title: 'ब्लग, बिचार, अन्य', href: '/nepali/blog-bichar', icon: MessageSquare, subtitle: 'विभिन्न लेखकका लेख, विचार, र अन्य' },
];

import { getWordPressPosts } from '@/lib/wordpress';

export default async function NepaliLandingPage() {
  const wpRes = await getWordPressPosts({ 
    categories: [58, 56, 61], 
    status: 'publish', 
    lang: 'ne', 
    perPage: 10,
    embed: true
  });
  
  const recentPosts = wpRes.data.map((p: any) => {
    let mappedType = 'NEPALI_SAMANYA_SAMACHAR';
    if (p.categories.includes(56)) mappedType = 'NEPALI_ADALAT_SAMACHAR';
    else if (p.categories.includes(61) || p.categories.includes(60)) mappedType = 'NEPALI_BLOG_BICHAR';
    
    return {
      id: String(p.id),
      title: p.title.rendered,
      type: mappedType,
      createdAt: new Date(p.date),
      author: { email: `WP Author (${p.author})` },
      featuredImage: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
    };
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'NEPALI_SAMANYA_SAMACHAR': return 'सामान्य समाचार';
      case 'NEPALI_ADALAT_SAMACHAR': return 'अदालत समाचार';
      case 'NEPALI_BLOG_BICHAR': return 'ब्लग, बिचार';
      case 'NEPALI_MUKHYA_SAMACHAR': return 'मुख्य फैसला';
      default: return 'समाचार';
    }
  };
  return (
    <div className="w-full bg-background min-h-screen pb-12 sm:pb-16 lg:pb-20 relative overflow-hidden">

      {/* Background Decorative Elements */}
      <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 dark:bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <section className="pt-2 pb-4 sm:pt-3 sm:pb-6 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <Link
          href="/nepali"
          aria-label="Entertain Lawyers — मुख्य पृष्ठ"
          className="relative w-full max-w-[280px] sm:max-w-[480px] md:max-w-[600px] h-24 sm:h-32 md:h-36 mb-0 drop-shadow-sm rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent overflow-hidden"
        >
          {/* Light Mode Logo */}
          <Image
            src="/wordmark_navy.png"
            alt="Entertain Lawyers - Connecting with Legal Updates"
            fill
            className="object-contain dark:hidden"
            priority
          />
          {/* Dark Mode Logo */}
          <Image
            src="/wordmark_white.png"
            alt="Entertain Lawyers - Connecting with Legal Updates"
            fill
            className="object-contain hidden dark:block"
            priority
          />
        </Link>
        <h1 className="sr-only">Entertain Lawyers - नेपाली संस्करण</h1>
        <p className="max-w-2xl text-text-secondary text-fluid-base font-medium tracking-wide mt-1 font-nepali">
          नेपालको प्रमुख अनलाइन प्लेटफर्म - <span className="text-accent font-bold">कानूनी समाचार</span>, <span className="text-accent font-bold">नजिरहरु</span>, र <span className="text-accent font-bold">अध्ययन सामग्रीहरु</span>।
        </p>
      </section>

      {/* Divider Line */}
      <div className="w-full max-w-3xl mx-auto px-6 mb-4 sm:mb-6 relative z-10">
        <hr className="border-t-2 border-border-strong dark:border-white/20" />
      </div>

      {/* Main Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Search Bar */}
        <div className="w-full max-w-3xl mx-auto mb-10 sm:mb-12 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-full blur opacity-70"></div>
          <HomeSearchBar />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {NEPALI_CARDS.map((card, idx) => (
            <HomeCategoryCard key={idx} {...card} />
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white font-nepali flex items-center gap-3">
            <span className="w-2 h-8 bg-accent rounded-full"></span>
            ताजा अपडेटहरू
          </h2>
        </div>

        {recentPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentPosts.map((post: any) => (
              <article key={post.id} className="group relative bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 dark:border-white/5 flex flex-col h-full">
                <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                  {post.featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <span className="text-6xl text-black/5 dark:text-white/5 font-serif italic">EL</span>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-accent/10 text-accent dark:bg-accent/20 text-xs font-bold rounded-full font-nepali uppercase tracking-wider">
                      {getTypeLabel(post.type)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-3 line-clamp-2 group-hover:text-accent transition-colors font-nepali">
                    <Link href={`/nepali/post/${post.id}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {post.title}
                    </Link>
                  </h3>
                  <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-sm text-text-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-navy dark:text-white">
                        {(post.author?.email)?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium truncate max-w-[120px]">{(post.author?.email) || 'सम्पादक'}</span>
                    </div>
                    <time className="font-medium font-nepali">{formatBSDate(post.createdAt)}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy dark:text-white font-nepali mb-2">कुनै पनि सामग्री भेटिएन</h3>
            <p className="text-text-secondary font-nepali">हालसम्म कुनै पनि ताजा अपडेटहरू प्रकाशित भएका छैनन्।</p>
          </div>
        )}
      </section>
    </div>
  );
}
