import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

interface HomeCategoryCardProps {
  title: React.ReactNode;
  subtitle: string;
  href: string;
  icon: LucideIcon | React.ComponentType<any>;
}

export function HomeCategoryCard({ title, subtitle, href, icon: Icon }: HomeCategoryCardProps) {
  return (
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl">
      <div className="h-32 sm:h-36 bg-white dark:bg-surface px-5 sm:px-6 py-5 rounded-2xl border border-border/60 dark:border-white/10 shadow-sm transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:border-accent/30 dark:hover:border-accent/30 motion-safe:hover:-translate-y-1.5 flex flex-row items-center justify-between relative overflow-hidden group/card z-0">
        
        {/* Left Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-accent scale-y-0 origin-top transition-transform duration-500 ease-out group-hover:scale-y-100" />
        
        {/* Icon Composition (LEFT) */}
        <div className="relative z-10 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 transition-all duration-500 ease-out group-hover:bg-accent/10 group-hover:border-accent/20 group-hover:scale-105 shadow-sm group-hover:shadow-md shrink-0">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-navy/60 dark:text-gray-400 transition-colors duration-500 group-hover:text-accent" strokeWidth={1.5} />
        </div>
        
        {/* Text Content (RIGHT) */}
        <div className="flex flex-col items-start justify-center text-left relative z-10 w-[calc(100%-3.5rem)] sm:w-[calc(100%-4.5rem)] pl-3 sm:pl-4 h-full">
          <h3 className="text-[17px] sm:text-[19px] font-bold text-navy dark:text-gray-100 tracking-tight leading-snug mb-1 transition-colors duration-400 ease-out group-hover:text-accent dark:group-hover:text-blue-400 line-clamp-3 capitalize">
            {title}
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
