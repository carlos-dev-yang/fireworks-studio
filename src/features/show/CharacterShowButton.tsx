import { Clapperboard } from 'lucide-react';
import { CHARACTER_SHOW, createCharacterShow } from '../../domain/characterShow';
import { useI18n } from '../../i18n';
import { Tip } from '../shared/Help';
import { loadShowTemplate } from './loadShowTemplate';

export function CharacterShowButton() {
  const { t } = useI18n();
  const load = () => loadShowTemplate(createCharacterShow({
    show: t('characterShow.title'), launcher: t('characterShow.launcher'),
    firework: (character, dimension) => t('character.presetName', { name: t(`character.${character}`), dimension: t(`character.${dimension}`) }),
    layer: part => t(part === 'halo' ? 'character.halo' : `character.part.${part}`),
  }));
  return <Tip content="help.characterShow"><button className="festival-card character-show-card" onClick={load}>
    <Clapperboard size={19} /><span><strong>{t('characterShow.load')}</strong><small>{t('characterShow.summary', { count: CHARACTER_SHOW.cueCount })}</small></span>
  </button></Tip>;
}
