import { memo } from 'react';
import type { DesignOwner, LayerDefinition } from '../../domain/schema';
import { MATERIALS, LIMITS } from '../../domain/catalog';
import type { MaterialId } from '../../domain/catalog';
import { compileStar } from '../../domain/compile';
import { STAR_PRESETS, copyStarPreset } from '../../domain/presets';
import type { StarPresetId } from '../../domain/presets';
import { documentActions } from '../../state/documentStore';
import { useI18n } from '../../i18n';
import { useRenderProbe } from '../../app/useRenderProbe';
import { RangeField, SelectField } from '../shared/Fields';
export const StarEditor = memo(function StarEditor({ owner, layer }: { owner: DesignOwner; layer: LayerDefinition }) {
  useRenderProbe('StarEditor'); const { t, number } = useI18n(); const star = layer.star;
  const change = (patch: Partial<typeof star>) => documentActions.updateLayer(owner, layer.id, current => ({ ...current, star: { ...current.star, ...patch } }));
  const material = (patch: Partial<typeof star.material>) => change({ material: { ...star.material, ...patch } });
  const profile = compileStar(star);
  return <div className="star-editor"><SelectField label={t('field.starPreset')} help="help.starPreset" value="" onChange={value => change(copyStarPreset(value as StarPresetId))}><option value="" disabled>{t('action.apply')}…</option>{(Object.keys(STAR_PRESETS) as StarPresetId[]).map(id => <option key={id} value={id}>{t(`preset.${id}`)}</option>)}</SelectField>
    <div className="star-swatch" style={{ '--star-color': MATERIALS[star.material.base].color } as React.CSSProperties}><span /><small>{t(`material.${star.material.base}`)}</small></div>
    <SelectField label={t('field.base')} help="help.base" value={star.material.base} onChange={value => material({ base: value as MaterialId })}>{(Object.keys(MATERIALS) as MaterialId[]).map(id => <option key={id} value={id}>{t(`material.${id}`)}</option>)}</SelectField>
    <SelectField label={t('field.finish')} help="help.finish" value={star.material.finish ?? ''} onChange={value => material({ finish: value ? value as MaterialId : null })}><option value="">{t('material.none')}</option>{(Object.keys(MATERIALS) as MaterialId[]).map(id => <option key={id} value={id}>{t(`material.${id}`)}</option>)}</SelectField>
    {star.material.finish && <RangeField label={t('field.transition')} help="help.transition" value={star.material.transition} {...LIMITS.transition} display={`${number(star.material.transition * 100, 0)}%`} onChange={transition => material({ transition })} />}
    <RangeField label={t('field.size')} help="help.size" value={star.body.scale} {...LIMITS.size} display={`${number(star.body.scale, 2)}×`} onChange={scale => change({ body: { ...star.body, scale } })} />
    <RangeField label={t('field.trail')} help="help.trail" value={star.material.trail} {...LIMITS.trail} display={`${number(star.material.trail, 2)}×`} onChange={trail => material({ trail })} />
    <RangeField label={t('field.lifetime')} help="help.lifetime" value={star.lifetimeScale} {...LIMITS.lifetime} display={`${number(star.lifetimeScale, 2)}×`} onChange={lifetimeScale => change({ lifetimeScale })} />
    <RangeField label={t('field.brightness')} help="help.brightness" value={star.brightness} {...LIMITS.brightness} display={`${number(star.brightness, 2)}×`} onChange={brightness => change({ brightness })} />
    <dl className="derived-values"><div><dt>{t('field.estimatedLife')}</dt><dd>{number(profile.lifetime, 2)} <span>{t('unit.seconds')}</span></dd></div></dl>
  </div>;
});
