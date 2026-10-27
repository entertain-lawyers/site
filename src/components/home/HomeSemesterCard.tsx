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
    <Link href={href} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-2xl">
      <div className="h-32 sm:h-36 bg-gradient-to-br from-navy to-navy/95 dark:from-navy dark:to-navy/90 px-5 sm:px-6 py-5 rounded-2xl border border-navy-800 shadow-md transition-all duration-400 ease-out hover:shadow-[0_8px_30px_rgba(26,41,66,0.3)] motion-safe:hover:-translate-y-1 flex flex-row items-center justify-between relative overflow-hidden z-0">
        
        {/* Faint Background Number */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 text-[100px] sm:text-[130px] font-black text-white/5 dark:text-white/5 pointer-events-none select-none leading-none z-0 transition-transform duration-500 ease-out group-hover:-translate-x-1">
          {order}
        </div>
        
        {/* Left Icon Composition */}
        <div className="relative z-10 flex items-center justify-center w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/10 shadow-inner transition-transform duration-400 ease-out group-hover:scale-110 shrink-0">
          <GraduationCap
            className="w-7 h-7 sm:w-8 sm:h-8 text-white transition-all duration-400 ease-out group-hover:text-accent group-hover:scale-110"
            strokeWidth={1.5}
          />
        </div>

        {/* Right Text Content */}
        <div className="flex flex-col items-end justify-center text-right relative z-10 w-[calc(100%-4rem)] sm:w-[calc(100%-5rem)] pl-2 h-full">
          <h3
            style={{ fontFamily: 'var(--font-mukta), Tahoma, sans-serif' }}
            className="text-[18px] sm:text-[20px] font-black text-white tracking-tight leading-snug mb-1 capitalize"
          >
            {order}<sup className="lowercase">{suffix}</sup> Semester
          </h3>
          <p className="text-[12px] sm:text-[13px] text-white/70 font-medium leading-snug uppercase tracking-wider transition-colors duration-400 group-hover:text-white/90">
            Explore Subjects
          </p>
        </div>
      </div>
    </Link>
  );
}
