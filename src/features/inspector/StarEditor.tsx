import { memo, useState } from 'react';
import type { DesignOwner, LayerDefinition } from '../../domain/schema';
import { MATERIALS, LIMITS } from '../../domain/catalog';
import type { MaterialId } from '../../domain/catalog';
import { compileStar } from '../../domain/compile';
import { STAR_PRESETS, copyStarPreset } from '../../domain/presets';
import type { StarPresetId } from '../../domain/presets';
import { documentActions } from '../../state/documentStore';
import { useI18n } from '../../i18n';
import { useRenderProbe } from '../../app/useRenderProbe';
import { ColorField, RangeField, SelectField } from '../shared/Fields';
export const StarEditor = memo(function StarEditor({ owner, layer }: { owner: DesignOwner; layer: LayerDefinition }) {
  useRenderProbe('StarEditor'); const { t, number } = useI18n(); const star = layer.star;
  const [paletteText, setPaletteText] = useState(''); const [paletteError, setPaletteError] = useState(false);
  const change = (patch: Partial<typeof star>) => documentActions.updateLayer(owner, layer.id, current => ({ ...current, star: { ...current.star, ...patch } }));
  const material = (patch: Partial<typeof star.material>) => change({ material: { ...star.material, ...patch } });
  const customColors = layer.colorPalette?.mode === 'custom' ? layer.colorPalette.colors : null;
  const setCustomColors = (colors: string[]) => documentActions.updateLayer(owner, layer.id, current => ({ ...current, colorPalette: { mode: 'custom', colors } }));
  const parsePalette = () => {
    const tokens = paletteText.split(/[\s,]+/).filter(Boolean), colors = tokens.filter(value => /^#[\da-f]{6}$/i.test(value));
    setPaletteError(!colors.length || colors.length !== tokens.length);
    if (colors.length && colors.length === tokens.length) setCustomColors([...new Set(colors)].slice(0, 48));
  };
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
    <section className="palette-editor" aria-label={t('field.colorPalette')}><div className="section-heading"><h3>{t('field.colorPalette')}</h3><div className="small-actions"><button type="button" className={!customColors ? 'selected' : ''} onClick={() => documentActions.updateLayer(owner, layer.id, current => { const rest = { ...current }; delete rest.colorPalette; return rest; })}>{t('palette.basic')}</button><button type="button" className={customColors ? 'selected' : ''} onClick={() => setCustomColors(customColors ?? ['#ffb35c', '#f35f83', '#75d9ff'])}>{t('palette.custom')}</button></div></div>
      {customColors && <><div className="palette-swatch-list">{customColors.map((color, index) => <div key={`${color}-${index}`}><ColorField label={`${t('palette.color')} ${index + 1}`} value={color} onChange={value => setCustomColors(customColors.map((item, itemIndex) => itemIndex === index ? value : item))} /><button type="button" className="text-button" disabled={customColors.length === 1} onClick={() => setCustomColors(customColors.filter((_, itemIndex) => itemIndex !== index))}>{t('action.delete')}</button></div>)}</div><button type="button" className="text-button" disabled={customColors.length >= 48} onClick={() => setCustomColors([...customColors, customColors.at(-1)!])}>{t('palette.add')}</button><label className="field"><span>{t('palette.paste')}</span><textarea value={paletteText} placeholder="#ffb35c, #f35f83" onChange={event => { setPaletteText(event.currentTarget.value); setPaletteError(false); }} /></label><button type="button" className="text-button" onClick={parsePalette}>{t('palette.apply')}</button>{paletteError && <small className="field-error">{t('palette.invalid')}</small>}</>}
    </section>
    <dl className="derived-values"><div><dt>{t('field.estimatedLife')}</dt><dd>{number(profile.lifetime, 2)} <span>{t('unit.seconds')}</span></dd></div></dl>
  </div>;
});
