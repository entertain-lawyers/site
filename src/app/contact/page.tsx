import { getDictionary } from '@/lib/i18n';
import { MapPin, Phone, Mail } from 'lucide-react';

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.contactTitle}`,
    description: 'Get in touch with Entertain Lawyers.',
    alternates: { canonical: '/contact' },
  };
}

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.675 0h-21.35C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35C24 .593 23.407 0 22.675 0z" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.05c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.52 8.52 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38 3.85 3.92 2.31 7.15 2.16c1.27-.06 1.65-.07 4.85-.07m0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.63 6.78 6.98 6.98 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c4.35-.2 6.78-2.63 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.4-11.44a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
  </svg>
);

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    {/* Cyan Offset */}
    <path fill="#25F4EE" transform="translate(-0.5, -0.5)" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68a6.34 6.34 0 006.27 6.32 6.32 6.32 0 006.2-6.3V10.22a8.44 8.44 0 004.09 1V7.71a4.93 4.93 0 01-1.97-.4 5.06 5.06 0 01-2-1.22z" />
    {/* Red Offset */}
    <path fill="#FE2C55" transform="translate(0.5, 0.5)" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68a6.34 6.34 0 006.27 6.32 6.32 6.32 0 006.2-6.3V10.22a8.44 8.44 0 004.09 1V7.71a4.93 4.93 0 01-1.97-.4 5.06 5.06 0 01-2-1.22z" />
    {/* Black/White Base */}
    <path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 15.68a6.34 6.34 0 006.27 6.32 6.32 6.32 0 006.2-6.3V10.22a8.44 8.44 0 004.09 1V7.71a4.93 4.93 0 01-1.97-.4 5.06 5.06 0 01-2-1.22z" />
  </svg>
);

export default async function ContactPage() {
  const dict = await getDictionary();

  const socialLinks = [
    { name: "Facebook", url: "https://www.facebook.com/entertainlawyers", icon: FacebookIcon, label: "Like us on Facebook", iconColor: "text-[#1877F2]", hoverBg: "group-hover:bg-[#1877F2]" },
    { name: "Twitter", url: "https://twitter.com/entertainlawyers", icon: TwitterIcon, label: "Follow us on Twitter", iconColor: "text-[#1DA1F2]", hoverBg: "group-hover:bg-[#1DA1F2]" },
    { name: "YouTube", url: "https://youtube.com/entertainlawyers", icon: YoutubeIcon, label: "Subscribe YouTube Channel", iconColor: "text-[#FF0000]", hoverBg: "group-hover:bg-[#FF0000]" },
    { name: "Instagram", url: "https://www.instagram.com/entertainlawyers", icon: InstagramIcon, label: "Follow us on Instagram", iconColor: "text-[#E1306C]", hoverBg: "group-hover:bg-[#E1306C]" },
    { name: "TikTok", url: "https://www.tiktok.com/@entertain.lawyers", icon: TiktokIcon, label: "Follow us on Tiktok", iconColor: "text-black dark:text-white group-hover:text-white", hoverBg: "group-hover:bg-black dark:group-hover:bg-white dark:group-hover:text-black" }
  ];

  return (
    <main className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
          {dict.contactTitle}
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          {dict.getInTouch} We are here to help you with any questions regarding our premium law notes and subscriptions.
        </p>
      </div>

      {/* Direct Contact Grid (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        
        {/* Phone */}
        <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm flex flex-col items-center text-center group hover:border-accent hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] transition-all duration-300">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
            <Phone className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-navy dark:text-white text-xl mb-3">{dict.phoneLabel}</h3>
          <a href="tel:9822010737" className="text-text-secondary hover:text-accent font-medium text-lg transition-colors">
            +977 9822010737
          </a>
        </div>

        {/* Email */}
        <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm flex flex-col items-center text-center group hover:border-accent hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] transition-all duration-300">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
            <Mail className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-navy dark:text-white text-xl mb-3">{dict.emailLabel}</h3>
          <a href="mailto:contact@entertainlawyers.com" className="text-text-secondary hover:text-accent font-medium text-lg transition-colors break-words">
            contact@entertainlawyers.com
          </a>
        </div>

        {/* Location */}
        <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm flex flex-col items-center text-center group hover:border-accent hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] transition-all duration-300">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-navy dark:text-white text-xl mb-3">{dict.addressLabel}</h3>
          <p className="text-text-secondary font-medium text-lg">
            Pokhara Metropolitan City-1, Kaski
          </p>
        </div>

      </div>

      {/* Social Media Section */}
      <div className="border-t border-border pt-16 text-center">
        <h2 className="text-2xl md:text-3xl font-black text-navy dark:text-white mb-10">
          Connect With Us Online
        </h2>
        
        <div className="flex flex-wrap justify-center gap-6">
          {socialLinks.map((social) => (
            <a 
              key={social.name}
              href={social.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center justify-center min-w-[200px] flex-1 max-w-[260px] group hover:border-accent hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(var(--color-accent),0.12)] transition-all duration-300"
            >
              <div className={`w-14 h-14 bg-surface-alt rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 ${social.hoverBg}`}>
                <social.icon className={`w-7 h-7 ${social.iconColor} group-hover:text-white transition-colors duration-300`} />
              </div>
              <span className="text-navy dark:text-white font-bold text-sm sm:text-base text-center px-2">
                {social.label}
              </span>
            </a>
          ))}
        </div>
      </div>

    </main>
  );
}
