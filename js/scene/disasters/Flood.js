// Inundación: agua animada que sube y alcanza primero las casas bajas.
import * as THREE from 'three';
import { state } from '../../core/state.js';
import { RIVER_Y } from '../Town.js';

const REACH_MARGIN = 0.1;

export class Flood {
  constructor({ engine, town, cfg }) {
    this.engine = engine;
    this.town = town;
    this.time = 0;
    this.rateMul = 1;
    this.mulTimer = 0;
    this.dikeBroken = false;

    const heights = state.houses.map((h) => h.y).sort((a, b) => a - b);
    const count = Math.max(1, Math.round(heights.length * cfg.affected));
    this.top = heights[heights.length - 1] + 0.2;
    this.max = Math.min(this.top, heights[count - 1] + 0.2);
    // Arranca justo por debajo de la casa más baja para que la emergencia empiece pronto.
    this.level = Math.max(RIVER_Y, heights[0] - 0.12);
    this.rate = (this.max - this.level) / cfg.riseTime;

    const geo = new THREE.PlaneGeometry(38, 32, 26, 22);
    geo.rotateX(-Math.PI / 2);
    geo.translate(-1, 0, 0);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0x2f7fd0,
        transparent: true,
        opacity: 0.8,
        flatShading: true,
        roughness: 0.25,
        metalness: 0.1,
      }),
    );
    this.mesh.position.y = this.level;
    this.mesh.receiveShadow = true;
    town.river.visible = false;
    town.group.add(this.mesh);
  }

  get waterY() {
    return this.level;
  }

  update(dt) {
    this.time += dt;
    if (this.mulTimer > 0) {
      this.mulTimer -= dt;
      if (this.mulTimer <= 0) this.rateMul = 1;
    }
    this.level = Math.min(this.max, this.level + this.rate * this.rateMul * dt);
    this.mesh.position.y = this.level;

    const pos = this.mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, Math.sin(pos.getX(i) * 0.9 + this.time * 1.6) * 0.035 + Math.cos(pos.getZ(i) * 0.8 + this.time * 1.2) * 0.035);
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();

    for (const h of state.houses) {
      if (!h.touched && this.level > h.y + REACH_MARGIN) this.engine.threaten(h);
    }
  }

  isOver() {
    return this.level >= this.max - 0.001;
  }

  breakDike() {
    if (this.dikeBroken) return this.heavyRain();
    this.dikeBroken = true;
    this.max = Math.min(this.top, this.max + 0.25);
    this.level = Math.min(this.max, this.level + 0.22);
    this.engine.sceneManager.shake(0.25);
    this.engine.alert('¡Se rompió el dique!', 'El agua sube de golpe y alcanzará más casas.', 'bad');
  }

  heavyRain() {
    this.rateMul = 1.8;
    this.mulTimer = 14;
    this.engine.alert('Lluvia intensa', 'El nivel del agua sube más rápido.', 'warn');
  }

  lull() {
    this.rateMul = 0.25;
    this.mulTimer = 10;
    this.engine.alert('Baja la lluvia', 'El agua sube más lento por unos minutos.', 'good');
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
    if (this.town.river) this.town.river.visible = true;
  }
}
