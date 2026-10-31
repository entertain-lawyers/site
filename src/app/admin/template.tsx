import PageTransition from '@/components/motion/PageTransition';

// The root template does not remount between admin sections (they share the
// /admin segment), so the admin area gets its own.
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition className="w-full min-w-0">{children}</PageTransition>;
}
