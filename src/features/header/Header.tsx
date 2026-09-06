import { useRef } from 'react';
import { Download, FolderOpen, Redo2, Undo2, Sparkles, Clapperboard } from 'lucide-react';
import { useStore } from 'zustand';
import { LIMITS } from '../../domain/catalog';
import { DocumentError, parseShow } from '../../domain/migration';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { notify } from '../../state/noticeStore';
import { NameField } from '../shared/Fields';
import { Tip } from '../shared/Help';
import { useRenderProbe } from '../../app/useRenderProbe';
import { setLocale, useI18n } from '../../i18n';
function ProjectName() { const name = useStore(documentStore, state => state.document.name); const { t } = useI18n(); return <NameField label={t('project.name')} value={name} onCommit={documentActions.rename} />; }
function HistoryControls() {
  const { t } = useI18n();
  const canUndo = useStore(documentStore, state => state.canUndo), canRedo = useStore(documentStore, state => state.canRedo);
  return <div className="history-controls"><Tip content="help.undo"><button className="icon-button" aria-label={t('action.undo')} disabled={!canUndo} onClick={documentActions.undo}><Undo2 size={17} /></button></Tip><Tip content="help.undo"><button className="icon-button" aria-label={t('action.redo')} disabled={!canRedo} onClick={documentActions.redo}><Redo2 size={17} /></button></Tip></div>;
}
function FileControls() {
  const { t } = useI18n(); const input = useRef<HTMLInputElement>(null);
  const save = () => {
    documentActions.end(); const document = documentStore.getState().document;
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const link = window.document.createElement('a'); link.href = url; link.download = `${document.name.replace(/[\\/:*?"<>|]/g, '-')}.fireworks.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('notice.exported');
  };
  return <div className="file-controls"><input ref={input} type="file" accept=".json,application/json" hidden aria-hidden="true" tabIndex={-1} onChange={async event => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return;
    if (file.size > LIMITS.importBytes) { notify('notice.largeFile', 'error'); return; }
    try { documentActions.replace(parseShow(await file.text())); editorActions.repair(); notify('notice.imported'); }
    catch (error) { notify(error instanceof DocumentError ? `notice.${error.code}` : 'notice.fileError', 'error'); }
  }} />
    <Tip content="help.file"><button className="icon-button" aria-label={t('action.import')} onClick={() => input.current?.click()}><FolderOpen size={17} /></button></Tip>
    <Tip content="help.file"><button className="button" aria-label={t('action.export')} onClick={save}><Download size={16} /><span>{t('action.export')}</span></button></Tip>
  </div>;
}
export function Header() {
  useRenderProbe('Header'); const { locale, t } = useI18n(); const page = useStore(editorStore, state => state.page);
  return <header className="app-header"><div className="brand"><Sparkles size={22} /><h1>{t('app.title')}</h1></div><nav className="page-tabs" aria-label={t('app.subtitle')}>
    <Tip content="help.designer"><button className={page === 'designer' ? 'active' : ''} aria-current={page === 'designer' ? 'page' : undefined} onClick={() => editorActions.setPage('designer')}><Sparkles size={15} />{t('nav.designer')}</button></Tip>
    <Tip content="help.show"><button className={page === 'show' ? 'active' : ''} aria-current={page === 'show' ? 'page' : undefined} onClick={() => editorActions.setPage('show')}><Clapperboard size={15} />{t('nav.show')}</button></Tip>
  </nav><div className="project-name"><ProjectName /></div><div className="header-actions"><HistoryControls /><FileControls /><select className="locale-select" aria-label={t('locale.label')} value={locale} onChange={event => setLocale(event.currentTarget.value as 'ko' | 'en')}><option value="ko">한국어</option><option value="en">English</option></select></div></header>;
}
