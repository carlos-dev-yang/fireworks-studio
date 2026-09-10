import { useId } from 'react';
import type { ReactNode } from 'react';
import { documentActions } from '../../state/documentStore';
import { notify } from '../../state/noticeStore';
import { LIMITS } from '../../domain/catalog';
import type { MessageKey } from '../../i18n';
import { Help } from './Help';
function Label({ id, label, help }: { id: string; label: string; help?: MessageKey }) { return <div className="field-label"><label htmlFor={id}>{label}</label>{help && <Help label={label} content={help} />}</div>; }
export function RangeField({ label, help, value, min, max, step = 0.01, display, onChange }: {
  label: string; help?: MessageKey; value: number; min: number; max: number; step?: number; display?: string; onChange: (value: number) => void;
}) {
  const id = useId();
  return <div className="field range-field"><Label id={id} label={label} help={help} /><output htmlFor={id}>{display ?? value.toFixed(2)}</output>
    <input id={id} type="range" min={min} max={max} step={step} value={value} style={{ '--range-progress': `${(value - min) / (max - min) * 100}%` } as React.CSSProperties}
      onPointerDown={documentActions.begin} onPointerUp={documentActions.end} onPointerCancel={documentActions.end} onBlur={documentActions.end} onKeyDown={documentActions.begin} onKeyUp={documentActions.end}
      onChange={event => onChange(Number(event.currentTarget.value))} />
  </div>;
}
export function NumberField({ label, help, value, min, max, step = 1, suffix, onCommit }: {
  label: string; help?: MessageKey; value: number; min: number; max: number; step?: number; suffix?: string; onCommit: (value: number) => void;
}) {
  const id = useId();
  return <div className="field inline-field"><Label id={id} label={label} help={help} /><div className="number-wrap"><input key={value} id={id} type="number" min={min} max={max} step={step} defaultValue={Number(value.toFixed(3))}
    onBlur={event => { const next = event.currentTarget.valueAsNumber; if (Number.isFinite(next) && event.currentTarget.validity.valid) onCommit(next); else { event.currentTarget.value = String(value); notify('field.rangeError', 'error', { label, min, max, step }); } }}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.currentTarget.value = String(value); event.currentTarget.blur(); } }} />{suffix && <span>{suffix}</span>}</div></div>;
}
export function SelectField({ label, help, value, children, onChange }: { label: string; help?: MessageKey; value: string; children: ReactNode; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="field inline-field"><Label id={id} label={label} help={help} /><select id={id} value={value} onChange={event => onChange(event.currentTarget.value)}>{children}</select></div>;
}
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="field inline-field color-field"><Label id={id} label={label} /><div className="color-wrap"><input id={id} type="color" value={value} onPointerDown={documentActions.begin} onFocus={documentActions.begin} onChange={event => onChange(event.currentTarget.value)} onBlur={documentActions.end} /><output>{value.toUpperCase()}</output></div></div>;
}
export function NameField({ label, value, onCommit, visible = false }: { label: string; value: string; onCommit: (value: string) => void; visible?: boolean }) {
  const id = useId();
  return <label className="name-field" htmlFor={id}><span className={visible ? 'subtle-label' : 'sr-only'}>{label}</span><input key={value} id={id} maxLength={LIMITS.nameLength} defaultValue={value}
    onBlur={event => { const next = event.currentTarget.value.trim(); if (next) onCommit(next); else event.currentTarget.value = value; }}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.currentTarget.value = value; event.currentTarget.blur(); } }} /></label>;
}
