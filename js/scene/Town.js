// Terreno, río, calles, árboles, base, refugio y generación de casas.
import * as THREE from 'three';
import { House } from './House.js';

export const ROADS_X = [-8, 0, 8];
export const BASE = { x: 15.3, z: -3.1 };
export const BASE_EXIT = { x: 14.2, z: 0 };
export const SHELTER = { x: 15.3, z: 3.2 };
export const RIVER_Y = -0.35;

const ROWS_Z = [-8.4, -3.6, 3.6, 8.4];
const X_MIN = -20;
const X_MAX = 18;
const Z_MIN = -16;
const Z_MAX = 16;
const FLOOR_Y = -1.1;

const rand = (a, b) => a + Math.random() * (b - a);

// El terreno sube desde el río (oeste) hacia la base (este).
export function heightAt(x, z) {
  if (x < -13) {
    const t = Math.min(1, (-13 - x) / 2.5);
    return FLOOR_Y * t * t * (3 - 2 * t);
  }
  const k = Math.min(1, (x + 13) / 3);
  return 0.11 * (x + 13) + k * (0.28 * Math.sin(z * 0.24 + 0.8) + 0.12 * Math.cos(x * 0.6 + z * 0.35));
}

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });

export class Town {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.river = null;
    this.houses = new Map();
    this.pickables = [];
  }

  build() {
    this.dispose();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.houses = new Map();
    this.pickables = [];

    this.addTerrain();
    this.addRoads();
    this.addStations();

    const data = [];
    let id = 1;
    for (const roadX of ROADS_X) {
      for (const side of [-1, 1]) {
        for (const rowZ of ROWS_Z) {
          const x = roadX + side * 2.3 + rand(-0.2, 0.2);
          const z = rowZ + rand(-0.4, 0.4);
          const people = 2 + Math.floor(Math.random() * 5);
          const house = {
            id: id++,
            x,
            z,
            y: heightAt(x, z),
            roadX,
            side,
            people,
            initialPeople: people,
            status: 'safe',
            threatened: false,
            touched: false,
            destroyed: false,
            timer: 0,
            maxTimer: 0,
            ops: 0,
            incoming: 0,
            tilt: 0,
            burning: false,
            burnt: false,
            wet: false,
            stabilized: false,
          };
          const view = new House(house);
          this.group.add(view.group);
          this.houses.set(house.id, view);
          this.pickables.push(...view.pickables);
          data.push(house);
        }
      }
    }
    this.addTrees(data);
    return data;
  }

  dispose() {
    if (!this.group) return;
    this.group.traverse((obj) => {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((m) => m?.dispose());
    });
    this.scene.remove(this.group);
    this.group = null;
  }

  update(time, selectedId, waterY) {
    this.houses.forEach((view, id) => view.update(time, id === selectedId, waterY));
  }

  addTerrain() {
    const w = X_MAX - X_MIN;
    const d = Z_MAX - Z_MIN;
    const geo = new THREE.PlaneGeometry(w, d, w, d);
    geo.rotateX(-Math.PI / 2);
    geo.translate((X_MIN + X_MAX) / 2, 0, 0);
    const pos = geo.attributes.position;
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = heightAt(pos.getX(i), pos.getZ(i));
      pos.setY(i, y);
      if (y < -0.15) color.setHex(0x9a8a62);
      else color.setHex(0x6fae4e).lerp(new THREE.Color(0x8bc661), Math.random());
      colors.push(color.r, color.g, color.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, mat(0xffffff, { vertexColors: true }));
    terrain.receiveShadow = true;
    this.group.add(terrain);

    // Faldón y base para que el pueblo se vea como una maqueta.
    const perimeter = [];
    for (let x = X_MIN; x <= X_MAX; x++) perimeter.push([x, Z_MIN]);
    for (let z = Z_MIN + 1; z <= Z_MAX; z++) perimeter.push([X_MAX, z]);
    for (let x = X_MAX - 1; x >= X_MIN; x--) perimeter.push([x, Z_MAX]);
    for (let z = Z_MAX - 1; z >= Z_MIN; z--) perimeter.push([X_MIN, z]);
    const verts = [];
    for (let i = 0; i < perimeter.length - 1; i++) {
      const [x1, z1] = perimeter[i];
      const [x2, z2] = perimeter[i + 1];
      const y1 = heightAt(x1, z1);
      const y2 = heightAt(x2, z2);
      verts.push(x1, y1, z1, x1, FLOOR_Y, z1, x2, y2, z2, x2, y2, z2, x1, FLOOR_Y, z1, x2, FLOOR_Y, z2);
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    skirtGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(skirtGeo, mat(0x7a5a3c, { side: THREE.DoubleSide })));

    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), mat(0x5c4330));
    slab.position.set((X_MIN + X_MAX) / 2, FLOOR_Y - 0.6, 0);
    this.group.add(slab);

    this.river = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, d),
      mat(0x3a8fd6, { transparent: true, opacity: 0.8, roughness: 0.3 }),
    );
    this.river.rotation.x = -Math.PI / 2;
    this.river.position.set(X_MIN + 3.8, RIVER_Y, 0);
    this.group.add(this.river);
  }

  // Cinta que sigue el relieve entre dos puntos.
  ribbon(x1, z1, x2, z2, width, material) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const segs = Math.ceil(len);
    const nx = (-(z2 - z1) / len) * (width / 2);
    const nz = ((x2 - x1) / len) * (width / 2);
    const verts = [];
    const index = [];
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const x = x1 + (x2 - x1) * f;
      const z = z1 + (z2 - z1) * f;
      verts.push(x + nx, heightAt(x + nx, z + nz) + 0.05, z + nz);
      verts.push(x - nx, heightAt(x - nx, z - nz) + 0.05, z - nz);
      if (i < segs) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  addRoads() {
    const asphalt = mat(0x4d4a50, { side: THREE.DoubleSide });
    for (const x of ROADS_X) this.ribbon(x, -11.6, x, 11.6, 1.5, asphalt);
    this.ribbon(-12, 0, 16.6, 0, 1.6, asphalt);
  }

  box(w, h, d, color, x, y, z, parent = this.group) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  addStations() {
    // Base de operaciones: estación roja con helipuerto.
    const baseY = heightAt(BASE.x, BASE.z) + 0.2;
    this.box(4.6, 1.6, 4, 0x8d8780, BASE.x, baseY - 0.8, BASE.z);
    this.box(2.4, 1.3, 1.8, 0xc0392b, BASE.x + 0.7, baseY + 0.65, BASE.z - 0.8);
    this.box(2.5, 0.15, 1.9, 0xf7f1e3, BASE.x + 0.7, baseY + 1.37, BASE.z - 0.8);
    this.box(0.7, 0.8, 0.06, 0x2e2a2c, BASE.x + 0.2, baseY + 0.4, BASE.z + 0.12);
    this.box(0.7, 0.8, 0.06, 0x2e2a2c, BASE.x + 1.2, baseY + 0.4, BASE.z + 0.12);
    this.box(0.07, 1.6, 0.07, 0xdddddd, BASE.x + 1.9, baseY + 2.1, BASE.z - 1.6);
    this.box(0.5, 0.3, 0.04, 0xffd60a, BASE.x + 2.15, baseY + 2.7, BASE.z - 1.6);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), mat(0xf2c200));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(BASE.x - 1.2, baseY + 0.02, BASE.z - 0.6);
    this.group.add(pad);

    // Refugio: carpa grande verde.
    const shY = heightAt(SHELTER.x, SHELTER.z) + 0.2;
    this.box(4.6, 1.6, 4, 0x8d8780, SHELTER.x, shY - 0.8, SHELTER.z);
    this.box(3, 0.9, 2.2, 0xe9efe4, SHELTER.x, shY + 0.45, SHELTER.z + 0.2);
    const tentGeo = new THREE.CylinderGeometry(1.35, 1.35, 3.1, 3);
    tentGeo.rotateY(Math.PI / 2);
    const tent = new THREE.Mesh(tentGeo, mat(0x3f9b5a));
    tent.rotation.z = Math.PI / 2;
    tent.scale.set(0.62, 1, 1);
    tent.position.set(SHELTER.x, shY + 1.32, SHELTER.z + 0.2);
    tent.castShadow = true;
    this.group.add(tent);
  }

  addTrees(houses) {
    const trunkGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.5, 5);
    const leafGeo = new THREE.ConeGeometry(0.5, 1.2, 6);
    const trunkMat = mat(0x6b4a2b);
    const leafMats = [mat(0x2f7d3b), mat(0x3c9447), mat(0x27693a)];
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < 46; tries++) {
      const x = rand(-12, X_MAX - 0.8);
      const z = rand(Z_MIN + 0.8, Z_MAX - 0.8);
      if (Math.abs(z) < 1.5) continue;
      if (ROADS_X.some((rx) => Math.abs(x - rx) < 1.3 && Math.abs(z) < 12)) continue;
      if (x > 12.4 && Math.abs(z) < 6) continue;
      if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 1.7)) continue;
      const y = heightAt(x, z);
      const s = rand(0.75, 1.25);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, y + 0.25 * s, z);
      trunk.scale.setScalar(s);
      const leaves = new THREE.Mesh(leafGeo, leafMats[placed % leafMats.length]);
      leaves.position.set(x, y + 1.05 * s, z);
      leaves.scale.setScalar(s);
      leaves.castShadow = true;
      this.group.add(trunk, leaves);
      placed++;
    }
  }
}
