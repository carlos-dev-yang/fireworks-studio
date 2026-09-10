import { LibraryError } from "./errors";
export { LibraryError } from "./errors";
export const LIBRARY_DB_NAME = "fireworks-studio",
  LIBRARY_DB_VERSION = 2;
export const LIBRARY_ARCHIVE_KIND = "fireworks-library/1" as const,
  FIREWORK_ARCHIVE_KIND = "fireworks-firework/1" as const,
  SHOW_ARCHIVE_KIND = "fireworks-show/1" as const;
export type ArtworkDimension = "2d" | "3d";
export type ArtworkPart = "outline" | "fill" | "details" | "shell";
export interface ArtworkAsset {
  id: string;
  width: number;
  height: number;
  palette: string[];
  rows: string[];
}
export interface ArtworkRef {
  assetId: string;
  dimension: ArtworkDimension;
  part: ArtworkPart;
}
export interface PersonalPreset {
  id: string;
  name: string;
  design: unknown;
  createdAt: string;
  updatedAt: string;
}
export interface StoredProject {
  id: string;
  name: string;
  document: unknown;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  revision?: number;
}
export interface LibraryArchive {
  kind: typeof LIBRARY_ARCHIVE_KIND;
  version: 1 | 2;
  assets: ArtworkAsset[];
  presets: PersonalPreset[];
  projects: StoredProject[];
  archivedProjects?: StoredProject[];
}
export interface FireworkArchive {
  kind: typeof FIREWORK_ARCHIVE_KIND;
  version: 1;
  firework: { name: string; design: unknown };
  assets: ArtworkAsset[];
}
export interface FireworkDefinition {
  id: string;
  name: string;
  design: unknown;
}
export interface ShowArchive {
  kind: typeof SHOW_ARCHIVE_KIND;
  version: 1;
  show: unknown;
  assets: ArtworkAsset[];
}
export interface BootstrapLibrary {
  project: StoredProject | null;
  presets: PersonalPreset[];
  assets: ArtworkAsset[];
}
export interface StorageStatus {
  usage?: number;
  quota?: number;
  persistent?: boolean;
  available: boolean;
}
export interface ArchiveValidator {
  parseProject(document: unknown): unknown;
  parsePreset(design: unknown): unknown;
}
type Store = "assets" | "presets" | "projects" | "meta";
type Meta = { key: string; value: unknown };
const COLOR = /^#[0-9a-fA-F]{6}$/,
  registry = new Map<string, ArtworkAsset>();
let dbPromise: Promise<IDBDatabase> | undefined;
const clone = <T>(v: T): T => structuredClone(v);
const plain = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function fail(
  code: ConstructorParameters<typeof LibraryError>[0],
  msg?: string,
): never {
  throw new LibraryError(code, msg);
}
function str(v: unknown, f: string) {
  if (typeof v !== "string" || !v.trim())
    return fail("invalidArchive", `Invalid ${f}.`);
  return v;
}
function when(v: unknown, f: string) {
  const r = str(v, f);
  if (!Number.isFinite(Date.parse(r)))
    return fail("invalidArchive", `Invalid ${f}.`);
  return r;
}
function done(tx: IDBTransaction) {
  return new Promise<void>((ok, no) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => no(tx.error ?? new Error("Transaction failed"));
    tx.onabort = () => no(tx.error ?? new Error("Transaction aborted"));
  });
}
function req<T>(r: IDBRequest<T>) {
  return new Promise<T>((ok, no) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error ?? new Error("Request failed"));
  });
}
export async function openLibrary() {
  if (dbPromise) return dbPromise;
  if (!("indexedDB" in globalThis))
    throw new Error("IndexedDB is unavailable.");
  dbPromise = new Promise<IDBDatabase>((ok, no) => {
    const r = indexedDB.open(LIBRARY_DB_NAME, LIBRARY_DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of ["assets", "presets", "projects", "meta"])
        if (!d.objectStoreNames.contains(s))
          d.createObjectStore(s, { keyPath: s === "meta" ? "key" : "id" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  }).catch((e) => {
    dbPromise = undefined;
    throw e;
  });
  return dbPromise;
}
async function all<T>(store: Store) {
  const d = await openLibrary(),
    tx = d.transaction(store, "readonly"),
    v = (await req(tx.objectStore(store).getAll())) as T[];
  await done(tx);
  return v;
}
export function setArtworkAssets(values: ArtworkAsset[]) {
  registry.clear();
  for (const v of values)
    registry.set(
      v.id,
      Object.freeze({
        ...asset(v, false),
        palette: Object.freeze([...v.palette]),
        rows: Object.freeze([...v.rows]),
      }) as ArtworkAsset,
    );
}
export function getArtworkAsset(id: string) {
  return registry.get(id);
}
export async function hashAsset(a: Omit<ArtworkAsset, "id"> | ArtworkAsset) {
  const x = JSON.stringify({
      width: a.width,
      height: a.height,
      palette: a.palette,
      rows: a.rows,
    }),
    h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return `sha256:${[...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function asset(v: unknown, verify: false): ArtworkAsset;
function asset(v: unknown, verify: true): Promise<ArtworkAsset>;
function asset(
  v: unknown,
  verify: boolean,
): ArtworkAsset | Promise<ArtworkAsset> {
  if (!plain(v)) return fail("invalidArchive");
  const id = str(v.id, "artwork id"),
    w = v.width,
    h = v.height;
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    (w as number) < 1 ||
    (h as number) < 1 ||
    !Array.isArray(v.palette) ||
    !Array.isArray(v.rows) ||
    v.palette.length < 1 ||
    v.palette.length > 36 ||
    v.rows.length !== h ||
    !v.palette.every((c) => typeof c === "string" && COLOR.test(c)) ||
    !v.rows.every((r) => typeof r === "string" && r.length === w)
  )
    return fail("invalidArchive", "Invalid artwork grid.");
  const a = {
    id,
    width: w as number,
    height: h as number,
    palette: [...v.palette] as string[],
    rows: [...v.rows] as string[],
  };
  for (const row of a.rows)
    for (const c of row)
      if (
        c !== "." &&
        (!/^[0-9a-z]$/i.test(c) || parseInt(c, 36) >= a.palette.length)
      )
        return fail("invalidArchive");
  if (!a.rows.some((r) => /[0-9a-z]/i.test(r))) return fail("invalidArchive");
  return verify
    ? hashAsset(a).then((id2) => {
        if (id !== id2) return fail("invalidArchive", "Artwork hash mismatch.");
        return a;
      })
    : a;
}
function project(v: unknown): StoredProject {
  if (!plain(v)) return fail("invalidArchive");
  const revision = v.revision;
  if (
    revision !== undefined &&
    (!Number.isInteger(revision) || (revision as number) < 0)
  )
    return fail("invalidArchive");
  return {
    id: str(v.id, "project id"),
    name: str(v.name, "project name"),
    document: clone(v.document),
    createdAt: when(v.createdAt, "createdAt"),
    updatedAt: when(v.updatedAt, "updatedAt"),
    ...(v.archivedAt === undefined
      ? {}
      : { archivedAt: when(v.archivedAt, "archivedAt") }),
    ...(revision === undefined ? {} : { revision: revision as number }),
  };
}
function preset(v: unknown): PersonalPreset {
  if (!plain(v)) return fail("invalidArchive");
  return {
    id: str(v.id, "preset id"),
    name: str(v.name, "preset name"),
    design: clone(v.design),
    createdAt: when(v.createdAt, "createdAt"),
    updatedAt: when(v.updatedAt, "updatedAt"),
  };
}
export async function listProjects() {
  return (await all<StoredProject>("projects"))
    .map(project)
    .filter((x) => !x.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function listArchivedProjects() {
  return (await all<StoredProject>("projects"))
    .map(project)
    .filter((x) => !!x.archivedAt)
    .sort((a, b) => b.archivedAt!.localeCompare(a.archivedAt!));
}
export async function listPresets() {
  return (await all<PersonalPreset>("presets"))
    .map(preset)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getProject(id: string) {
  const d = await openLibrary(),
    tx = d.transaction("projects", "readonly"),
    v = (await req(tx.objectStore("projects").get(id))) as
      | StoredProject
      | undefined;
  await done(tx);
  return v ? project(v) : null;
}
export async function hydrateArtworkAssets(ids: string[]) {
  const missing = [...new Set(ids)].filter((id) => !registry.has(id));
  if (missing.length) {
    const d = await openLibrary(),
      tx = d.transaction("assets", "readonly"),
      end = done(tx),
      values = await Promise.all(
        missing.map((id) => req(tx.objectStore("assets").get(id))),
      );
    await end;
    for (const a of await Promise.all(
      values.filter(Boolean).map((x) => asset(x, true)),
    ))
      registry.set(
        a.id,
        Object.freeze({
          ...a,
          palette: Object.freeze([...a.palette]),
          rows: Object.freeze([...a.rows]),
        }) as ArtworkAsset,
      );
  }
  return ids
    .map((id) => registry.get(id))
    .filter((x): x is ArtworkAsset => !!x);
}
export async function loadBootstrap(): Promise<BootstrapLibrary> {
  const [ps, pr] = await Promise.all([listProjects(), listPresets()]);
  const d = await openLibrary(),
    tx = d.transaction("meta", "readonly"),
    m = (await req(tx.objectStore("meta").get("activeProjectId"))) as
      | Meta
      | undefined;
  await done(tx);
  const p = ps.find((x) => x.id === m?.value) ?? ps[0] ?? null;
  return {
    project: p,
    presets: pr,
    assets: await hydrateArtworkAssets([
      ...(p ? artworkIdsIn(p.document) : []),
      ...pr.flatMap((x) => artworkIdsIn(x.design)),
    ]),
  };
}
/** CAS save: input revision defaults to zero for legacy rows; this never writes meta. */
export async function saveProject(input: StoredProject) {
  const p = project(input),
    d = await openLibrary(),
    tx = d.transaction("projects", "readwrite"),
    s = tx.objectStore("projects"),
    old = (await req(s.get(p.id))) as StoredProject | undefined;
  let out: StoredProject;
  if (!old) {
    out = { ...p, revision: 1 };
    s.add(clone(out));
  } else {
    const cur = project(old);
    if (cur.archivedAt || (p.revision ?? 0) !== (cur.revision ?? 0)) {
      tx.abort();
      return fail("conflict", "Project changed or is archived.");
    }
    out = { ...p, revision: (cur.revision ?? 0) + 1 };
    s.put(clone(out));
  }
  await done(tx);
  return out;
}
export async function activateProject(id: string) {
  const p = await getProject(id);
  if (!p) return fail("missingProject");
  if (p.archivedAt) return fail("conflict");
  const d = await openLibrary(),
    tx = d.transaction("meta", "readwrite");
  tx.objectStore("meta").put({
    key: "activeProjectId",
    value: id,
  } satisfies Meta);
  await done(tx);
  return p;
}
export async function archiveProject(id: string) {
  const p = await getProject(id);
  if (!p) return fail("missingProject");
  return saveProject({ ...p, archivedAt: new Date().toISOString() });
}
export async function restoreProject(id: string) {
  const p = await getProject(id);
  if (!p) return fail("missingProject");
  if (!p.archivedAt) return p;
  const d = await openLibrary(),
    tx = d.transaction("projects", "readwrite"),
    s = tx.objectStore("projects"),
    raw = (await req(s.get(id))) as StoredProject | undefined;
  if (!raw) return fail("missingProject");
  const current = project(raw);
  if ((current.revision ?? 0) !== (p.revision ?? 0)) {
    tx.abort();
    return fail("conflict");
  }
  const restored = { ...p };
  delete restored.archivedAt;
  const out = { ...restored, revision: (current.revision ?? 0) + 1 };
  s.put(clone(out));
  await done(tx);
  return out;
}
export async function savePreset(input: PersonalPreset) {
  const p = preset(input),
    d = await openLibrary(),
    tx = d.transaction("presets", "readwrite");
  tx.objectStore("presets").add(clone(p));
  await done(tx);
  return p;
}
export function artworkIdsIn(v: unknown) {
  const ids = new Set<string>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return void x.forEach(walk);
    if (!plain(x)) return;
    const a = x.artwork;
    if (plain(a) && typeof a.assetId === "string") ids.add(a.assetId);
    Object.values(x).forEach(walk);
  };
  walk(v);
  return [...ids];
}
async function localAssets() {
  return Promise.all(
    (await all<ArtworkAsset>("assets")).map((x) => asset(x, true)),
  );
}
function refs(v: unknown, available: Map<string, ArtworkAsset>) {
  if (artworkIdsIn(v).some((id) => !available.has(id)))
    return fail("missingArtwork", "Artwork is not included.");
}
async function closure(v: unknown) {
  const db = new Map((await localAssets()).map((a) => [a.id, a]));
  const result = artworkIdsIn(v).map((id) => registry.get(id) ?? db.get(id));
  if (result.some((x) => !x)) return fail("missingArtwork");
  return Promise.all(result.map((x) => asset(x!, true)));
}
async function addAssets(tx: IDBTransaction, values: ArtworkAsset[]) {
  const s = tx.objectStore("assets"),
    unique = new Map(values.map((a) => [a.id, a]));
  if (unique.size !== values.length) {
    tx.abort();
    return fail("invalidArchive");
  }
  const existing = await Promise.all(
    [...unique.values()].map(
      async (a) =>
        [a, (await req(s.get(a.id))) as ArtworkAsset | undefined] as const,
    ),
  );
  for (const [a, old] of existing)
    if (old && JSON.stringify(old) !== JSON.stringify(a)) {
      tx.abort();
      return fail("conflict", "Artwork collision.");
    }
  for (const [a, old] of existing) if (!old) s.add(clone(a));
}
function fireworkCandidate(v: unknown) {
  if (!plain(v)) return fail("unsupportedFormat");
  if ("kind" in v || "version" in v) {
    if (
      v.kind !== FIREWORK_ARCHIVE_KIND ||
      v.version !== 1 ||
      !plain(v.firework) ||
      !Array.isArray(v.assets)
    )
      return fail("unsupportedFormat");
    return {
      firework: {
        name: str(v.firework.name, "firework name"),
        design: clone(v.firework.design),
      },
      assets: v.assets,
    };
  }
  if (!("name" in v) || !("design" in v)) return fail("unsupportedFormat");
  return {
    firework: { name: str(v.name, "firework name"), design: clone(v.design) },
    assets: [],
  };
}
export async function importFireworkArchive(
  v: unknown,
  parse: (x: unknown) => unknown,
) {
  const raw = fireworkCandidate(v),
    assets = await Promise.all(raw.assets.map((x) => asset(x, true))),
    design = parse(raw.firework.design);
  refs(
    design,
    new Map([...(await localAssets()), ...assets].map((a) => [a.id, a])),
  );
  const now = new Date().toISOString(),
    p = {
      id: `preset-${crypto.randomUUID()}`,
      name: raw.firework.name,
      design,
      createdAt: now,
      updatedAt: now,
    },
    d = await openLibrary(),
    tx = d.transaction(["assets", "presets"], "readwrite");
  await addAssets(tx, assets);
  tx.objectStore("presets").add(clone(p));
  await done(tx);
  setArtworkAssets([...registry.values(), ...assets]);
  return p;
}
export async function exportFireworkArchive(
  f: { name: string; design: unknown },
  parse?: (x: unknown) => unknown,
): Promise<FireworkArchive> {
  const design = parse ? parse(clone(f.design)) : clone(f.design);
  return {
    kind: FIREWORK_ARCHIVE_KIND,
    version: 1,
    firework: { name: str(f.name, "firework name"), design },
    assets: await closure(design),
  };
}
export async function importShowArchive(
  v: unknown,
  parse: (x: unknown) => unknown,
) {
  if (
    !plain(v) ||
    v.kind !== SHOW_ARCHIVE_KIND ||
    v.version !== 1 ||
    !("show" in v) ||
    !Array.isArray(v.assets)
  )
    return fail("unsupportedFormat");
  const assets = await Promise.all(v.assets.map((x) => asset(x, true))),
    show = parse(clone(v.show));
  refs(
    show,
    new Map([...(await localAssets()), ...assets].map((a) => [a.id, a])),
  );
  if (!plain(show)) return fail("invalidArchive");
  const now = new Date().toISOString(),
    p = {
      id: `project-${crypto.randomUUID()}`,
      name: str(show.name, "show name"),
      document: show,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    },
    d = await openLibrary(),
    tx = d.transaction(["assets", "projects"], "readwrite");
  await addAssets(tx, assets);
  tx.objectStore("projects").add(clone(p));
  await done(tx);
  setArtworkAssets([...registry.values(), ...assets]);
  return p;
}
export async function exportShowArchive(
  document: unknown,
  parse: (x: unknown) => unknown,
): Promise<ShowArchive> {
  const show = parse(clone(document));
  return {
    kind: SHOW_ARCHIVE_KIND,
    version: 1,
    show,
    assets: await closure(show),
  };
}
export async function importArchive(v: unknown, validator: ArchiveValidator) {
  if (
    !plain(v) ||
    v.kind !== LIBRARY_ARCHIVE_KIND ||
    (v.version !== 1 && v.version !== 2) ||
    !Array.isArray(v.assets) ||
    !Array.isArray(v.projects) ||
    !Array.isArray(v.presets) ||
    (v.archivedProjects !== undefined && !Array.isArray(v.archivedProjects))
  )
    return fail("unsupportedFormat");
  const assets = await Promise.all(v.assets.map((x) => asset(x, true))),
    projects = [...v.projects, ...(v.archivedProjects ?? [])].map((x) => {
      const p = project(x);
      return {
        ...p,
        document: validator.parseProject(p.document),
        id: `project-${crypto.randomUUID()}`,
        revision: 1,
      };
    }),
    presets = v.presets.map((x) => {
      const p = preset(x);
      return {
        ...p,
        design: validator.parsePreset(p.design),
        id: `preset-${crypto.randomUUID()}`,
      };
    }),
    available = new Map(
      [...(await localAssets()), ...assets].map((a) => [a.id, a]),
    );
  for (const p of projects) refs(p.document, available);
  for (const p of presets) refs(p.design, available);
  const d = await openLibrary(),
    tx = d.transaction(["assets", "projects", "presets"], "readwrite");
  await addAssets(tx, assets);
  for (const p of projects) tx.objectStore("projects").add(clone(p));
  for (const p of presets) tx.objectStore("presets").add(clone(p));
  await done(tx);
  setArtworkAssets([...registry.values(), ...assets]);
  return { projects, presets };
}
export async function exportArchive(
  projectId?: string,
  validator?: ArchiveValidator,
  currentProject?: StoredProject,
): Promise<LibraryArchive> {
  const [rawProjects, rawPresets, rawAssets] = await Promise.all([
    all<StoredProject>("projects"),
    all<PersonalPreset>("presets"),
    localAssets(),
  ]);
  let projects = rawProjects.map(project),
    presets = rawPresets.map(preset);
  const current = currentProject && project(clone(currentProject));
  if (current) {
    const stored = projects.find((p) => p.id === current.id);
    if (
      stored &&
      (stored.archivedAt || (stored.revision ?? 0) !== (current.revision ?? 0))
    ) {
      projects.push({
        ...current,
        id: `project-${crypto.randomUUID()}`,
        revision: 1,
        name: `${current.name} recovery copy`,
      });
    } else if (stored)
      projects = projects.map((p) => (p.id === current.id ? current : p));
    else projects.push(current);
  }
  if (projectId) {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return fail("missingProject");
    projects = [p];
  }
  if (validator) {
    projects = projects.map((p) => ({
      ...p,
      document: validator.parseProject(clone(p.document)),
    }));
    presets = presets.map((p) => ({
      ...p,
      design: validator.parsePreset(clone(p.design)),
    }));
  }
  const byId = new Map(rawAssets.map((a) => [a.id, a]));
  for (const value of registry.values()) {
    const runtime = await asset(value, true),
      stored = byId.get(runtime.id);
    if (stored && JSON.stringify(stored) !== JSON.stringify(runtime))
      return fail("conflict", "Artwork registry collision.");
    byId.set(runtime.id, runtime);
  }
  let assets = [...byId.values()];
  if (projectId) {
    const wanted = new Set(projects.flatMap((p) => artworkIdsIn(p.document)));
    assets = assets.filter((a) => wanted.has(a.id));
  }
  const avail = new Map(assets.map((a) => [a.id, a]));
  for (const p of projects) refs(p.document, avail);
  for (const p of presets) if (!projectId) refs(p.design, avail);
  return {
    kind: LIBRARY_ARCHIVE_KIND,
    version: 2,
    assets,
    presets: projectId ? [] : presets,
    projects: projects.filter((p) => !p.archivedAt),
    archivedProjects: projects.filter((p) => !!p.archivedAt),
  };
}
export async function getStorageStatus(): Promise<StorageStatus> {
  if (!navigator.storage) return { available: false };
  const [e, p] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.(),
  ]);
  return { available: true, usage: e.usage, quota: e.quota, persistent: p };
}
