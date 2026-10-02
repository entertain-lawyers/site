import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface HomeCategoryCardProps {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
}

export function HomeCategoryCard({ title, subtitle, href, icon: Icon }: HomeCategoryCardProps) {
  return (
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-2xl">
      <div className="h-32 sm:h-36 bg-white dark:bg-surface px-5 sm:px-8 py-5 rounded-2xl border border-border/40 dark:border-white/5 shadow-[0_2px_12px_rgb(0,0,0,0.02)] transition-all duration-400 ease-out hover:shadow-[0_12px_36px_-10px_rgba(26,41,66,0.12)] dark:hover:shadow-[0_12px_36px_-10px_rgba(255,255,255,0.03)] hover:border-navy/20 dark:hover:border-white/10 motion-safe:hover:-translate-y-1 flex flex-row items-center justify-between relative overflow-hidden z-0">

        {/* Text Content */}
        <div className="flex flex-col items-start justify-center text-left relative z-10 w-[60%] sm:w-[50%] pr-2 h-full">
          <h3 className="text-[17px] sm:text-xl font-bold text-navy dark:text-gray-100 tracking-tight leading-tight mb-1.5 transition-colors duration-400 ease-out group-hover:text-accent dark:group-hover:text-blue-400">
            {title}
          </h3>
          <p className="text-[12.5px] sm:text-[14px] text-text-muted dark:text-gray-400 font-medium leading-snug">
            {subtitle}
          </p>
        </div>

        {/* Premium Graphic Composition */}
        <div className="absolute right-[-2rem] sm:right-[-2.5rem] top-1/2 -translate-y-1/2 w-[130px] h-[130px] sm:w-[180px] sm:h-[180px] rounded-full bg-navy/95 dark:bg-white/10 backdrop-blur-md border border-navy/80 dark:border-white/20 flex items-center justify-center pr-3 sm:pr-6 transition-all duration-500 ease-out group-hover:bg-navy dark:group-hover:bg-white/20 motion-reduce:transition-none pointer-events-none shadow-sm">
          <Icon
            className="w-9 h-9 sm:w-12 sm:h-12 text-white/50 dark:text-white/60 transition-all duration-500 ease-out group-hover:text-white group-hover:scale-[1.15] motion-reduce:group-hover:scale-100 drop-shadow-md"
            strokeWidth={1.25}
          />
        </div>
      </div>
    </Link>
  );
}
