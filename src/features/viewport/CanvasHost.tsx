import { memo, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { Maximize2, Expand, Minimize2 } from 'lucide-react';
import { cameraActions, viewportStatus } from '../../app/services';
import { editorStore } from '../../state/editorStore';
import { documentStore } from '../../state/documentStore';
import { useRenderProbe } from '../../app/useRenderProbe';
import { useI18n } from '../../i18n';
import { Tip, Help } from '../shared/Help';
import { PreviewTransport } from '../timeline/Transport';
function ViewportControls() {
  const { t } = useI18n(); const page = useStore(editorStore, state => state.page), view = useStore(editorStore, state => state.previewMode);
  const theater = useStore(editorStore, state => state.theater);
  return <><div className="viewport-top"><div className="view-options">{page === 'show' ? <span className="view-label"><span className="live-dot" />{t('preview.show')}</span> : <><select aria-label={t('play.preview')} value={view} onChange={event => editorStore.setState({ previewMode: event.currentTarget.value as typeof view })}>{(['firework', 'layer', 'star'] as const).map(mode => <option key={mode} value={mode}>{t(`preview.${mode}`)}</option>)}</select><Help label={t('play.preview')} content="help.preview" /></>}</div><div className="viewport-actions">{page === 'show' && <Tip content="help.theater"><button className="button canvas-button" onClick={() => editorStore.setState({ theater: !theater })}>{theater ? <Minimize2 size={16} /> : <Expand size={16} />}{t(theater ? 'preview.exitTheater' : 'preview.theater')}</button></Tip>}<Tip content="help.camera"><button className="icon-button canvas-button" aria-label={t('preview.reset')} onClick={cameraActions.reset}><Maximize2 size={16} /></button></Tip></div></div>{theater && <TheaterTitle />}<div className="camera-hint">{t('preview.camera')}</div>{(page === 'designer' || theater) && <PreviewTransport />}</>;
}
function TheaterTitle() {
  const { t } = useI18n(); const name = useStore(documentStore, state => state.document.name);
  const launchers = useStore(documentStore, state => Object.keys(state.document.launchers).length), cues = useStore(documentStore, state => Object.keys(state.document.cues).length);
  return <div className="theater-title"><h2>{name}</h2><p>{t('preview.showStats', { launchers, cues })}</p></div>;
}
function CanvasStatus() { const { t } = useI18n(); const error = useStore(viewportStatus, state => state.error); return error ? <div role="alert" className="canvas-status">{t(error)}</div> : null; }
export const CanvasHost = memo(function CanvasHost() {
  useRenderProbe('CanvasHost'); const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false; let dispose: (() => void) | undefined;
    import('../../app/StudioSession').then(({ StudioSession }) => { if (cancelled || !host.current) return; const session = new StudioSession(host.current); dispose = () => session.dispose(); }).catch(error => { if (cancelled) return; viewportStatus.setState({ error: 'error.canvas' }); console.error(error); });
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <main className="canvas-area"><div className="canvas-host" ref={host} /><ViewportControls /><CanvasStatus /></main>;
});
