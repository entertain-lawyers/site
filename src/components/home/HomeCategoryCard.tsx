import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface HomeCategoryCardProps {
  title: React.ReactNode;
  subtitle: string;
  href: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
}

export function HomeCategoryCard({ title, subtitle, href, icon: Icon }: HomeCategoryCardProps) {
  return (
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-blue-500/50 rounded-2xl">
      <div className="h-32 sm:h-36 bg-white dark:bg-[#152033] px-5 sm:px-8 py-5 rounded-2xl border border-border/40 dark:border-white/5 shadow-[0_2px_12px_rgb(0,0,0,0.02)] dark:shadow-none transition-[box-shadow,border-color] duration-400 ease-out hover:shadow-[0_12px_36px_-10px_rgba(26,41,66,0.12)] dark:hover:shadow-[0_8px_30px_-6px_rgba(37,99,235,0.12)] hover:border-navy/20 dark:hover:border-blue-500/30 flex flex-row items-center justify-between relative overflow-hidden z-0">

        {/* Premium Graphic Composition (Right) */}
        <div className="absolute right-[-2rem] sm:right-[-2.5rem] top-1/2 -translate-y-1/2 w-[130px] h-[130px] sm:w-[180px] sm:h-[180px] rounded-full bg-navy/95 dark:bg-gradient-to-br dark:from-blue-900/30 dark:to-slate-800/40 backdrop-blur-md border border-navy/80 dark:border-white/5 flex items-center justify-center pr-3 sm:pr-6 transition-all duration-500 ease-out group-hover:bg-navy dark:group-hover:from-blue-800/40 dark:group-hover:to-slate-700/50 motion-reduce:transition-none pointer-events-none shadow-sm dark:shadow-none">
          <Icon
            className="w-9 h-9 sm:w-12 sm:h-12 text-white/50 dark:text-blue-200/80 transition-all duration-500 ease-out group-hover:text-white dark:group-hover:text-blue-100 group-hover:scale-[1.15] motion-reduce:group-hover:scale-100 drop-shadow-md dark:drop-shadow-none"
            strokeWidth={1.25}
          />
        </div>

        {/* Text Content (Left) */}
        <div className="flex flex-col items-start justify-center text-left relative z-10 w-[70%] sm:w-[65%] pr-2 h-full mr-auto">
          <h3
            style={{ fontFamily: 'var(--font-mukta), Tahoma, sans-serif' }}
            className="text-[18px] sm:text-[20px] font-black text-navy dark:text-slate-100 tracking-tight leading-snug mb-1 transition-colors duration-400 ease-out group-hover:text-accent dark:group-hover:text-blue-400 line-clamp-4 capitalize"
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] sm:text-[13px] text-text-muted dark:text-slate-400 font-medium leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
