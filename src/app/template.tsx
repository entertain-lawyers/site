import PageTransition from '@/components/motion/PageTransition';

// Remounts on every top-level navigation, so each new page fades in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
