import type { PatternId } from '../../domain/catalog';
import { isShape, SHAPE_PATHS } from '../../domain/shapes';

export function PatternIcon({ pattern, className = '' }: { pattern: PatternId; className?: string }) {
  const rays = pattern === 'crossette' ? 8 : 16;
  if (isShape(pattern)) return <svg className={`pattern-icon ${className}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">{SHAPE_PATHS[pattern].map((path, index) => <polyline key={index} points={path.map(([x, y]) => `${20 + x * 13},${21 - y * 13}`).join(' ')} stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />)}</svg>;
  return <svg className={`pattern-icon ${className}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    {pattern === 'ring' ? <><circle cx="20" cy="20" r="13" stroke="currentColor" strokeDasharray="1 3" /><path d="M5 20h30M20 5v30" stroke="currentColor" opacity=".25" /></> : Array.from({ length: rays }, (_, i) => {
      const angle = i / rays * Math.PI * 2;
      const start = pattern === 'peony' ? 9 : 4;
      const x = 20 + Math.cos(angle) * 15;
      const y = 20 + Math.sin(angle) * 15;
      return <g key={i}><path d={`M${20 + Math.cos(angle) * start} ${20 + Math.sin(angle) * start} Q${x} ${y - (pattern === 'willow' ? 5 : 0)} ${x} ${y}`} stroke="currentColor" strokeWidth=".8" /><circle cx={x} cy={y} r=".8" fill="currentColor" /></g>;
    })}
  </svg>;
}
