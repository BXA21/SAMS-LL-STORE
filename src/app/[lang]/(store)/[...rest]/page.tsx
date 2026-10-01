import { notFound } from 'next/navigation';

// Unknown paths under a locale render that locale's branded 404 inside the store layout.
export default function UnknownPage() {
  notFound();
}
