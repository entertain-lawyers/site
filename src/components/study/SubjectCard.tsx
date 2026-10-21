import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

interface SubjectCardProps {
  title: React.ReactNode;
  subtitle: string;
  href: string;
  icon: LucideIcon | React.ComponentType<any>;
  /**
   * Opt-in title-focused effects (used by the Case-Law landing): staggered
   * card entrance, title text that settles into place, a gold underline that
   * draws beneath the title, and a single luminous sweep across the title
   * (re-swept softly on hover). No effect on default usage.
   */
  effects?: boolean;
  /** Stagger offset in ms for the entrance/underline/shine animations. */
  effectsDelay?: number;
}

export function SubjectCard({ title, subtitle, href, icon: Icon, effects = false, effectsDelay = 0 }: SubjectCardProps) {
  const delayStyle = effects ? { animationDelay: `${effectsDelay}ms` } : undefined;

  return (
    <Link href={href} className={`group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl ${effects ? "relative" : ""}`}>
      {/* Soft brand-gold halo behind the card on hover */}
      {effects && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-2xl bg-gradient-to-r from-gold/0 via-gold/25 to-gold/0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out -z-10"
        />
      )}
      <div className="h-32 sm:h-36 bg-white dark:bg-surface px-5 sm:px-6 py-5 rounded-2xl border border-border/60 dark:border-white/10 shadow-sm transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:border-accent/30 dark:hover:border-accent/30 motion-safe:hover:-translate-y-1.5 flex flex-row items-center justify-between relative overflow-hidden group/card z-0">

        {/* Left Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-accent scale-y-0 origin-top transition-transform duration-500 ease-out group-hover:scale-y-100" />

        {/* Icon Composition (LEFT) */}
        <div className="relative z-10 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 transition-all duration-500 ease-out group-hover:bg-accent/10 group-hover:border-accent/20 group-hover:scale-105 shadow-sm group-hover:shadow-md shrink-0">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-navy/60 dark:text-gray-400 transition-colors duration-500 group-hover:text-accent" strokeWidth={1.5} />
        </div>

        {/* Text Content (RIGHT) */}
        <div className="flex flex-col items-start justify-center text-left relative z-10 w-[calc(100%-3.5rem)] sm:w-[calc(100%-4.5rem)] pl-3 sm:pl-4 h-full">
          <h3 className="relative text-[17px] sm:text-[19px] font-bold text-navy dark:text-gray-100 tracking-tight leading-snug mb-1 transition-colors duration-400 ease-out group-hover:text-accent dark:group-hover:text-blue-400 line-clamp-3 capitalize">
            <span
              className={`relative inline-block max-w-full overflow-hidden align-baseline ${effects ? "motion-safe:animate-[el-title-settle_1s_ease-out_both]" : ""}`}
              style={{ animationDelay: `${effectsDelay + 200}ms` }}
            >
              {title}

              {/* Title effects layer — gold underline + luminous sweep */}
              {effects && (
                <>
                  {/* Gold underline: draws in once, glows softly on hover */}
                  <span
                    aria-hidden="true"
                    style={delayStyle}
                    className="pointer-events-none absolute left-0 bottom-0 h-[2.5px] w-full rounded-full bg-gradient-to-r from-gold via-gold/70 to-gold/0 origin-left opacity-60 transition-opacity duration-500 group-hover:opacity-100 group-hover:shadow-[0_0_12px_rgba(201,162,39,0.5)] motion-safe:animate-[el-title-line-grow_1.1s_cubic-bezier(0.22,1,0.36,1)_both]"
                  />
                  {/* One-time luminous sweep on mount */}
                  <span
                    aria-hidden="true"
                    style={{ animationDelay: `${effectsDelay + 800}ms` }}
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent motion-safe:animate-[el-title-shine_1.6s_ease-in-out_1_both]"
                  />
                  {/* Soft sweep again on hover (opacity + transform split across nested spans) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  >
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 dark:via-white/20 to-transparent -translate-x-[150%] transition-transform duration-[1100ms] ease-out group-hover:translate-x-[260%]" />
                  </span>
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
