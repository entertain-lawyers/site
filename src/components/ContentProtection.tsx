'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ContentProtection() {
  const pathname = usePathname();

  useEffect(() => {
    // Completely bypass protection in admin routes
    if (pathname?.startsWith('/admin')) {
      document.body.classList.remove('protected-mode');
      return;
    }

    // Enable CSS protection
    document.body.classList.add('protected-mode');

    // Helper to determine if an element should be exempt from protection
    const isExempt = (target: EventTarget | null) => {
      if (!target) return false;
      
      const element = target as HTMLElement;
      const tag = element.tagName?.toLowerCase();
      
      // Allow interactions with form elements
      if (tag && ['input', 'textarea', 'select', 'button'].includes(tag)) {
        return true;
      }
      
      // Allow interactions with contenteditable elements
      if (element.isContentEditable) {
        return true;
      }

      // Check if element is inside an exempt container
      if (element.closest && (
          element.closest('input') || 
          element.closest('textarea') || 
          element.closest('select') || 
          element.closest('button') ||
          element.closest('[contenteditable="true"]')
      )) {
        return true;
      }
      
      return false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isExempt(e.target)) {
        e.preventDefault();
      }
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      if (!isExempt(e.target)) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (!isExempt(e.target)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block specific shortcuts if Ctrl or Meta (Cmd) is pressed
      if (e.ctrlKey || e.metaKey) {
        if (isExempt(e.target)) return;

        const key = e.key.toLowerCase();
        // c: copy, x: cut, s: save, p: print, u: view source
        if (['c', 'x', 's', 'p', 'u'].includes(key)) {
          e.preventDefault();
        }
      }
    };

    // Attach global listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.body.classList.remove('protected-mode');
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pathname]);

  return null;
}
