'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Locale } from '@/lib/i18n';

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'lax',
  });
  
  // Revalidate the entire site so the new language takes effect everywhere
  revalidatePath('/', 'layout');
}
