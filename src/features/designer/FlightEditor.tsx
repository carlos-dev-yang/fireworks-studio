import type { DesignOwner, Flight } from '../../domain/schema';
import { LIMITS } from '../../domain/catalog';
import { documentActions } from '../../state/documentStore';
import { useI18n } from '../../i18n';
import { NumberField } from '../shared/Fields';
export function FlightEditor({ owner, flight }: { owner: DesignOwner; flight: Flight }) {
  const { t } = useI18n();
  return <><NumberField label={t('field.height')} help="help.height" value={flight.height} {...LIMITS.height} suffix={t('unit.height')} onCommit={height => documentActions.updateFlight(owner, { height })} /><NumberField label={t('field.rise')} help="help.rise" value={flight.riseSeconds} {...LIMITS.rise} step={0.01} suffix={t('unit.seconds')} onCommit={riseSeconds => documentActions.updateFlight(owner, { riseSeconds })} /><p className="panel-note">{t('field.flightNote')}</p></>;
}
