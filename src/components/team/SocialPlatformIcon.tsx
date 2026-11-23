import React from 'react';
import { Globe, GraduationCap, Newspaper, ExternalLink } from 'lucide-react';
import { PlatformKey, getPlatformConfig } from '@/lib/social-links';

export const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

export const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
);

export const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 12 5 12 5s6.255 0 7.812.418zM15.194 12 10 15V9l5.194 3z" clipRule="evenodd"/>
  </svg>
);

export const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.18-1.32A9.95 9.95 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.94 14.12c-.22.61-1.09 1.15-1.75 1.25-.45.07-1.04.13-3.03-.69-2.54-1.05-4.16-3.66-4.29-3.83-.12-.17-1.02-1.35-1.02-2.58 0-1.22.64-1.82.87-2.06.22-.25.5-.31.67-.31.17 0 .34 0 .49.01.16.01.37-.06.58.44.22.52.75 1.83.82 1.97.07.14.12.31.02.49-.09.18-.14.29-.28.45-.14.16-.3.35-.43.47-.14.14-.29.29-.12.58.16.29.73 1.2 1.57 1.94 1.08.96 1.99 1.26 2.28 1.4.29.14.45.12.62-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.26.1 1.66.78 1.94.92.29.14.48.22.55.34.07.13.07.74-.15 1.35z" clipRule="evenodd"/>
  </svg>
);

export const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
  </svg>
);

export const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10 4.195 0 7.81-2.585 9.278-6.273a.85.85 0 1 0-1.584-.623C18.423 18.23 15.428 20.3 12 20.3c-4.584 0-8.3-3.716-8.3-8.3S7.416 3.7 12 3.7c4.276 0 7.568 3.167 7.745 7.472.08 1.954-.486 3.864-1.748 4.896-.757.618-1.722.868-2.738.705-1.666-.266-2.656-1.517-2.656-3.344 0-2.22 1.439-3.712 3.39-3.712.973 0 1.767.35 2.235.986.06-.99-.188-2.03-.787-2.75-.82-.988-2.083-1.453-3.64-1.348-2.766.186-4.992 2.457-5.183 5.286-.217 3.208 2.062 6.002 5.228 6.408 1.34.172 2.655-.104 3.705-.779 1.7-1.092 2.64-3.125 2.528-5.467C20.472 6.02 16.58 2 12 2zm.603 12.923c-.767-.107-1.375-.584-1.564-1.222-.16-.54-.085-1.12.193-1.492.36-.48.972-.743 1.72-.743.084 0 .167.004.248.013v1.947c-.198.92-.397 1.465-.597 1.497z"/>
  </svg>
);

export const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.54c-.03 1.83-.54 3.65-1.55 5.17-1.35 2.04-3.56 3.4-5.97 3.75-1.84.27-3.75-.02-5.42-.87-2.07-1.05-3.66-2.9-4.43-5.07-.77-2.18-.65-4.63.35-6.72 1-2.08 2.82-3.68 5-4.47 1.22-.44 2.52-.61 3.82-.51v4.06c-.88-.13-1.78-.04-2.61.27-1.04.38-1.92 1.15-2.4 2.15-.49 1-.54 2.18-.16 3.22.38 1.04 1.16 1.9 2.17 2.37.99.46 2.14.51 3.17.15 1.03-.36 1.88-1.13 2.36-2.13.43-.88.54-1.88.53-2.86V.02h.67z"/>
  </svg>
);

export const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export function PlatformIcon({
  platform,
  className = 'w-6 h-6',
}: {
  platform: PlatformKey | string;
  className?: string;
}) {
  switch (platform) {
    case 'facebook':
      return <FacebookIcon className={className} />;
    case 'instagram':
      return <InstagramIcon className={className} />;
    case 'linkedin':
      return <LinkedinIcon className={className} />;
    case 'website':
      return <Globe className={className} />;
    case 'github':
      return <GithubIcon className={className} />;
    case 'twitter':
      return <XTwitterIcon className={className} />;
    case 'youtube':
      return <YoutubeIcon className={className} />;
    case 'whatsapp':
      return <WhatsappIcon className={className} />;
    case 'telegram':
      return <TelegramIcon className={className} />;
    case 'threads':
      return <ThreadsIcon className={className} />;
    case 'tiktok':
      return <TiktokIcon className={className} />;
    case 'discord':
      return <DiscordIcon className={className} />;
    case 'scholar':
      return <GraduationCap className={className} />;
    case 'medium':
      return <Newspaper className={className} />;
    case 'custom':
    default:
      return <ExternalLink className={className} />;
  }
}

/**
 * Animated Direct Connect link button with tooltip and hover effects.
 */
export function DirectConnectButton({
  platform,
  url,
  label,
  className = 'w-4 h-4',
}: {
  platform: PlatformKey | string;
  url: string;
  label?: string;
  className?: string;
}) {
  const config = getPlatformConfig(platform);
  const displayLabel = label || config.label;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs ${config.hoverBgClass} transition-all duration-200 ease-out hover:scale-115 hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      aria-label={displayLabel}
      title={displayLabel}
    >
      <PlatformIcon platform={platform} className={`${className} transition-transform duration-200`} />
      {/* Floating tooltip matching design */}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-md transition-all duration-150 group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-100 z-20">
        {displayLabel}
      </span>
    </a>
  );
}
