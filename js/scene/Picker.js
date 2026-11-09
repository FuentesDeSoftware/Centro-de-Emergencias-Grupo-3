// Selección de casas por raycasting (clic sin arrastre).
import * as THREE from 'three';

const DRAG_TOLERANCE = 6;

export class Picker {
  constructor(sceneManager, town, onPick) {
    this.sceneManager = sceneManager;
    this.town = town;
    this.onPick = onPick;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.down = null;

    const canvas = sceneManager.canvas;
    canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_TOLERANCE) return;
      this.pick(e);
    });
  }

  pick(e) {
    const rect = this.sceneManager.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
    const hit = this.raycaster.intersectObjects(this.town.pickables, false)[0];
    this.onPick(hit ? hit.object.userData.houseId : null);
  }
}
