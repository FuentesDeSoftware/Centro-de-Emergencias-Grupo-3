// Etiquetas flotantes HTML proyectadas desde posiciones 3D.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { heightAt, BASE, SHELTER } from './Town.js';

const FINAL_TEXT = { lost: '✖ Perdida', evacuated: '✔ Evacuada', protected: '✔ Protegida' };

export class Labels {
  constructor(container, sceneManager) {
    this.container = container;
    this.sceneManager = sceneManager;
    this.vec = new THREE.Vector3();
    this.items = new Map();
    this.base = null;
    this.shelter = null;
  }

  reset() {
    this.container.innerHTML = '';
    this.items = new Map();
    this.base = this.create('label station');
    this.base.el.textContent = '🚒 Base';
    this.shelter = this.create('label station');
  }

  create(className) {
    const el = document.createElement('div');
    el.className = className;
    this.container.appendChild(el);
    return { el, key: '' };
  }

  place(item, x, y, z) {
    const { camera, width, height } = this.sceneManager;
    this.vec.set(x, y, z).project(camera);
    const visible = this.vec.z < 1 && Math.abs(this.vec.x) < 1.1 && Math.abs(this.vec.y) < 1.1;
    item.el.style.display = visible ? '' : 'none';
    if (!visible) return;
    const px = (this.vec.x * 0.5 + 0.5) * width;
    const py = (-this.vec.y * 0.5 + 0.5) * height;
    item.el.style.transform = `translate(-50%, -100%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
  }

  update() {
    if (!this.base) return;
    this.place(this.base, BASE.x + 0.7, heightAt(BASE.x, BASE.z) + 2.4, BASE.z - 0.8);

    const shelterText = `⛺ Refugio ${state.shelter.used}/${state.shelter.capacity}`;
    if (this.shelter.key !== shelterText) {
      this.shelter.key = shelterText;
      this.shelter.el.textContent = shelterText;
      this.shelter.el.classList.toggle('full', state.shelter.used >= state.shelter.capacity);
    }
    this.place(this.shelter, SHELTER.x, heightAt(SHELTER.x, SHELTER.z) + 2.7, SHELTER.z);

    for (const h of state.houses) {
      const selected = h.id === state.selectedHouseId;
      let item = this.items.get(h.id);
      if (!h.touched && !selected) {
        if (item) item.el.style.display = 'none';
        continue;
      }
      if (!item) {
        item = this.create('label');
        this.items.set(h.id, item);
      }

      const active = h.threatened && h.people > 0;
      const pct = h.maxTimer ? Math.round((h.timer / h.maxTimer) * 20) * 5 : 100;
      const key = `${h.status}|${h.people}|${active ? pct : ''}|${selected}|${h.incoming}`;
      if (item.key !== key) {
        item.key = key;
        item.el.className = `label ${h.status}${selected ? ' selected' : ''}`;
        if (active) {
          const incoming = h.incoming > 0 ? ` <span class="incoming">▸${h.incoming}</span>` : '';
          item.el.innerHTML = `<span>👥 ${h.people}${incoming}</span><div class="bar"><i style="width:${pct}%"></i></div>`;
        } else {
          item.el.textContent = FINAL_TEXT[h.status] || `👥 ${h.people}`;
        }
      }
      this.place(item, h.x, h.y + 2.1, h.z);
    }
  }
}
