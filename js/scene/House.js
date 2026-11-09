// Casa low-poly con estados visuales y resaltado de selección.
import * as THREE from 'three';

const WALLS = [0xf3e9d2, 0xe8dcc0, 0xf7f1e3, 0xe6d3b3];
const ROOFS = [0xc0392b, 0xb8322a, 0xd04a35];
const RING_COLORS = {
  risk: 0xffb703,
  critical: 0xff3b30,
  lost: 0x6b6b6b,
  evacuated: 0x3ddc84,
  protected: 0x3ddc84,
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class House {
  constructor(data) {
    this.data = data;
    this.lastStatus = null;
    this.darkened = false;

    this.group = new THREE.Group();
    this.group.position.set(data.x, data.y, data.z);
    // La puerta mira hacia la calle.
    this.group.rotation.y = data.side > 0 ? -Math.PI / 2 : Math.PI / 2;

    this.wallMat = new THREE.MeshStandardMaterial({ color: pick(WALLS), flatShading: true, roughness: 0.9 });
    this.roofMat = new THREE.MeshStandardMaterial({ color: pick(ROOFS), flatShading: true, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a3a, flatShading: true });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8d8780, flatShading: true });

    const wall = this.mesh(new THREE.BoxGeometry(1.5, 1, 1.25), this.wallMat, 0, 0.5, 0);
    const roof = this.mesh(new THREE.ConeGeometry(1.2, 0.75, 4), this.roofMat, 0, 1.37, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.86;
    this.mesh(new THREE.BoxGeometry(1.62, 0.9, 1.37), stoneMat, 0, -0.44, 0);
    this.mesh(new THREE.BoxGeometry(0.3, 0.5, 0.06), darkMat, 0, 0.25, 0.63);
    this.mesh(new THREE.BoxGeometry(0.28, 0.26, 0.06), darkMat, -0.48, 0.58, 0.63);
    this.mesh(new THREE.BoxGeometry(0.28, 0.26, 0.06), darkMat, 0.48, 0.58, 0.63);
    this.mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), this.roofMat, 0.42, 1.4, -0.15);

    wall.userData.houseId = data.id;
    roof.userData.houseId = data.id;
    this.pickables = [wall, roof];

    this.ring = this.makeRing(1.2, 1.48);
    this.selectRing = this.makeRing(1.62, 1.8);
    this.selectRing.material.color.setHex(0xffffff);
  }

  mesh(geometry, material, x, y, z) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  makeRing(inner, outer) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 28),
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    this.group.add(ring);
    return ring;
  }

  update(time, selected, waterY) {
    const d = this.data;

    if (d.status !== this.lastStatus) {
      this.lastStatus = d.status;
      const color = RING_COLORS[d.status];
      this.ring.visible = color !== undefined;
      if (color !== undefined) this.ring.material.color.setHex(color);
    }
    if (!this.darkened && (d.status === 'lost' || d.burnt)) {
      this.darkened = true;
      this.wallMat.color.multiplyScalar(d.burnt ? 0.22 : 0.4);
      this.roofMat.color.multiplyScalar(d.burnt ? 0.22 : 0.4);
    }

    // Los anillos flotan sobre el agua si la casa está inundada.
    const ringY = waterY === null ? 0.08 : Math.max(0.08, waterY - d.y + 0.07);
    this.ring.position.y = ringY;
    this.selectRing.position.y = ringY + 0.01;
    this.selectRing.visible = selected;

    if (d.status === 'critical') this.ring.material.opacity = 0.55 + 0.45 * Math.sin(time * 9);
    else if (d.status === 'risk') this.ring.material.opacity = 0.6 + 0.25 * Math.sin(time * 3.5);
    else this.ring.material.opacity = 0.75;
    this.selectRing.material.opacity = 0.7 + 0.3 * Math.sin(time * 5);

    if (d.burning) {
      this.wallMat.emissive.setHex(0xff4a00);
      this.wallMat.emissiveIntensity = 0.45 + 0.3 * Math.sin(time * 14 + d.id);
    } else {
      this.wallMat.emissiveIntensity = 0;
    }

    this.group.rotation.z += (d.tilt - this.group.rotation.z) * 0.15;
  }
}
