// Incendio: partículas de fuego/humo y propagación entre casas según el viento.
import * as THREE from 'three';
import { state, notify } from '../../core/state.js';

const SPREAD_RADIUS = 7.6;
const COMPASS = ['E', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];

const rand = (a, b) => a + Math.random() * (b - a);

function softDot() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

class ParticlePool {
  constructor(count, material) {
    this.count = count;
    this.cursor = 0;
    this.pos = new Float32Array(count * 3).fill(-999);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, material);
    this.points.frustumCulled = false;
  }

  spawn(x, y, z, vx, vy, vz, life) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = life;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = i * 3;
      if (this.life[i] <= 0) {
        this.pos[k + 1] = -999;
        continue;
      }
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.points.removeFromParent();
  }
}

export class Fire {
  constructor({ engine, town, cfg }) {
    this.engine = engine;
    this.cfg = cfg;
    this.spreadMul = 1;
    this.gustTimer = 0;
    this.emitAcc = 0;
    this.wind = { x: 1, z: 0 };

    this.texture = softDot();
    this.flames = new ParticlePool(
      700,
      new THREE.PointsMaterial({
        size: 0.7,
        color: 0xff7a1a,
        map: this.texture,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.smoke = new ParticlePool(
      500,
      new THREE.PointsMaterial({
        size: 1.1,
        color: 0x2a2626,
        map: this.texture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    town.group.add(this.flames.points, this.smoke.points);

    this.setWind(Math.random() * Math.PI * 2);
    const pool = [...state.houses].sort(() => Math.random() - 0.5);
    pool.slice(0, cfg.initialFires).forEach((h) => {
      this.ignite(h);
      // Los focos iniciales ya llevan un rato ardiendo: se propagan antes.
      h.spreadTimer *= 0.5;
    });
  }

  setWind(angle) {
    this.wind = { x: Math.cos(angle), z: Math.sin(angle) };
    const idx = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
    state.wind = COMPASS[idx];
    notify();
  }

  canBurn(h) {
    return !h.burning && !h.burnt && !h.wet && !h.destroyed;
  }

  ignite(h) {
    if (!this.canBurn(h)) return false;
    h.burning = true;
    h.spreadTimer = this.cfg.spreadInterval * rand(0.6, 1.3);
    if (!this.engine.threaten(h)) {
      // Casa ya atendida antes (p. ej. evacuada): vuelve a arder sin gente dentro.
      h.threatened = true;
      h.timer = h.maxTimer || this.cfg.timer;
      h.maxTimer = h.timer;
    }
    return true;
  }

  update(dt) {
    if (this.gustTimer > 0) {
      this.gustTimer -= dt;
      if (this.gustTimer <= 0) this.spreadMul = 1;
    }

    const burning = state.houses.filter((h) => h.burning);
    for (const h of burning) {
      h.spreadTimer -= dt * this.spreadMul;
      if (h.spreadTimer > 0) continue;
      h.spreadTimer = this.cfg.spreadInterval * rand(0.7, 1.3);
      this.trySpread(h);
    }

    this.emitAcc += dt;
    while (this.emitAcc > 0.07) {
      this.emitAcc -= 0.07;
      for (const h of burning) {
        this.flames.spawn(
          h.x + rand(-0.55, 0.55), h.y + rand(0.5, 1.5), h.z + rand(-0.5, 0.5),
          this.wind.x * 0.5, rand(1.3, 2.2), this.wind.z * 0.5, rand(0.5, 1),
        );
        if (Math.random() < 0.45) {
          this.smoke.spawn(
            h.x + rand(-0.4, 0.4), h.y + 1.7, h.z + rand(-0.4, 0.4),
            this.wind.x * 1.3, rand(0.9, 1.5), this.wind.z * 1.3, rand(1.8, 2.8),
          );
        }
      }
    }
    this.flames.update(dt);
    this.smoke.update(dt);
  }

  trySpread(from) {
    const candidates = state.houses.filter(
      (h) => this.canBurn(h) && Math.hypot(h.x - from.x, h.z - from.z) < SPREAD_RADIUS,
    );
    if (!candidates.length) return;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const dist = Math.hypot(target.x - from.x, target.z - from.z) || 1;
    const align = ((target.x - from.x) * this.wind.x + (target.z - from.z) * this.wind.z) / dist;
    // A favor del viento el fuego salta casi siempre; en contra, rara vez.
    const chance = align > 0 ? 0.35 + 0.6 * align : 0.14;
    if (Math.random() < chance && this.ignite(target)) {
      this.engine.log(`El fuego saltó de casa ${from.id} a casa ${target.id}.`, 'bad');
    }
  }

  // Apaga la casa y las que ardan dentro del radio; devuelve las casas apagadas.
  extinguish(house, radius) {
    const out = state.houses.filter(
      (h) => h === house || (h.burning && Math.hypot(h.x - house.x, h.z - house.z) < radius),
    );
    for (const h of out) {
      h.burning = false;
      h.wet = true;
      for (let i = 0; i < 10; i++) {
        this.smoke.spawn(h.x + rand(-0.5, 0.5), h.y + 1.2, h.z + rand(-0.5, 0.5), 0, rand(0.8, 1.6), 0, rand(1, 2));
      }
    }
    return out;
  }

  onHouseDown(h) {
    h.burning = false;
    h.burnt = true;
  }

  isOver() {
    return !state.houses.some((h) => h.burning);
  }

  changeWind() {
    this.setWind(Math.random() * Math.PI * 2);
    this.engine.alert('Cambio de viento', `Ahora sopla hacia el ${state.wind}.`, 'warn');
  }

  gusts() {
    this.spreadMul = 1.8;
    this.gustTimer = 15;
    this.engine.alert('Ráfagas fuertes', 'El fuego se propaga más rápido.', 'warn');
  }

  gasExplosion() {
    const burning = state.houses.filter((h) => h.burning);
    if (!burning.length) return;
    const from = burning[Math.floor(Math.random() * burning.length)];
    const near = state.houses
      .filter((h) => this.canBurn(h))
      .sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z))
      .slice(0, 2);
    near.forEach((h) => this.ignite(h));
    this.engine.sceneManager.shake(0.3);
    this.engine.alert('¡Explosión de gas!', `Un tanque estalló cerca de la casa ${from.id}.`, 'bad');
  }

  dispose() {
    this.flames.dispose();
    this.smoke.dispose();
    this.texture.dispose();
  }
}
