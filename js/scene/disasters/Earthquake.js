// Terremoto: sacudidas, casas dañadas con escombros y réplicas periódicas.
import * as THREE from 'three';
import { state } from '../../core/state.js';
import { audio } from '../../core/audio.js';
import { heightAt } from '../Town.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Earthquake {
  constructor({ engine, town, sceneManager, cfg }) {
    this.engine = engine;
    this.town = town;
    this.sceneManager = sceneManager;
    this.cfg = cfg;
    this.remaining = cfg.aftershocks;
    this.next = cfg.aftershockInterval;
    this.debrisGeo = new THREE.BoxGeometry(0.28, 0.18, 0.22);
    this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x6f6259, flatShading: true });

    sceneManager.shake(0.6);
    audio.rumble();
    engine.log('Sismo principal: se reportan casas colapsadas.', 'bad');
    this.damageRandom(cfg.initialDamaged);
  }

  damageRandom(count) {
    const intact = state.houses.filter((h) => !h.touched).sort(() => Math.random() - 0.5);
    intact.slice(0, count).forEach((h) => this.damage(h));
    return Math.min(count, intact.length);
  }

  damage(h) {
    if (!this.engine.threaten(h)) return;
    h.tilt = rand(0.08, 0.2) * (Math.random() < 0.5 ? -1 : 1);
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = rand(0.9, 1.5);
      const x = h.x + Math.cos(angle) * r;
      const z = h.z + Math.sin(angle) * r;
      const piece = new THREE.Mesh(this.debrisGeo, this.debrisMat);
      piece.position.set(x, heightAt(x, z) + 0.08, z);
      piece.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      piece.scale.setScalar(rand(0.6, 1.4));
      piece.castShadow = true;
      this.town.group.add(piece);
    }
  }

  // `extra` indica una réplica disparada por un evento aleatorio (no descuenta las programadas).
  aftershock(extra = false) {
    const magnitude = rand(4.6, 6).toFixed(1);
    this.sceneManager.shake(0.25 + (magnitude - 4.6) * 0.25);
    audio.rumble();
    const damaged = this.damageRandom(this.cfg.aftershockDamage);
    for (const h of state.houses) {
      if (h.threatened && !h.stabilized && h.ops === 0) h.timer *= 0.8;
    }
    if (!extra) this.remaining -= 1;
    const detail = damaged ? `${damaged} casa(s) más con daños.` : 'Las estructuras dañadas se debilitan.';
    this.engine.alert(`Réplica ${magnitude}`, detail, 'bad');
  }

  update(dt) {
    if (this.remaining <= 0) return;
    this.next -= dt;
    if (this.next > 0) return;
    this.next = this.cfg.aftershockInterval * rand(0.8, 1.2);
    this.aftershock();
  }

  isOver() {
    return this.remaining <= 0;
  }

  dispose() {
    this.debrisGeo.dispose();
    this.debrisMat.dispose();
  }
}
