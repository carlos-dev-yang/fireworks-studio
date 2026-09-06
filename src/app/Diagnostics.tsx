import { useState } from 'react';
import { useI18n } from '../i18n';
import { readRenderProbes } from './useRenderProbe';

export function Diagnostics() {
  const { t } = useI18n();
  const [rows, setRows] = useState(readRenderProbes);
  return <details className="diagnostics" open><summary>{t('diagnostics.title')}</summary><p>{t('diagnostics.note')}</p><button className="button" onClick={() => setRows(readRenderProbes())}>{t('diagnostics.read')}</button><dl>{rows.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count}</dd></div>)}</dl></details>;
}
