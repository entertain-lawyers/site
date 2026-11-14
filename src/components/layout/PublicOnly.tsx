"use client";

import { usePathname } from "next/navigation";

export default function PublicOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /read is an app-like fullscreen reader: its own breadcrumb, outline
  // sidebar and paging controls replace the site chrome entirely.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/read")) {
    return null;
  }

  return <>{children}</>;
}
