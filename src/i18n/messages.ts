import type { Locale } from './config';

/**
 * One message set per feature. `ar` must provide every key `en` has, so a
 * missing translation is a type error rather than a blank on the live site.
 */
export type Messages<T> = Record<Locale, T>;

export function defineMessages<T>(messages: { en: T; ar: NoInfer<T> }): Messages<T> {
  return messages;
}
