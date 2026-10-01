'use client';

import { AlertTriangle } from 'lucide-react';
import { useMessages } from '@/i18n/I18nProvider';
import { siteMessages } from '@/i18n/messages/site';

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useMessages(siteMessages).error;
  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-light-grey pt-28 pb-20 px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="mx-auto bg-fire/10 text-fire p-4 rounded-full w-fit">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-navy">{t.title}</h1>
        <p className="text-gray-500">{t.body}</p>
        <button onClick={reset} className="bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-md transition-colors">
          {t.retry}
        </button>
      </div>
    </section>
  );
}
