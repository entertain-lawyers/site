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
      <div className="h-40 sm:h-48 bg-gradient-to-br from-navy to-navy/90 dark:from-navy dark:to-navy/80 px-5 sm:px-6 py-6 rounded-2xl border border-navy-800 shadow-lg transition-all duration-500 ease-out group-hover:shadow-[0_20px_40px_-15px_rgba(26,41,66,0.6)] dark:group-hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)] group-hover:scale-[1.02] flex flex-col items-center justify-center relative overflow-hidden z-0">
        
        {/* Giant Watermark Number */}
        <div className="absolute right-[-5%] top-[-10%] text-[140px] sm:text-[180px] font-black text-white/5 dark:text-white/5 pointer-events-none select-none leading-none z-0 transition-transform duration-700 ease-out group-hover:scale-[1.15] group-hover:-rotate-6">
          {order}
        </div>
        
        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col items-center text-center w-full h-full justify-center">
          <div className="mb-3 sm:mb-4 bg-white/10 dark:bg-white/5 p-3 rounded-full backdrop-blur-sm border border-white/10 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:bg-accent/20 group-hover:border-accent/30 shadow-sm">
            <GraduationCap
              className="w-7 h-7 sm:w-9 sm:h-9 text-accent dark:text-accent group-hover:text-white transition-colors duration-500"
              strokeWidth={1.5}
            />
          </div>
          
          <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-snug mb-1 capitalize">
            {order}<sup>{suffix}</sup> Semester
          </h3>
          <p className="text-[11px] sm:text-[12px] text-white/60 font-semibold leading-snug uppercase tracking-widest mt-0.5 transition-colors duration-400 group-hover:text-white/90">
            Explore Subjects
          </p>
        </div>
      </div>
    </Link>
  );
}
