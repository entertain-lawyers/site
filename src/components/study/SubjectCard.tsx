import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

/**
 * Opt-in effect themes (Case-Law landing). Each variant carries a hover
 * atmosphere tied to the card's title: civil = ink blue, criminal = blood
 * red (with title drips), writs = official seal amber.
 */
type EffectVariant = 'civil' | 'criminal' | 'writs';

interface EffectTheme {
  /** Soft glow behind the card on hover. */
  halo: string;
  /** Vertical wash rising inside the card from its bottom edge. */
  wash: string;
  /** Title colour on hover. */
  titleHover: string;
  /** Icon hover colour. */
  iconHover: string;
  /** Blood drips trailing from the title (criminal only). */
  drips?: boolean;
}

const EFFECT_THEMES: Record<EffectVariant, EffectTheme> = {
  civil: {
    halo: 'bg-gradient-to-r from-accent/0 via-accent/25 to-accent/0',
    wash: 'from-accent/15 to-transparent',
    titleHover: 'group-hover:text-accent dark:group-hover:text-blue-400',
    iconHover: 'group-hover:text-accent',
  },
  criminal: {
    halo: 'bg-gradient-to-r from-red-900/0 via-red-700/20 to-red-900/0',
    wash: 'from-red-900/25 via-red-700/10 to-transparent',
    titleHover: 'group-hover:text-red-700 dark:group-hover:text-red-400',
    iconHover: 'group-hover:text-red-500/80',
    drips: true,
  },
  writs: {
    halo: 'bg-gradient-to-r from-gold/0 via-gold/25 to-gold/0',
    wash: 'from-gold/25 to-transparent',
    titleHover: 'group-hover:text-amber-600 dark:group-hover:text-gold',
    iconHover: 'group-hover:text-gold',
  },
};

interface SubjectCardProps {
  title: React.ReactNode;
  subtitle: string;
  href: string;
  icon: LucideIcon | React.ComponentType<any>;
  /**
   * Opt-in title-focused effects (used by the Case-Law landing): staggered
   * card entrance and a variant-themed hover atmosphere. No effect on
   * default usage.
   */
  effects?: boolean;
  /** Stagger offset in ms for the entrance animations. */
  effectsDelay?: number;
  /** Which theme to use when `effects` is on. */
  variant?: EffectVariant;
}

export function SubjectCard({ title, subtitle, href, icon: Icon, effects = false, effectsDelay = 0, variant = 'civil' }: SubjectCardProps) {
  const theme = effects ? EFFECT_THEMES[variant] : null;

  return (
    <Link href={href} className={`group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl ${effects ? "relative" : ""}`}>
      {/* Soft themed glow behind the card on hover */}
      {theme && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out -z-10 ${theme.halo}`}
        />
      )}
      <div className="h-32 sm:h-36 bg-white dark:bg-surface px-5 sm:px-6 py-5 rounded-2xl border border-border/60 dark:border-white/10 shadow-sm transition-[box-shadow,border-color,background-color] duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:border-accent/30 dark:hover:border-accent/30 flex flex-row items-center justify-between relative overflow-hidden group/card z-0">

        {/* Themed wash rising from the card's bottom edge on hover */}
        {theme && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-2/5 rounded-b-2xl bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${theme.wash}`}
          />
        )}

        {/* Left Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-accent scale-y-0 origin-top transition-transform duration-500 ease-out group-hover:scale-y-100" />

        {/* Icon Composition (LEFT) */}
        <div className="relative z-10 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 transition-all duration-500 ease-out group-hover:bg-accent/10 group-hover:border-accent/20 group-hover:scale-105 shadow-sm group-hover:shadow-md shrink-0">
          <Icon
            className={`w-6 h-6 sm:w-7 sm:h-7 text-navy/60 dark:text-gray-400 transition-colors duration-500 ${theme ? theme.iconHover : 'group-hover:text-accent'}`}
            strokeWidth={1.5}
          />
        </div>

        {/* Text Content (RIGHT) */}
        <div className="flex flex-col items-start justify-center text-left relative z-10 w-[calc(100%-3.5rem)] sm:w-[calc(100%-4.5rem)] pl-3 sm:pl-4 h-full">
          <h3 className={`relative text-[17px] sm:text-[19px] font-bold text-navy dark:text-gray-100 tracking-tight leading-snug mb-1 transition-colors duration-400 ease-out line-clamp-3 capitalize ${theme ? theme.titleHover : 'group-hover:text-accent dark:group-hover:text-blue-400'}`}>
            <span
              className={`relative inline-block max-w-full overflow-hidden align-baseline ${effects ? "motion-safe:animate-[el-title-settle_1s_ease-out_both]" : ""}`}
              style={{ animationDelay: `${effectsDelay + 200}ms` }}
            >
              {title}

              {/* Criminal theme — blood drips trailing from the title on hover */}
              {effects && theme?.drips && (
                <>
                  {[
                    { left: '16%', h: 'h-[11px]', delay: '150ms' },
                    { left: '38%', h: 'h-[7px]', delay: '320ms' },
                    { left: '74%', h: 'h-[13px]', delay: '240ms' },
                  ].map((d, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      style={{ left: d.left, transitionDelay: d.delay }}
                      className={`pointer-events-none absolute bottom-0 w-[2px] rounded-full origin-top scale-y-0 opacity-0 transition-all duration-500 ease-out group-hover:scale-y-100 group-hover:opacity-100 ${d.h}`}
                    >
                      <span className="absolute inset-0 bg-gradient-to-b from-red-800/80 to-red-900/0" />
                    </span>
                  ))}
                </>
              )}
            </span>
          </h3>
          {subtitle && (
            <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
              <p className="text-[12px] sm:text-[13px] text-text-muted dark:text-gray-400 font-semibold leading-snug tracking-wide group-hover:text-navy/70 dark:group-hover:text-gray-300 transition-colors uppercase">
                {subtitle}
              </p>
              <ArrowRight className="w-3.5 h-3.5 text-accent -translate-x-4 opacity-0 transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
