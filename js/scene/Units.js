// Vehículos y brigadas: salen de la base, operan en la casa y regresan.
import * as THREE from 'three';
import { state } from '../core/state.js';
import { heightAt, BASE, BASE_EXIT } from './Town.js';

function part(geometry, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

const box = (w, h, d, color, x, y, z) => part(new THREE.BoxGeometry(w, h, d), color, x, y, z);

function wheels(group, zFront, zBack) {
  for (const x of [-0.33, 0.33]) {
    for (const z of [zFront, zBack]) group.add(box(0.12, 0.24, 0.24, 0x1d1b1c, x, 0.12, z));
  }
}

function team(color) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.22, 0.1], [0.22, 0.05], [0, -0.22]]) {
    g.add(box(0.18, 0.34, 0.16, color, x, 0.17, z));
    g.add(part(new THREE.SphereGeometry(0.1, 6, 5), 0xf2c9a0, x, 0.44, z));
    g.add(box(0.2, 0.06, 0.2, 0xffd60a, x, 0.55, z));
  }
  return g;
}

// Todos los modelos miran hacia +Z.
const BUILDERS = {
  team: () => team(0xff7b00),
  firefighters: () => team(0xa32a22),
  boat() {
    const g = new THREE.Group();
    g.add(box(0.62, 0.22, 1.35, 0xff6b00, 0, 0.14, 0));
    g.add(box(0.44, 0.2, 0.3, 0xff6b00, 0, 0.14, 0.78));
    g.add(box(0.4, 0.26, 0.42, 0xf7f1e3, 0, 0.38, -0.2));
    return g;
  },
  truck() {
    const g = new THREE.Group();
    g.add(box(0.6, 0.42, 0.42, 0xc0392b, 0, 0.42, 0.5));
    const tank = part(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 8), 0xc9ced3, 0, 0.5, -0.2);
    tank.rotation.x = Math.PI / 2;
    g.add(tank);
    g.add(box(0.62, 0.12, 1.4, 0x8f1e16, 0, 0.2, 0));
    wheels(g, 0.42, -0.42);
    return g;
  },
  ambulance() {
    const g = new THREE.Group();
    g.add(box(0.62, 0.52, 0.95, 0xf7f7f7, 0, 0.46, -0.15));
    g.add(box(0.6, 0.38, 0.4, 0xf7f7f7, 0, 0.39, 0.5));
    g.add(box(0.64, 0.1, 0.97, 0xd62839, 0, 0.42, -0.15));
    g.add(box(0.2, 0.08, 0.12, 0x2f7fd0, 0, 0.76, 0.1));
    wheels(g, 0.42, -0.42);
    return g;
  },
  excavator() {
    const g = new THREE.Group();
    g.add(box(0.7, 0.2, 1.1, 0x2e2a2c, 0, 0.1, 0));
    g.add(box(0.56, 0.4, 0.6, 0xf2b705, 0, 0.42, -0.15));
    const arm = box(0.12, 0.12, 0.9, 0xf2b705, 0, 0.7, 0.45);
    arm.rotation.x = -0.5;
    g.add(arm);
    g.add(box(0.26, 0.22, 0.2, 0x2e2a2c, 0, 0.42, 0.9));
    return g;
  },
  heli() {
    const g = new THREE.Group();
    g.add(box(0.5, 0.45, 0.9, 0xd62839, 0, 0.3, 0));
    g.add(box(0.14, 0.14, 0.8, 0xd62839, 0, 0.36, -0.8));
    g.add(box(0.4, 0.24, 0.3, 0x9fd3ff, 0, 0.34, 0.5));
    const rotor = box(1.9, 0.03, 0.12, 0x2e2a2c, 0, 0.58, 0);
    g.add(rotor);
    const drop = part(new THREE.ConeGeometry(0.5, 1.6, 8, 1, true), 0x5bb4ff, 0, -0.75, 0);
    drop.material.transparent = true;
    drop.material.opacity = 0.6;
    drop.castShadow = false;
    drop.visible = false;
    g.add(drop);
    g.userData = { rotor, drop };
    return g;
  },
};

function buildPath(house, fly) {
  if (fly) return [[BASE.x - 1.2, BASE.z - 0.6], [house.x, house.z]];
  // Por tierra (o agua) se sigue la calle principal y luego la calle de la casa.
  const j = (Math.random() - 0.5) * 0.5;
  return [
    [BASE_EXIT.x, BASE_EXIT.z + j],
    [house.roadX + j, BASE_EXIT.z + j],
    [house.roadX + j, house.z],
    [house.roadX + house.side * 1.1, house.z],
  ];
}

export class Units {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  send(order) {
    const { res, house } = order;
    const fly = res.unit === 'heli';
    const pts = buildPath(house, fly);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const mesh = BUILDERS[res.unit]();
    this.scene.add(mesh);
    const unit = { mesh, order, pts, cum, len: cum[cum.length - 1], s: 0, phase: 'go', t: 0, fly, bob: 0 };
    this.place(unit, null);
    this.active.push(unit);
  }

  update(dt, waterY) {
    for (const u of this.active) {
      u.bob += dt;
      if (u.phase === 'op') {
        u.t -= dt;
        if (u.t <= 0) {
          u.order.onDone();
          u.phase = 'back';
          if (u.fly) u.mesh.userData.drop.visible = false;
        }
      } else {
        const dir = u.phase === 'go' ? 1 : -1;
        u.s += dir * u.order.res.speed * state.unitSpeedMul * dt;
        if (u.phase === 'go' && u.s >= u.len) {
          u.s = u.len;
          if (u.order.onArrive()) {
            u.phase = 'op';
            u.t = u.order.res.opTime;
            if (u.fly) u.mesh.userData.drop.visible = true;
          } else {
            u.phase = 'back';
          }
        } else if (u.phase === 'back' && u.s <= 0) {
          u.order.onReturn();
          u.done = true;
        }
      }
      this.place(u, waterY);
    }
    this.active = this.active.filter((u) => {
      if (u.done) this.remove(u);
      return !u.done;
    });
  }

  place(u, waterY) {
    const s = Math.min(u.len, Math.max(0, u.s));
    let i = 0;
    while (i < u.cum.length - 2 && s > u.cum[i + 1]) i++;
    const a = u.pts[i];
    const b = u.pts[i + 1];
    const f = (s - u.cum[i]) / (u.cum[i + 1] - u.cum[i] || 1);
    const x = a[0] + (b[0] - a[0]) * f;
    const z = a[1] + (b[1] - a[1]) * f;

    let y = heightAt(x, z);
    if (waterY !== null) y = Math.max(y, waterY);
    if (u.fly) {
      // Despega, vuela alto y desciende sobre el objetivo.
      y += 1.4 + 4 * Math.min(1, s / 3, (u.len - s) / 3 + 0.25);
      u.mesh.userData.rotor.rotation.y = u.bob * 25;
    } else {
      y += 0.04 + (u.phase === 'op' ? Math.abs(Math.sin(u.bob * 6)) * 0.08 : 0);
    }
    u.mesh.position.set(x, y, z);

    const dir = u.phase === 'back' ? -1 : 1;
    const dx = (b[0] - a[0]) * dir;
    const dz = (b[1] - a[1]) * dir;
    if (dx || dz) u.mesh.rotation.y = Math.atan2(dx, dz);
  }

  remove(u) {
    u.mesh.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
    this.scene.remove(u.mesh);
  }

  clear() {
    this.active.forEach((u) => this.remove(u));
    this.active = [];
  }
}
