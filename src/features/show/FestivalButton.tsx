import { WandSparkles } from 'lucide-react';
import { createFestivalShow, FESTIVAL } from '../../domain/festival';
import { useI18n } from '../../i18n';
import { Tip } from '../shared/Help';
import { loadShowTemplate } from './loadShowTemplate';

export function FestivalButton() {
  const { t } = useI18n();
  const load = () => {
    loadShowTemplate(createFestivalShow({ show: t('festival.title'), design: id => t(`festival.${id}`), pattern: id => t(`preset.${id}`), launcher: index => t('launcher.default', { index }) }));
  };
  return <Tip content="help.festival"><button className="festival-card" onClick={load}><WandSparkles size={19} /><span><strong>{t('festival.load')}</strong><small>{t('festival.summary', { launchers: FESTIVAL.launcherCount, seconds: FESTIVAL.durationSeconds })}</small></span></button></Tip>;
}
