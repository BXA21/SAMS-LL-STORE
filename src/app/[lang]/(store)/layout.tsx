/*
 * Pass-through layout so the store's not-found.tsx and error.tsx sit below the
 * [lang] root layout. Next does not apply a not-found boundary that lives in
 * the root layout's own segment to notFound() raised by pages in production.
 */
export default function StoreSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
