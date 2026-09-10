import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { FireworkDefinition } from '../../domain/schema';
import { MAX_PORTABLE_ARCHIVE_BYTES, archiveError, archiveFilename, downloadJson, exportCurrentFirework, importFireworkJson } from '../../app/archiveService';
import { notify } from '../../state/noticeStore';
import { useI18n } from '../../i18n';
import './fireworkJsonControls.css';

export interface FireworkJsonControlsProps { activeFirework?: FireworkDefinition; disabled?: boolean; onImported?: () => void }
/** Portable JSON only creates a personal preset; it never changes the current show. */
export function FireworkJsonControls({ activeFirework, disabled = false, onImported }: FireworkJsonControlsProps) {
  const { t } = useI18n(); const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const blocked = disabled || busy;
  const run = (task: () => Promise<void>) => { if (busy) return; setBusy(true); void task().catch(error => { const message = archiveError(error); notify(message.key, 'error', message.params); }).finally(() => setBusy(false)); };
  const importFile = (file: File) => run(async () => { await importFireworkJson(file); window.dispatchEvent(new Event('fireworks-library-imported')); onImported?.(); notify('notice.fireworkImported'); });
  const exportFirework = () => run(async () => { if (!activeFirework) return; downloadJson(await exportCurrentFirework(activeFirework), archiveFilename(activeFirework.name, 'firework'), MAX_PORTABLE_ARCHIVE_BYTES); notify('notice.exported'); });
  return <div className="firework-json-controls"><input ref={input} type="file" accept=".json,application/json" hidden onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) importFile(file); }} /><button className="button" onClick={() => input.current?.click()} disabled={blocked}><Upload size={14} />{t('library.importFirework')}</button><button className="button" onClick={exportFirework} disabled={blocked || !activeFirework}><Download size={14} />{t('library.exportFirework')}</button></div>;
}
