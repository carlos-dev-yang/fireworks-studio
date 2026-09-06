import { createStore } from 'zustand/vanilla';
import type { MessageKey, Params } from '../i18n';
export const noticeStore = createStore<{ message: MessageKey | null; params?: Params; kind: 'info' | 'error' }>(() => ({ message: null, kind: 'info' }));
let timer: ReturnType<typeof setTimeout> | undefined;
export function notify(message: MessageKey, kind: 'info' | 'error' = 'info', params?: Params) {
  clearTimeout(timer);
  noticeStore.setState({ message, kind, params });
  timer = setTimeout(() => noticeStore.setState({ message: null }), kind === 'error' ? 10000 : 4500);
}
