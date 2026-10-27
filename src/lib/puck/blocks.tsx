import Link from 'next/link';
import type { ComponentConfig } from '@measured/puck';

/**
 * Design-system blocks for the visual page builder (Puck).
 * All components are plain presentational functions — no hooks — so the same
 * file renders inside the drag & drop editor (client bundle) AND on the
 * public server renderer (RSC), matching the site's navy/accent design
 * language (see HomeSemesterCard / HomeCategoryCard for the reference styles).
 */

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export type HeroProps = {
  variant: 'navy' | 'light';
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
  height: 'compact' | 'regular' | 'tall';
};

export const Hero: ComponentConfig<HeroProps> = {
  label: 'Hero',
  fields: {
    variant: {
      type: 'select',
      options: [
        { label: 'Navy gradient (brand)', value: 'navy' },
        { label: 'Light / bordered', value: 'light' },
      ],
    },
    height: {
      type: 'select',
      options: [
        { label: 'Compact', value: 'compact' },
        { label: 'Regular', value: 'regular' },
        { label: 'Tall', value: 'tall' },
      ],
    },
    heading: { type: 'text' },
    subheading: { type: 'textarea' },
    ctaText: { type: 'text' },
    ctaLink: { type: 'text' },
  },
  defaultProps: {
    variant: 'navy',
    height: 'regular',
    heading: 'Entertain Lawyers',
    subheading: 'Your trusted gateway to comprehensive legal education resources in Nepal.',
    ctaText: 'Explore Study Materials',
    ctaLink: '/study',
  },
  render: ({ variant, height, heading, subheading, ctaText, ctaLink }) => {
    const pad = height === 'compact' ? 'py-12' : height === 'tall' ? 'py-24' : 'py-16 sm:py-20';
    if (variant === 'navy') {
      return (
        <section className={`${pad} px-4 sm:px-8 bg-gradient-to-br from-navy to-navy/95 dark:from-navy dark:to-navy/90`}>
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">{heading}</h1>
            {subheading ? <p className="mt-4 text-base sm:text-lg text-white/80 leading-relaxed">{subheading}</p> : null}
            {ctaText ? (
              <Link
                href={ctaLink || '#'}
                className="mt-8 inline-flex items-center justify-center px-8 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-md hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-300"
              >
                {ctaText}
              </Link>
            ) : null}
          </div>
        </section>
      );
    }
    return (
      <section className={`${pad} px-4 sm:px-8 bg-surface border-b border-border`}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-navy dark:text-white tracking-tight leading-tight">{heading}</h1>
          {subheading ? <p className="mt-4 text-base sm:text-lg text-text-muted leading-relaxed">{subheading}</p> : null}
          {ctaText ? (
            <Link
              href={ctaLink || '#'}
              className="mt-8 inline-flex items-center justify-center px-8 py-3 rounded-xl bg-navy text-white font-bold text-sm hover:bg-navy/90 hover:-translate-y-0.5 transition-all duration-300"
            >
              {ctaText}
            </Link>
          ) : null}
        </div>
      </section>
    );
  },
};

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------
export type HeadingProps = {
  text: string;
  size: 'sm' | 'md' | 'lg';
  align: 'left' | 'center';
  tone: 'navy' | 'muted';
};

export const Heading: ComponentConfig<HeadingProps> = {
  label: 'Heading',
  fields: {
    text: { type: 'text' },
    size: {
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    align: {
      type: 'select',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    tone: {
      type: 'select',
      options: [
        { label: 'Navy', value: 'navy' },
        { label: 'Muted', value: 'muted' },
      ],
    },
  },
  defaultProps: { text: 'Section heading', size: 'md', align: 'left', tone: 'navy' },
  render: ({ text, size, align, tone }) => {
    const sizeCls = size === 'lg' ? 'text-2xl sm:text-3xl' : size === 'sm' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl';
    const alignCls = align === 'center' ? 'text-center' : 'text-left';
    const toneCls = tone === 'muted' ? 'text-text-muted' : 'text-navy dark:text-white';
    return <h2 className={`${sizeCls} ${alignCls} ${toneCls} font-extrabold tracking-tight px-4 sm:px-8 max-w-5xl mx-auto`}>{text}</h2>;
  },
};

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
export type TextProps = {
  content: string;
  align: 'left' | 'center';
};

export const Text: ComponentConfig<TextProps> = {
  label: 'Text',
  fields: {
    content: { type: 'textarea' },
    align: {
      type: 'select',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
  },
  defaultProps: { content: 'Write your paragraph here.', align: 'left' },
  render: ({ content, align }) => (
    <div className={`px-4 sm:px-8 max-w-3xl mx-auto ${align === 'center' ? 'text-center' : 'text-left'}`}>
      {content.split('\n').map((line, i) =>
        line.trim() ? (
          <p key={i} className="text-sm sm:text-base text-text-secondary leading-relaxed mb-3 last:mb-0">
            {line}
          </p>
        ) : null
      )}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------
export type ImageBlockProps = {
  src: string;
  alt: string;
  ratio: 'auto' | '16-9' | '4-3' | '1-1';
  rounded: 'none' | 'xl' | '2xl';
  maxWidth: 'full' | '5xl' | '3xl';
};

export const ImageBlock: ComponentConfig<ImageBlockProps> = {
  label: 'Image',
  fields: {
    src: { type: 'text', label: 'Image URL' },
    alt: { type: 'text' },
    ratio: {
      type: 'select',
      options: [
        { label: 'Original', value: 'auto' },
        { label: 'Widescreen 16:9', value: '16-9' },
        { label: 'Standard 4:3', value: '4-3' },
        { label: 'Square 1:1', value: '1-1' },
      ],
    },
    rounded: {
      type: 'select',
      options: [
        { label: 'Square', value: 'none' },
        { label: 'Rounded xl', value: 'xl' },
        { label: 'Rounded 2xl', value: '2xl' },
      ],
    },
    maxWidth: {
      type: 'select',
      options: [
        { label: 'Full width', value: 'full' },
        { label: 'Wide', value: '5xl' },
        { label: 'Narrow', value: '3xl' },
      ],
    },
  },
  defaultProps: { src: '', alt: '', ratio: '16-9', rounded: '2xl', maxWidth: '5xl' },
  render: ({ src, alt, ratio, rounded, maxWidth }) => {
    const ratioCls = ratio === '16-9' ? 'aspect-[16/9]' : ratio === '4-3' ? 'aspect-[4/3]' : ratio === '1-1' ? 'aspect-square' : '';
    const roundCls = rounded === '2xl' ? 'rounded-2xl' : rounded === 'xl' ? 'rounded-xl' : '';
    const maxCls = maxWidth === '5xl' ? 'max-w-5xl' : maxWidth === '3xl' ? 'max-w-3xl' : 'max-w-full';
    return (
      <div className="px-4 sm:px-8">
        <div className={`${maxCls} mx-auto ${roundCls} overflow-hidden border border-border bg-surface-alt`}>
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={alt}
              className={`w-full ${ratioCls} object-cover`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className={`${ratioCls} flex items-center justify-center text-xs text-text-muted`}>
              No image URL set
            </div>
          )}
        </div>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// Card grid
// ---------------------------------------------------------------------------
export type CardItem = {
  title: string;
  description?: string;
  image?: string;
  href?: string;
};

export type CardGridProps = {
  title: string;
  subtitle?: string;
  columns: '2' | '3' | '4';
  items: CardItem[];
};

const cardFields = {
  title: { type: 'text' as const },
  description: { type: 'textarea' as const },
  image: { type: 'text' as const, label: 'Image URL (optional)' },
  href: { type: 'text' as const, label: 'Link (optional)' },
};

export const CardGrid: ComponentConfig<CardGridProps> = {
  label: 'Card grid',
  fields: {
    title: { type: 'text' },
    subtitle: { type: 'textarea' },
    columns: {
      type: 'select',
      options: [
        { label: '2 columns', value: '2' },
        { label: '3 columns', value: '3' },
        { label: '4 columns', value: '4' },
      ],
    },
    items: {
      type: 'array',
      getItemSummary: (item) => item?.title || 'Card',
      defaultItemProps: { title: 'New card', description: '', image: '', href: '' },
      arrayFields: cardFields,
    },
  },
  defaultProps: { title: 'Highlights', subtitle: '', columns: '3', items: [] },
  render: ({ title, subtitle, columns, items }) => {
    const colsCls = columns === '2' ? 'sm:grid-cols-2' : columns === '4' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3';
    return (
      <div className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        {title ? (
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy dark:text-white tracking-tight text-center">{title}</h2>
        ) : null}
        {subtitle ? <p className="mt-2 text-text-muted text-sm text-center max-w-2xl mx-auto">{subtitle}</p> : null}
        <div className={`mt-6 grid grid-cols-1 ${colsCls} gap-4`}>
          {items.map((item, i) => {
            const inner = (
              <>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="w-full aspect-[16/10] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div className="p-5">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-navy dark:text-white leading-snug">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-[13px] text-text-secondary dark:text-slate-400 leading-relaxed line-clamp-4">{item.description}</p>
                  ) : null}
                </div>
              </>
            );
            const shellCls =
              'block rounded-2xl border border-border/40 bg-white dark:bg-[#152033] shadow-[0_2px_12px_rgb(0,0,0,0.02)] dark:shadow-none overflow-hidden transition-all duration-400 ease-out hover:shadow-[0_12px_36px_-10px_rgba(26,41,66,0.12)] hover:border-navy/20 motion-safe:hover:-translate-y-1';
            return item.href ? (
              <Link key={i} href={item.href} className={`group ${shellCls}`}>
                {inner}
              </Link>
            ) : (
              <div key={i} className={shellCls}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// CTA banner
// ---------------------------------------------------------------------------
export type CtaBannerProps = {
  variant: 'navy' | 'gold' | 'light';
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
};

export const CtaBanner: ComponentConfig<CtaBannerProps> = {
  label: 'Call to action',
  fields: {
    variant: {
      type: 'select',
      options: [
        { label: 'Navy', value: 'navy' },
        { label: 'Gold', value: 'gold' },
        { label: 'Light', value: 'light' },
      ],
    },
    heading: { type: 'text' },
    subheading: { type: 'textarea' },
    ctaText: { type: 'text' },
    ctaLink: { type: 'text' },
  },
  defaultProps: {
    variant: 'navy',
    heading: 'Need legal help?',
    subheading: 'Consult with an experienced advocate today.',
    ctaText: 'Consult a Lawyer',
    ctaLink: '/consultation',
  },
  render: ({ variant, heading, subheading, ctaText, ctaLink }) => {
    const shell =
      variant === 'gold'
        ? 'bg-gold/10 border border-gold/30'
        : variant === 'light'
          ? 'bg-surface border border-border'
          : 'bg-gradient-to-br from-navy to-navy/95 dark:from-navy dark:to-navy/90';
    const titleCls = variant === 'navy' ? 'text-white' : 'text-navy dark:text-white';
    const subCls =
      variant === 'navy'
        ? 'text-white/80'
        : 'text-text-muted dark:text-slate-400';
    const btnCls =
      variant === 'light'
        ? 'bg-navy text-white hover:bg-navy/90'
        : 'bg-accent text-white hover:bg-accent/90 shadow-md';
    return (
      <div className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        <div className={`${shell} rounded-2xl px-6 py-10 sm:py-12 text-center`}>
          <h2 className={`text-xl sm:text-2xl font-extrabold ${titleCls} tracking-tight`}>{heading}</h2>
          {subheading ? <p className={`mt-2 text-sm sm:text-base ${subCls}`}>{subheading}</p> : null}
          {ctaText ? (
            <Link
              href={ctaLink || '#'}
              className={`mt-6 inline-flex items-center justify-center px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 ${btnCls}`}
            >
              {ctaText}
            </Link>
          ) : null}
        </div>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------
export type StatItem = { value: string; label: string };
export type StatsRowProps = { variant: 'navy' | 'light'; items: StatItem[] };

export const StatsRow: ComponentConfig<StatsRowProps> = {
  label: 'Stats row',
  fields: {
    variant: {
      type: 'select',
      options: [
        { label: 'Navy', value: 'navy' },
        { label: 'Light', value: 'light' },
      ],
    },
    items: {
      type: 'array',
      getItemSummary: (item) => (item?.value && item?.label ? `${item.value} — ${item.label}` : item?.value || 'Stat'),
      defaultItemProps: { value: '0', label: 'Label' },
      arrayFields: {
        value: { type: 'text' as const, label: 'Number / short value' },
        label: { type: 'text' as const, label: 'What it measures' },
      },
    },
  },
  defaultProps: { variant: 'navy', items: [{ value: '1000+', label: 'Students' }] },
  render: ({ variant, items }) => {
    const shell = variant === 'navy' ? 'bg-gradient-to-br from-navy to-navy/95' : 'bg-surface border border-border';
    const valueCls = variant === 'navy' ? 'text-white' : 'text-navy dark:text-white';
    const labelCls = variant === 'navy' ? 'text-white/70' : 'text-text-muted';
    return (
      <div className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        <div className={`${shell} rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-6 px-6 py-8`}>
          {items.map((item, i) => (
            <div key={i} className="text-center">
              <div className={`text-2xl sm:text-3xl font-extrabold ${valueCls} tracking-tight`}>{item.value}</div>
              <div className={`mt-1 text-xs font-medium uppercase tracking-wider ${labelCls}`}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// Spacer
// ---------------------------------------------------------------------------
export type SpacerProps = { height: number };
export const Spacer: ComponentConfig<SpacerProps> = {
  label: 'Spacer',
  fields: { height: { type: 'number', min: 8, max: 200, step: 4 } },
  defaultProps: { height: 32 },
  render: ({ height }) => <div style={{ height }} aria-hidden />,
};
