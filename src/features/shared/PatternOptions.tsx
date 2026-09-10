import { PATTERNS } from '../../domain/catalog';
import type { PatternId } from '../../domain/catalog';
import { useI18n } from '../../i18n';

const standard = (Object.keys(PATTERNS) as PatternId[]).filter(pattern => pattern !== 'artwork');

export function PatternOptions({ includeArtwork = false }: { includeArtwork?: boolean }) {
  const { t } = useI18n();
  return <>{includeArtwork && <option value="artwork">{t('preset.artwork')}</option>}{standard.map(pattern => <option key={pattern} value={pattern}>{t(`preset.${pattern}`)}</option>)}</>;
}
