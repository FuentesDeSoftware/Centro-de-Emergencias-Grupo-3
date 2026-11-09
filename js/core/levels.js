// Configuración por desastre y nivel.
export const MAX_LEVEL = 5;

export const DISASTERS = {
  flood: {
    id: 'flood',
    name: 'Inundación',
    icon: '🌊',
    brief: 'El río se desborda. Evacúa las casas bajas antes de que el agua las cubra.',
    resources: [
      { id: 'rescatistas', name: 'Rescatistas', icon: '🦺', unit: 'team', rescue: 3, speed: 3.4, opTime: 4, hint: 'Evacúan 3 personas' },
      { id: 'lanchas', name: 'Lanchas', icon: '🚤', unit: 'boat', rescue: 6, speed: 5.5, opTime: 3.5, hint: 'Evacúan 6 personas, rápidas' },
      { id: 'refugios', name: 'Refugios', icon: '⛺', kind: 'shelter', capacity: 22, hint: 'Abre 22 cupos nuevos' },
    ],
  },
  fire: {
    id: 'fire',
    name: 'Incendio',
    icon: '🔥',
    brief: 'El fuego salta de casa en casa según el viento. Corta la propagación.',
    resources: [
      { id: 'bomberos', name: 'Bomberos', icon: '🧑‍🚒', unit: 'firefighters', rescue: 4, cool: 8, speed: 3.6, opTime: 4, hint: 'Evacúan 4 y frenan el fuego' },
      { id: 'cisternas', name: 'Camiones cisterna', icon: '🚒', unit: 'truck', mitigate: 'extinguish', speed: 5, opTime: 5, hint: 'Apagan la casa' },
      { id: 'helicopteros', name: 'Helicópteros', icon: '🚁', unit: 'heli', mitigate: 'extinguish', radius: 5.2, speed: 8.5, opTime: 2.5, hint: 'Apagan la casa y vecinas' },
    ],
  },
  quake: {
    id: 'quake',
    name: 'Terremoto',
    icon: '🏚️',
    brief: 'Hay personas atrapadas y las réplicas siguen. Rescata y estabiliza.',
    resources: [
      { id: 'rescatistas', name: 'Rescatistas', icon: '🦺', unit: 'team', rescue: 3, speed: 3.4, opTime: 5, hint: 'Rescatan 3 atrapados' },
      { id: 'ambulancias', name: 'Ambulancias', icon: '🚑', unit: 'ambulance', rescue: 4, speed: 6.5, opTime: 3, hint: 'Trasladan 4 heridos, rápidas' },
      { id: 'maquinaria', name: 'Maquinaria', icon: '🚜', unit: 'excavator', mitigate: 'stabilize', rescue: 2, speed: 2.8, opTime: 6, hint: 'Estabiliza y rescata 2' },
    ],
  },
};

// Cada arreglo tiene un valor por nivel (1 a 5).
const TABLE = {
  flood: {
    counts: { rescatistas: [4, 3, 3, 3, 2], lanchas: [3, 3, 2, 2, 2], refugios: [3, 3, 3, 2, 2] },
    timer: [58, 52, 46, 40, 35],
    shelterCap: [18, 18, 16, 16, 14],
    eventInterval: [30, 27, 24, 21, 18],
    affected: [0.35, 0.45, 0.55, 0.68, 0.8],
    riseTime: [90, 84, 78, 70, 62],
  },
  fire: {
    counts: { bomberos: [4, 3, 3, 3, 2], cisternas: [3, 3, 2, 2, 2], helicopteros: [1, 1, 1, 1, 1] },
    timer: [60, 54, 48, 43, 38],
    shelterCap: [26, 24, 22, 20, 18],
    eventInterval: [28, 25, 22, 19, 16],
    initialFires: [3, 4, 5, 6, 7],
    spreadInterval: [11, 10, 9, 8, 7],
  },
  quake: {
    counts: { rescatistas: [4, 4, 3, 3, 2], ambulancias: [3, 2, 2, 2, 2], maquinaria: [2, 2, 1, 1, 1] },
    timer: [68, 60, 54, 48, 42],
    shelterCap: [26, 24, 22, 20, 18],
    eventInterval: [32, 28, 25, 22, 19],
    initialDamaged: [5, 6, 7, 8, 9],
    aftershocks: [2, 3, 3, 4, 5],
    aftershockInterval: [28, 26, 23, 20, 18],
    aftershockDamage: [1, 2, 2, 3, 3],
  },
};

export function getLevelConfig(disaster, level) {
  const i = Math.min(MAX_LEVEL, Math.max(1, level)) - 1;
  const cfg = { counts: {} };
  for (const [key, value] of Object.entries(TABLE[disaster])) {
    if (key === 'counts') {
      for (const [id, perLevel] of Object.entries(value)) cfg.counts[id] = perLevel[i];
    } else {
      cfg[key] = value[i];
    }
  }
  return cfg;
}
