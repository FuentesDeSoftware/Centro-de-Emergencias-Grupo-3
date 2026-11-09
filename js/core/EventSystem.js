// Eventos aleatorios que alteran la emergencia en curso.
import { state } from './state.js';

const POOLS = {
  flood: [
    { weight: 2, run: (e) => e.disaster.breakDike() },
    { weight: 2, run: (e) => e.disaster.heavyRain() },
    { weight: 1, run: (e) => e.disaster.lull() },
    { weight: 2, run: (e) => e.reinforce() },
  ],
  fire: [
    { weight: 3, run: (e) => e.disaster.changeWind() },
    { weight: 2, run: (e) => e.disaster.gusts() },
    { weight: 1, run: (e) => e.disaster.gasExplosion() },
    { weight: 2, run: (e) => e.reinforce() },
  ],
  quake: [
    { weight: 2, run: (e) => e.disaster.aftershock(true) },
    { weight: 2, run: (e) => e.blockRoads() },
    { weight: 3, run: (e) => e.reinforce() },
  ],
};

const jitter = (base) => base * (0.75 + Math.random() * 0.55);

export class EventSystem {
  constructor(engine, cfg) {
    this.engine = engine;
    this.interval = cfg.eventInterval;
    this.next = jitter(this.interval);
  }

  update(dt) {
    this.next -= dt;
    if (this.next > 0) return;
    this.next = jitter(this.interval);
    this.trigger();
  }

  trigger() {
    const pool = POOLS[state.disaster];
    const total = pool.reduce((sum, ev) => sum + ev.weight, 0);
    let roll = Math.random() * total;
    for (const ev of pool) {
      roll -= ev.weight;
      if (roll <= 0) {
        ev.run(this.engine);
        return;
      }
    }
  }
}
