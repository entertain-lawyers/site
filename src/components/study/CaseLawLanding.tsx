import Link from 'next/link';
import { Scale, ShieldAlert, Landmark, ArrowRight, Gavel, FileSignature, Users } from 'lucide-react';

export default function CaseLawLanding() {
  const categories = [
    {
      id: 'civil',
      title: 'CIVIL CASES',
      href: '/study?type=CASE_LAW&q=civil',
      Icon: Scale,
      SecondaryIcon: Users,
    },
    {
      id: 'criminal',
      title: 'CRIMINAL CASES',
      href: '/study?type=CASE_LAW&q=criminal',
      Icon: ShieldAlert,
      SecondaryIcon: Gavel,
    },
    {
      id: 'writs',
      title: 'WRITS',
      href: '/study?type=CASE_LAW&q=writ',
      Icon: Landmark,
      SecondaryIcon: FileSignature,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {categories.map((cat) => (
        <Link 
          key={cat.id}
          href={cat.href}
          className="group flex flex-col items-center justify-center bg-surface border-2 border-border rounded-2xl hover:border-navy dark:hover:border-white/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 p-10 h-full relative overflow-hidden aspect-square"
        >
          {/* Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-navy/40 to-navy/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative mb-6 text-navy dark:text-white group-hover:scale-110 transition-transform duration-500">
            <cat.Icon className="w-24 h-24 stroke-[1.5]" />
            <cat.SecondaryIcon className="w-10 h-10 absolute -bottom-2 -right-2 bg-surface rounded-full p-1 border-2 border-surface text-accent" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-wide uppercase mt-4">
            {cat.title}
          </h2>
        </Link>
      ))}
    </div>
  );
}
