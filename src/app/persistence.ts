import { documentStore, STORAGE_KEY } from '../state/documentStore';
import { notify } from '../state/noticeStore';

const SAVE_DELAY_MS = 500;
export function startPersistence() {
  const store = documentStore;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    timer = undefined;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().document)); }
    catch { notify('notice.saveError', 'error'); }
  };
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.document === previous.document) return;
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  });
  const flush = () => { if (timer) { clearTimeout(timer); save(); } };
  window.addEventListener('pagehide', flush);
  return () => { flush(); unsubscribe(); window.removeEventListener('pagehide', flush); };
}
