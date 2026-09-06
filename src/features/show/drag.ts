import { LIMITS, TICK_RATE, TIMELINE } from '../../domain/catalog';
export const DRAG_MIME = 'application/x-star-studio';
export type DragItem = { kind: 'firework' | 'cue'; id: string; offset: number };
export function beginDrag(event: React.DragEvent, item: DragItem) { event.dataTransfer.setData(DRAG_MIME, JSON.stringify(item)); event.dataTransfer.effectAllowed = item.kind === 'cue' ? 'move' : 'copy'; }
export function readDrag(event: React.DragEvent): DragItem | null {
  try { const item = JSON.parse(event.dataTransfer.getData(DRAG_MIME)); return (item.kind === 'cue' || item.kind === 'firework') && typeof item.id === 'string' && Number.isFinite(item.offset) ? item : null; } catch { return null; }
}
export function dropTick(clientX: number, left: number, scale: number, offset = 0) { const seconds = Math.max(0, Math.min(LIMITS.cueSeconds, (clientX - left) / scale - offset)); return Math.round(Math.round(seconds / TIMELINE.snapSeconds) * TIMELINE.snapSeconds * TICK_RATE); }
