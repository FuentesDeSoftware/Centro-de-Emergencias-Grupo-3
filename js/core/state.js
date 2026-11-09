// Store central: estado mutable, suscripción a cambios y bus de eventos.
const subscribers = new Set();
const handlers = new Map();
let dirty = false;

export const state = {
  screen: 'start',
  disaster: 'flood',
  level: 1,
  running: false,
  paused: false,
  speed: 1,
  time: 0,
  muted: false,
  resources: [],
  houses: [],
  shelter: { capacity: 0, used: 0 },
  selectedHouseId: null,
  selectedResourceId: null,
  saved: 0,
  lost: 0,
  dispatches: 0,
  unitSpeedMul: 1,
  wind: null,
  result: null,
};

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// Marca el estado como modificado; los suscriptores se avisan una vez por frame.
export function notify() {
  dirty = true;
}

export function flush() {
  if (!dirty) return;
  dirty = false;
  subscribers.forEach((fn) => fn(state));
}

export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
}

export function emit(type, payload) {
  handlers.get(type)?.forEach((fn) => fn(payload));
}

export function selectedHouse() {
  return state.houses.find((h) => h.id === state.selectedHouseId) || null;
}

export function selectedResource() {
  return state.resources.find((r) => r.id === state.selectedResourceId) || null;
}

// 1 segundo de simulación = 1 minuto en el reloj; la emergencia empieza a las 06:00.
export function formatClock(t) {
  const minutes = 360 + Math.floor(t);
  const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatDuration(t) {
  const minutes = Math.floor(t);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

const STORAGE_KEY = 'centro-emergencias:progreso';

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function unlockedLevel(disaster) {
  return loadProgress()[disaster]?.unlocked || 1;
}

export function saveResult(disaster, level, score, stars) {
  const progress = loadProgress();
  const entry = progress[disaster] || (progress[disaster] = { unlocked: 1, best: {} });
  entry.best = entry.best || {};
  const prev = entry.best[level];
  const isRecord = stars > 0 && (!prev || score > prev.score);
  if (isRecord) entry.best[level] = { score, stars: Math.max(stars, prev?.stars || 0) };
  if (stars > 0 && level < 5) entry.unlocked = Math.max(entry.unlocked || 1, level + 1);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Sin almacenamiento disponible: el progreso solo dura la sesión.
  }
  return { isRecord, best: entry.best[level]?.score ?? null };
}
