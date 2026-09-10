import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useStore } from 'zustand';
import * as Tooltip from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { Header } from '../features/header/Header';
import { Library } from '../features/library/Library';
import { Inspector } from '../features/inspector/Inspector';
import { CanvasHost } from '../features/viewport/CanvasHost';
import { Timeline } from '../features/timeline/Timeline';
import { documentActions, documentStore, recoveryMessage } from '../state/documentStore';
import { editorActions, editorStore } from '../state/editorStore';
import { copyItem, pasteItem } from '../state/clipboardActions';
import { noticeStore, notify } from '../state/noticeStore';
import { useI18n } from '../i18n';
import { startPersistence } from './persistence';
import type { StoredProject } from '../storage/library';
import { Diagnostics } from './Diagnostics';
import { useRenderProbe } from './useRenderProbe';
function FatalError() { const { t } = useI18n(); return <main className="fatal-error"><h1>{t('error.screen')}</h1><p>{t('error.reload')}</p></main>; }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() { return this.state.failed ? <FatalError /> : this.props.children; }
}
function Notice() {
  const { t } = useI18n(); const message = useStore(noticeStore, state => state.message), params = useStore(noticeStore, state => state.params), kind = useStore(noticeStore, state => state.kind);
  return message ? <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}><span>{t(message, params)}</span><button className="icon-button" aria-label={t('action.close')} onClick={() => noticeStore.setState({ message: null })}><X size={16} /></button></div> : null;
}
function MobilePanels() {
  const { t } = useI18n(); const selected = useStore(editorStore, state => state.mobilePanel);
  return <nav className="mobile-panels" aria-label={t('nav.settings')}><button className={selected === 'library' ? 'active' : ''} onClick={() => editorStore.setState({ mobilePanel: 'library' })}>{t('nav.library')}</button><button className={selected === 'inspector' ? 'active' : ''} onClick={() => editorStore.setState({ mobilePanel: 'inspector' })}>{t('nav.settings')}</button></nav>;
}
export function App({ project, initialPersistenceError }: { project: StoredProject; initialPersistenceError?: Error }) {
  const [activeProject, setActiveProject] = useState(project);
  useRenderProbe('App'); const page = useStore(editorStore, state => state.page), theater = useStore(editorStore, state => state.theater);
  useEffect(() => {
    const stop = startPersistence(project, undefined, initialPersistenceError), repair = documentStore.subscribe(() => editorActions.repair());
    if (recoveryMessage) notify(recoveryMessage, 'info');
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape' && !event.defaultPrevented) editorStore.setState({ theater: false });
      if (event.defaultPrevented || target.closest('input,select,textarea,[contenteditable],[role="dialog"]') || (!event.metaKey && !event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { event.preventDefault(); if (event.shiftKey) documentActions.redo(); else documentActions.undo(); }
      if (key === 'c') { event.preventDefault(); copyItem(); }
      if (key === 'v') { event.preventDefault(); pasteItem(); }
    };
    window.addEventListener('keydown', shortcut);
    return () => { stop(); repair(); window.removeEventListener('keydown', shortcut); };
  }, [project, initialPersistenceError]);
  return <ErrorBoundary><Tooltip.Provider delayDuration={350} skipDelayDuration={100}><div className={`studio ${page}-page ${theater ? 'theater-mode' : ''}`}><Header projectId={activeProject.id} onProjectChange={setActiveProject} /><Library /><CanvasHost /><MobilePanels /><Inspector />{page === 'show' && !theater && <Timeline />}</div><Notice />{import.meta.env.DEV && new URLSearchParams(location.search).has('diagnostics') && <Diagnostics />}</Tooltip.Provider></ErrorBoundary>;
}
