'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function HomeSearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/study?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative group w-full">
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search what you're looking for quickly and easily..." 
        className="w-full pl-6 pr-14 py-4 rounded-full border-2 border-border bg-surface text-text-primary focus:outline-none focus:border-accent shadow-sm transition-all text-base sm:text-lg"
      />
      <button 
        type="submit"
        className="absolute right-2 top-2 bottom-2 aspect-square bg-navy dark:bg-accent text-white rounded-full flex items-center justify-center hover:bg-navy-light dark:hover:bg-accent-hover transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </form>
  );
}
