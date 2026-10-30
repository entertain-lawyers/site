'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqAccordionProps {
  faqs: {
    id: string;
    question: string;
    answer: string;
  }[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleOpen = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        
        return (
          <div 
            key={faq.id} 
            className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-accent shadow-md shadow-accent/5' : 'border-border shadow-sm hover:border-accent/50'}`}
          >
            <button
              id={`faq-question-${faq.id}`}
              onClick={() => toggleOpen(faq.id)}
              className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none focus-visible:bg-accent/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${faq.id}`}
            >
              <h3 className="text-lg font-bold text-navy dark:text-white pr-8">
                {faq.question}
              </h3>
              <ChevronDown 
                className={`w-5 h-5 text-text-muted shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : ''}`} 
              />
            </button>
            
            {/* Animating grid rows (0fr → 1fr) sizes the panel to its content.
                The previous max-h-[1000px] cut long answers off mid-sentence.
                `inert` keeps links in a collapsed answer out of the tab order. */}
            <div
              id={`faq-answer-${faq.id}`}
              role="region"
              aria-labelledby={`faq-question-${faq.id}`}
              inert={!isOpen}
              className={`grid transition-all duration-300 ease-in-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="min-h-0 overflow-hidden">
              <div className="px-6 pb-6 pt-2 border-t border-black/5 dark:border-white/5">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed text-text-secondary"
                  dangerouslySetInnerHTML={{ __html: faq.answer }}
                />
              </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
