// Renderer, cámara, luces, OrbitControls y resize.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const HOME_TARGET = new THREE.Vector3(-1, 0.6, 0);
const HOME_OFFSET = new THREE.Vector3(24, 25, 27);
const FOCUS_DISTANCE = 17;
const TWEEN_TIME = 0.7;

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = 0;
    this.height = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    this.camera.position.copy(HOME_TARGET).add(HOME_OFFSET);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(HOME_TARGET);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 85;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = 1.3;
    this.controls.addEventListener('start', () => (this.tween = null));

    this.scene.add(new THREE.HemisphereLight(0xfff3e0, 0x4a3038, 1.5));
    const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
    sun.position.set(-14, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);

    this.tween = null;
    this.shakeAmp = 0;
    this.shakeOffset = new THREE.Vector3();

    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
    if (!w || !h || (w === this.width && h === this.height)) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  moveTo(target, position) {
    this.tween = {
      t: 0,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromPos: this.camera.position.clone().sub(this.shakeOffset),
      toPos: position,
    };
  }

  focusOn(x, y, z) {
    const target = new THREE.Vector3(x, y, z);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.moveTo(target, target.clone().addScaledVector(dir, FOCUS_DISTANCE));
  }

  overview() {
    // En pantallas verticales se aleja la cámara para que quepa el pueblo.
    const scale = Math.min(1.9, Math.max(1, 1.15 / (this.camera.aspect || 1)));
    this.moveTo(HOME_TARGET.clone(), HOME_TARGET.clone().addScaledVector(HOME_OFFSET, scale));
  }

  shake(amount) {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
  }

  update(dt) {
    this.camera.position.sub(this.shakeOffset);

    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / TWEEN_TIME);
      const k = tw.t * tw.t * (3 - 2 * tw.t);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();

    if (this.shakeAmp > 0.004) {
      this.shakeOffset
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .multiplyScalar(this.shakeAmp * 2);
      this.shakeAmp *= Math.exp(-dt * 2.4);
    } else {
      this.shakeAmp = 0;
      this.shakeOffset.set(0, 0, 0);
    }
    this.camera.position.add(this.shakeOffset);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
