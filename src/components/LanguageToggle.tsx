'use client';

import Link from 'next/link';
import { Languages } from 'lucide-react';
import { localePath } from '@/i18n/config';
import { useInternalPath, useLocale, useMessages } from '@/i18n/I18nProvider';
import { siteMessages } from '@/i18n/messages/site';

/** Links to the same page in the other language; query strings (e.g. ?category=) are not carried. */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const path = useInternalPath();
  const t = useMessages(siteMessages).language;
  const target = locale === 'ar' ? 'en' : 'ar';
  return (
    <Link
      href={localePath(target, path)}
      hrefLang={target}
      lang={target}
      aria-label={t.switchLabel}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${className}`}
    >
      <Languages className="w-4 h-4" aria-hidden="true" />
      <span>{t.switchTo}</span>
    </Link>
  );
}
