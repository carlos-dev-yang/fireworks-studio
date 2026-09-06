// Art-directed, normalized outlines shared by particle placement and preset icons.
// These describe a visual effect, not the arrangement of a physical shell.
type Point = readonly [number, number];
type Path = readonly Point[];
const CURVE_STEPS = 48;
function curve(sample: (t: number) => Point, steps = CURVE_STEPS): Path {
  return Array.from({ length: steps + 1 }, (_, index) => sample(index / steps));
}
function oval(x: number, y: number, rx: number, ry: number): Path {
  return curve(t => [x + rx * Math.cos(t * Math.PI * 2), y + ry * Math.sin(t * Math.PI * 2)]);
}
function bezier(a: Point, b: Point, c: Point, d: Point): Path {
  return curve(t => {
    const s = 1 - t;
    return [s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0], s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1]];
  });
}
export const SHAPE_PATHS = {
  heart: [curve(t => {
    const angle = t * Math.PI * 2;
    return [16 * Math.sin(angle) ** 3 / 18, (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle) + 2) / 18];
  }, CURVE_STEPS * 3)],
  cat: [
    [[-.82, .22], [-.94, .94], [-.42, .62], [-.2, .67], [.2, .67], [.42, .62], [.94, .94], [.82, .22], [.88, -.08], [.75, -.48], [.46, -.7], [0, -.8], [-.46, -.7], [-.75, -.48], [-.88, -.08], [-.82, .22]],
    oval(-.34, .12, .07, .12), oval(.34, .12, .07, .12),
    [[-.09, -.12], [.09, -.12], [0, -.23], [-.09, -.12]],
    [[-.2, -.34], [-.08, -.38], [0, -.25], [.08, -.38], [.2, -.34]],
    [[-.42, -.21], [-1.05, -.1]], [[-.42, -.35], [-1.04, -.44]],
    [[.42, -.21], [1.05, -.1]], [[.42, -.35], [1.04, -.44]],
  ],
  apple: [
    bezier([0, .53], [-1.22, 1.04], [-1.02, -.9], [-.36, -.84]),
    bezier([-.36, -.84], [-.1, -.7], [.1, -.7], [.36, -.84]),
    bezier([.36, -.84], [1.02, -.9], [1.22, 1.04], [0, .53]),
    bezier([0, .53], [-.04, .75], [.01, .86], [.15, 1.04]),
    bezier([.08, .77], [.25, 1.11], [.6, 1.08], [.69, .96]),
    bezier([.69, .96], [.53, .73], [.29, .68], [.08, .77]),
  ],
  cup: [
    [[-.73, .43], [.48, .43], [.45, -.46], [.32, -.65], [.08, -.75], [-.35, -.75], [-.6, -.62], [-.72, -.42], [-.73, .43]],
    bezier([.47, .3], [1.28, .65], [1.21, -.58], [.45, -.36]),
    bezier([-.43, .66], [-.73, .9], [-.17, .95], [-.44, 1.19]),
    bezier([.05, .66], [-.25, .9], [.31, .95], [.04, 1.19]),
    [[-.9, -.9], [.7, -.9]],
  ],
} as const satisfies Record<string, readonly Path[]>;
export type ShapeId = keyof typeof SHAPE_PATHS;
export function isShape(pattern: string): pattern is ShapeId { return Object.hasOwn(SHAPE_PATHS, pattern); }

interface Segment { a: Point; b: Point; start: number; length: number }
const outlines = new Map<ShapeId, { segments: Segment[]; length: number }>();
export function sampleShape(pattern: ShapeId, count: number): Point[] {
  let outline = outlines.get(pattern);
  if (!outline) {
    const segments: Segment[] = [];
    let length = 0;
    for (const path of SHAPE_PATHS[pattern]) {
      for (let index = 1; index < path.length; index++) {
        const a = path[index - 1], b = path[index];
        const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!distance) continue;
        segments.push({ a, b, start: length, length: distance });
        length += distance;
      }
    }
    outline = { segments, length };
    outlines.set(pattern, outline);
  }
  const { segments, length } = outline;
  let segmentIndex = 0;
  return Array.from({ length: count }, (_, index) => {
    const distance = (index + .5) * length / count;
    while (segmentIndex < segments.length - 1 && distance > segments[segmentIndex].start + segments[segmentIndex].length) segmentIndex++;
    const segment = segments[segmentIndex], t = (distance - segment.start) / segment.length;
    return [segment.a[0] + (segment.b[0] - segment.a[0]) * t, segment.a[1] + (segment.b[1] - segment.a[1]) * t];
  });
}
