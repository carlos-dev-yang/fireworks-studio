import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Dialog from '@radix-ui/react-dialog';
import { CircleHelp, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
export function Tip({ content, children }: { content: MessageKey; children: ReactElement }) {
  const { t } = useI18n();
  return <Tooltip.Root><Tooltip.Trigger asChild>{children}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={8} collisionPadding={16}>{t(content)}<Tooltip.Arrow className="tooltip-arrow" /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}
export function Help({ label, content }: { label: string; content: MessageKey }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <Tooltip.Root open={open} onOpenChange={setOpen}><Tooltip.Trigger asChild><button type="button" className="help-button" aria-label={t('help.title', { label })} onClick={() => setOpen(!open)}><CircleHelp size={13} /></button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={8} collisionPadding={16}>{t(content)}<Tooltip.Arrow className="tooltip-arrow" /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}
export function Modal({ title, description, children, onClose }: { title: string; description: string; children: ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="modal">
    <div className="modal-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="icon-button" aria-label={t('action.close')}><X size={18} /></Dialog.Close></div>
    <Dialog.Description className="panel-note">{description}</Dialog.Description>{children}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
