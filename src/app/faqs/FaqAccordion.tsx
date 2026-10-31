'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapse, Reveal } from '@/components/motion/primitives';

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
      {faqs.map((faq, index) => {
        const isOpen = openId === faq.id;
        
        return (
          <Reveal
            key={faq.id}
            index={index}
            perRow={1}
            className={`bg-surface border rounded-2xl overflow-hidden transition-[border-color,box-shadow] duration-300 ${isOpen ? 'border-accent shadow-md shadow-accent/5' : 'border-border shadow-sm hover:border-accent/50'}`}
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
            
            {/* Height animates to the answer's real size, so long answers are
                never clipped. Collapse keeps the panel mounted (for SEO) and
                `inert` while closed so its links stay out of the tab order. */}
            <Collapse
              open={isOpen}
              id={`faq-answer-${faq.id}`}
              role="region"
              aria-labelledby={`faq-question-${faq.id}`}
            >
              <div className="px-6 pb-6 pt-2 border-t border-black/5 dark:border-white/5">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed text-text-secondary"
                  dangerouslySetInnerHTML={{ __html: faq.answer }}
                />
              </div>
            </Collapse>
          </Reveal>
        );
      })}
    </div>
  );
}
