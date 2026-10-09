import Link from "next/link";
import { GraduationCap } from "lucide-react";
import React from "react";

interface HomeSemesterCardProps {
  order: number;
  href: string;
}

export function HomeSemesterCard({ order, href }: HomeSemesterCardProps) {
  const getOrdinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const suffix = getOrdinalSuffix(order);

  return (
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-2xl">
      <div className="h-32 sm:h-36 bg-white dark:bg-surface px-5 sm:px-8 py-5 rounded-2xl border border-border/40 dark:border-white/5 shadow-[0_2px_12px_rgb(0,0,0,0.02)] transition-all duration-400 ease-out hover:shadow-[0_12px_36px_-10px_rgba(26,41,66,0.12)] dark:hover:shadow-[0_12px_36px_-10px_rgba(255,255,255,0.03)] hover:border-navy/20 dark:hover:border-white/10 motion-safe:hover:-translate-y-1 flex flex-row items-center justify-between relative overflow-hidden z-0">
        
        {/* Left Premium Graphic Composition */}
        <div className="absolute left-[-2rem] sm:left-[-2.5rem] top-1/2 -translate-y-1/2 w-[130px] h-[130px] sm:w-[180px] sm:h-[180px] rounded-full bg-navy/95 dark:bg-white/10 backdrop-blur-md border border-navy/80 dark:border-white/20 flex items-center justify-center pl-3 sm:pl-6 transition-all duration-500 ease-out group-hover:bg-navy dark:group-hover:bg-white/20 motion-reduce:transition-none pointer-events-none shadow-sm z-0">
          <GraduationCap
            className="w-9 h-9 sm:w-12 sm:h-12 text-white/50 dark:text-white/60 transition-all duration-500 ease-out group-hover:text-white group-hover:scale-[1.15] motion-reduce:group-hover:scale-100 drop-shadow-md"
            strokeWidth={1.25}
          />
        </div>

        {/* Right Text Content */}
        <div className="flex flex-col items-end justify-center text-right relative z-10 w-[70%] sm:w-[65%] pl-2 h-full ml-auto">
          <h3 className="text-[18px] sm:text-[20px] font-black text-navy dark:text-gray-100 tracking-tight leading-snug mb-1 transition-colors duration-400 ease-out group-hover:text-accent dark:group-hover:text-blue-400 line-clamp-4 uppercase">
            {order}<sup>{suffix}</sup> SEMESTER
          </h3>
          <p className="text-[12px] sm:text-[13px] text-text-muted dark:text-gray-400 font-medium leading-snug line-clamp-1 uppercase">
            EXPLORE SUBJECTS
          </p>
        </div>
      </div>
    </Link>
  );
}
