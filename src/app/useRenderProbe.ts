import { useLayoutEffect } from 'react';

const commits = new Map<string, number>();
// Development-only, pull-based diagnostics; never updates application state.
export function useRenderProbe(name: string) {
  useLayoutEffect(() => {
    if (import.meta.env.DEV) commits.set(name, (commits.get(name) ?? 0) + 1);
  });
}
export function readRenderProbes() { return [...commits.entries()].sort(([a], [b]) => a.localeCompare(b)); }
