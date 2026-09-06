import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { en, ko } from './messages';
import type { MessageKey } from './messages';
export type { MessageKey } from './messages';
export type Locale = 'ko' | 'en';
export type Params = Record<string, string | number>;
const LOCALE_KEY = 'fireworks-studio:locale';
function initialLocale(): Locale {
  try { const saved = localStorage.getItem(LOCALE_KEY); if (saved === 'ko' || saved === 'en') return saved; } catch { /* Optional preference. */ }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
export const localeStore = createStore<{ locale: Locale }>(() => ({ locale: initialLocale() }));
export function translate(locale: Locale, key: MessageKey, params: Params = {}): string {
  return (locale === 'ko' ? ko[key] : en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
export function t(key: MessageKey, params?: Params) { return translate(localeStore.getState().locale, key, params); }
export function setLocale(locale: Locale) {
  localeStore.setState({ locale });
  document.documentElement.lang = locale;
  document.title = `${t('app.title')} · ${t('app.subtitle')}`;
  try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* Language still changes in this session. */ }
}
export function useI18n() {
  const locale = useStore(localeStore, state => state.locale);
  return { locale, t: (key: MessageKey, params?: Params) => translate(locale, key, params), number: (value: number, digits = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value) };
}
setLocale(localeStore.getState().locale);
