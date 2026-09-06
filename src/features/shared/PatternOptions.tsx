import { PATTERNS } from '../../domain/catalog';
import type { PatternId } from '../../domain/catalog';
import { CHARACTER_IDS, CHARACTER_PATTERNS, isCharacterPattern } from '../../domain/characterCatalog';
import type { CharacterPatternId } from '../../domain/characterCatalog';
import { useI18n } from '../../i18n';

const standard = (Object.keys(PATTERNS) as PatternId[]).filter(pattern => !isCharacterPattern(pattern));
const characters = CHARACTER_IDS.map(character => ({ character, patterns: (Object.keys(CHARACTER_PATTERNS) as CharacterPatternId[]).filter(pattern => {
  const spec = CHARACTER_PATTERNS[pattern];
  return spec.character === character && (spec.part !== 'shell' || spec.dimension === '3d');
}) }));

export function PatternOptions() {
  const { t } = useI18n();
  return <>{standard.map(pattern => <option key={pattern} value={pattern}>{t(`preset.${pattern}`)}</option>)}
    {characters.map(({ character, patterns }) => <optgroup key={character} label={t(`character.${character}`)}>{patterns.map(pattern => <option key={pattern} value={pattern}>{t(`preset.${pattern}`)}</option>)}</optgroup>)}
  </>;
}
