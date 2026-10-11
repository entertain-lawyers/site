import Link from 'next/link';
import { Dictionary } from '@/lib/i18n';
import { Phone, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  dict: Dictionary;
}

export default function Footer({ dict }: FooterProps) {
  return (
    <footer className="bg-surface dark:bg-transparent dark:bg-gradient-to-b dark:from-[#0c1b30] dark:to-[#060d1a] mt-auto relative border-t border-border dark:border-border/10 overflow-hidden transition-colors duration-300">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-accent/20 dark:via-white/20 to-transparent" />
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-accent/10 dark:bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 sm:pt-10 sm:pb-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 mb-8">

          {/* 1. About */}
          <div className="lg:col-span-1 flex flex-col">
            <h3 className="text-base font-black mb-5 tracking-widest text-navy dark:text-[#ddba76] uppercase">Entertain Lawyers</h3>
            <p className="text-text-secondary dark:text-white/90 leading-relaxed text-[14px] sm:text-[15px] mb-5 font-medium">
              {dict.brandDesc || "Nepal's premium legal educational platform. We provide comprehensive study materials for BA.LLB and LLB students."}
            </p>
          </div>

          {/* 2. Contact Details */}
          <div className="lg:col-span-1">
            <h3 className="text-base font-black mb-5 tracking-widest text-navy dark:text-[#ddba76] uppercase">Contact Info</h3>
            <ul className="space-y-3 text-[14px] sm:text-[15px] text-text-secondary dark:text-white font-medium">
              <li className="flex items-start gap-3 group cursor-default">
                <MapPin className="w-5 h-5 text-navy dark:text-[#ddba76] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="leading-snug">Pokhara Metropolitan City-1, Kaski</span>
              </li>
              <li className="flex items-center gap-3 group">
                <Phone className="w-5 h-5 text-navy dark:text-[#ddba76] shrink-0 group-hover:scale-110 transition-transform" />
                <a href="tel:9822010737" className="text-text-secondary dark:text-white underline underline-offset-4 hover:text-accent dark:hover:text-gray-300 transition-colors duration-300 font-medium">+977 9822010737</a>
              </li>
              <li className="flex items-center gap-3 group">
                <Mail className="w-5 h-5 text-navy dark:text-[#ddba76] shrink-0 group-hover:scale-110 transition-transform" />
                <a href="mailto:contact@entertainlawyers.com" className="text-text-secondary dark:text-white underline underline-offset-4 hover:text-accent dark:hover:text-gray-300 transition-colors duration-300 break-words font-medium">
                  contact@entertainlawyers.com
                </a>
              </li>
            </ul>
          </div>

          {/* 3. Connect With Us Online */}
          <div className="hidden md:block lg:col-span-1">
            <h3 className="text-base font-black mb-5 tracking-widest text-navy dark:text-[#ddba76] uppercase">Connect With Us</h3>
            <ul className="space-y-3 text-[14px] sm:text-[15px] text-text-secondary dark:text-white font-medium">
              <li>
                <a href="https://www.facebook.com/entertainlawyers" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-navy dark:text-white hover:text-[#1877F2] dark:hover:text-[#1877F2] hover:translate-x-1 transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35C24 .593 23.407 0 22.675 0z" /></svg>
                  Facebook
                </a>
              </li>

              <li>
                <a href="https://www.instagram.com/entertainlawyers" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-navy dark:text-white hover:text-pink-500 dark:hover:text-pink-400 hover:translate-x-1 transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://youtube.com/entertainlawyers" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-navy dark:text-white hover:text-red-600 dark:hover:text-red-500 hover:translate-x-1 transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  YouTube
                </a>
              </li>
              <li>
                <a href="https://www.tiktok.com/@entertain.lawyers" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-navy dark:text-white hover:text-black dark:hover:text-gray-300 hover:translate-x-1 transition-all duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68a6.34 6.34 0 006.27 6.32 6.32 6.32 0 006.2-6.3V10.22a8.44 8.44 0 004.09 1V7.71a4.93 4.93 0 01-1.97-.4 5.06 5.06 0 01-2-1.22z" />
                  </svg>
                  TikTok
                </a>
              </li>
            </ul>
          </div>

          {/* 4. Dive Into It */}
          <div className="hidden md:block lg:col-span-1">
            <h3 className="text-base font-black mb-5 tracking-widest text-navy dark:text-[#ddba76] uppercase">Dive Into It</h3>
            <ul className="space-y-3 text-[14px] sm:text-[15px] text-text-secondary dark:text-white font-medium">
              <li><Link href="/about" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 hover:translate-x-1 inline-block transition-transform duration-300">About us</Link></li>
              <li><Link href="/team" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 hover:translate-x-1 inline-block transition-transform duration-300">Team</Link></li>
              <li><Link href="/calculator" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 hover:translate-x-1 inline-block transition-transform duration-300">Court Fee Calculator</Link></li>
              <li><Link href="/consultation" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 hover:translate-x-1 inline-block transition-transform duration-300">Consult a Lawyer</Link></li>
              <li><Link href="/events" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 hover:translate-x-1 inline-block transition-transform duration-300">Events</Link></li>
              <li><Link href="/faqs" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 hover:translate-x-1 inline-block transition-transform duration-300">FAQs</Link></li>
            </ul>
          </div>

        </div>

        {/* Copyright & Legal */}
        <div className="border-t border-border dark:border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[13px] font-medium text-text-secondary dark:text-white tracking-wide">
            © {new Date().getFullYear()} Entertain Lawyers Pvt. Ltd. {dict.allRightsReserved || 'All rights reserved.'}
          </p>
          <div className="flex gap-8 text-[13px] font-medium tracking-wide">
            <Link href="/terms" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 transition-colors duration-300 min-h-[44px] inline-flex items-center">Terms of Service</Link>
            <Link href="/privacy-policy" className="text-text-secondary dark:text-white hover:text-accent dark:hover:text-gray-300 transition-colors duration-300 min-h-[44px] inline-flex items-center">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
