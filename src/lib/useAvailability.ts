'use client';

import { useEffect, useState } from 'react';
import { dbService } from '@/services/dbService';
import type { ProductAvailability } from '@/types/database';

/**
 * Public stock signal per product slug (no exact counts). Empty until loaded or
 * when the database is unreachable; callers treat a missing entry as available,
 * because checkout re-checks stock on the server before any payment.
 */
export function useProductAvailability(): Record<string, ProductAvailability> {
  const [availability, setAvailability] = useState<Record<string, ProductAvailability>>({});
  useEffect(() => {
    let cancelled = false;
    dbService
      .getProductAvailability()
      .then((map) => {
        if (!cancelled) setAvailability(map);
      })
      .catch(() => {
        // Unknown stock never blocks browsing; the server is the final check.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return availability;
}
