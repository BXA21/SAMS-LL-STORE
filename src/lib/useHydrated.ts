import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server render and hydration, true once running in the browser.
 * Used to delay browser-only UI (like the persisted cart count) without a
 * setState-in-effect round trip.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
