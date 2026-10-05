import { HomeCategoryCard } from '@/components/home/HomeCategoryCard';
import { Scale, Landmark } from 'lucide-react';

function PrisonerIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Person */}
      <circle cx="12" cy="10" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      
      {/* Jail bars & Frame */}
      <line x1="6" y1="3" x2="6" y2="21" />
      <line x1="10" y1="3" x2="10" y2="21" />
      <line x1="14" y1="3" x2="14" y2="21" />
      <line x1="18" y1="3" x2="18" y2="21" />
      <line x1="4" y1="3" x2="20" y2="3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

export default function CaseLawLanding() {
  const categories = [
    {
      id: 'civil',
      title: 'CIVIL CASES',
      subtitle: '',
      href: '/study?type=CASE_LAW&q=civil',
      icon: Scale,
    },
    {
      id: 'criminal',
      title: 'CRIMINAL CASES',
      subtitle: '',
      href: '/study?type=CASE_LAW&q=criminal',
      icon: PrisonerIcon,
    },
    {
      id: 'writs',
      title: 'WRITS',
      subtitle: '',
      href: '/study?type=CASE_LAW&q=writ',
      icon: Landmark,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {categories.map((cat) => (
        <HomeCategoryCard 
          key={cat.id}
          title={cat.title}
          subtitle={cat.subtitle}
          href={cat.href}
          icon={cat.icon}
        />
      ))}
    </div>
  );
}
