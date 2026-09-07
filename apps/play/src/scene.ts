import * as THREE from 'three';
import { followCamera } from './camera-motion';
import { dropDuration, dropProgress, landingScale } from './drop-motion';
import { contour, tileColor, size, WIDTH, type Pavement, type Rotation, type Tile } from '../../../packages/play-core';

function geometry(w: number, h: number) {
  const shape = new THREE.Shape(contour(w, h).map(([x, y]) => new THREE.Vector2(x * 0.958, y * 0.958)));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.17, bevelEnabled: true, bevelSize: 0.024, bevelThickness: 0.045, bevelSegments: 5, steps: 1 });
}
export class PlayScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-4, 4, 8, -8, 0.1, 100);
  private domino = geometry(2, 1);
  private square = geometry(1, 1);
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private settled = new Map<number, THREE.Mesh>();
  private active: THREE.Mesh;
  private ghost: THREE.Mesh;
  private shadow: THREE.Mesh;
  private light: THREE.DirectionalLight;
  private halfHeight = 8;
  private center = 7.4;
  private cameraVelocity = 0;
  private x = 2;
  private rotation: Rotation = 0;
  private spin = 0;
  private controlledY?: number;
  private held = false;
  private started = false;
  private contactTime = 0;
  private paused = false;
  private raf = 0;
  private last = 0;
  private animationTime = 0;
  private dropping?: { from: THREE.Vector3; to: THREE.Vector3; elapsed: number; duration: number; done: () => void };
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private observer: ResizeObserver;
  constructor(private canvas: HTMLCanvasElement, private board: Pavement, private onAutoLand: () => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.07;
    this.scene.add(new THREE.AmbientLight('#fff9e8', 1.5));
    this.light = new THREE.DirectionalLight('#fff8df', 2.6); this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024); this.light.shadow.normalBias = 0.025;
    Object.assign(this.light.shadow.camera, { left: -8, right: 8, top: 24, bottom: -24, far: 60 });
    this.scene.add(this.light, this.light.target);
    const fill = new THREE.DirectionalLight('#d7f0e0', 0.8); fill.position.set(5, -4, 9); this.scene.add(fill);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH + 0.3, 150), new THREE.MeshStandardMaterial({ color: '#f0f0e6', roughness: 1 }));
    this.shadow.position.set(3, 0, -0.1); this.shadow.receiveShadow = true; this.scene.add(this.shadow);
    this.active = new THREE.Mesh(this.domino, this.material('#419872')); this.active.castShadow = true; this.active.receiveShadow = true; this.scene.add(this.active);
    this.ghost = new THREE.Mesh(this.domino, new THREE.MeshBasicMaterial({ color: '#719981', transparent: true, opacity: 0.23, depthWrite: false }));
    this.ghost.scale.z = 0.04; this.scene.add(this.ghost);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
    this.frame(0);
  }
  private material(color: string) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.40, metalness: 0.01 }));
    return this.materials.get(color)!;
  }
  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.halfHeight = 4 * h / w;
    this.camera.top = this.halfHeight; this.camera.bottom = -this.halfHeight; this.camera.updateProjectionMatrix();
    this.center = Math.max(this.halfHeight - 0.6, this.board.height + 0.6);
    this.cameraVelocity = 0;
  }
  get busy() { return this.board.atLimit || !!this.dropping; }
  get cellPixels() { return this.canvas.clientWidth / 8; }
  get activeY() { return this.controlledY ?? this.center + (this.halfHeight - 2.2) / 0.984 - size(this.rotation).h / 2; }
  get canRelease() {
    // Use the tile's lower edge in the current camera, not the finger or world origin.
    const edge = new THREE.Vector3(this.x + size(this.rotation).w / 2, this.activeY, 0.12).project(this.camera);
    // NDC -1 is the bottom and +1 is the top: 75% from bottom is +0.5.
    return edge.y < 0.5;
  }
  start() { this.started = true; }
  beginDrag() { this.start(); this.controlledY = this.activeY; this.held = true; this.contactTime = 0; }
  endDrag() { this.held = false; this.contactTime = 0; }
  lower(distance: number) {
    const bottom = this.activeY;
    this.controlledY = Math.max(this.board.landingFrom(this.x, bottom, this.rotation).y, bottom - Math.max(0, distance));
  }
  aim(x: number, rotation: Rotation) {
    const previousX = this.x;
    const bottom = this.activeY;
    if (rotation !== this.rotation) {
      const kickedX = this.board.rotateAt(this.x, bottom, rotation);
      if (kickedX === undefined) return false;
      this.x = kickedX;
    } else {
      this.x = this.board.moveSide(this.x, bottom, x, rotation);
    }
    if (this.controlledY !== undefined) this.controlledY = bottom;
    this.spin += ((rotation - this.rotation + 4) % 4) * Math.PI / 2;
    if (this.x !== previousX || rotation !== this.rotation) this.contactTime = 0;
    this.rotation = rotation;
    return true;
  }
  get column() { return this.x; }
  spawn() {
    this.held = false; this.contactTime = 0;
    this.controlledY = undefined; this.x = 2; this.rotation = 0; this.spin = Math.ceil(this.spin / (Math.PI * 2)) * Math.PI * 2;
    this.active.position.set(3, this.center + (this.halfHeight - 2.2) / 0.984, 0.12);
    this.active.rotation.z = this.spin;
  }
  drop(done: () => void) {
    if (this.busy) return;
    const p = this.board.landingFrom(this.x, this.activeY, this.rotation);
    this.dropping = {
      from: this.active.position.clone(), to: new THREE.Vector3(p.x + p.w / 2, p.y + p.h / 2, 0),
      elapsed: 0, duration: dropDuration(this.activeY - p.y), done,
    };
    this.ghost.visible = false;
  }
  add(tiles: Tile[]) {
    for (const tile of tiles) {
      const mesh = new THREE.Mesh(tile.white ? this.square : this.domino, this.material(tileColor(tile)));
      mesh.position.set(tile.x + tile.w / 2, tile.y + tile.h / 2, 0);
      mesh.rotation.z = tile.rotation * Math.PI / 2;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.born = this.animationTime; mesh.userData.white = tile.white;
      mesh.userData.baseY = tile.y; mesh.userData.height = tile.h;
      this.scene.add(mesh); this.settled.set(tile.id, mesh);
    }
  }
  pause(value: boolean) { this.paused = value; }
  dispose() {
    cancelAnimationFrame(this.raf); this.observer.disconnect();
    this.domino.dispose(); this.square.dispose(); this.shadow.geometry.dispose();
    (this.shadow.material as THREE.Material).dispose(); (this.ghost.material as THREE.Material).dispose();
    this.materials.forEach(material => material.dispose()); this.renderer.dispose();
  }
  private frame = (now: number) => {
    const dt = this.paused ? 0 : Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.animationTime += dt;
    const targetCenter = Math.max(this.halfHeight - 0.6, this.board.height + 0.6);
    const oldCenter = this.center;
    if (dt > 0) {
      const next = followCamera(this.center, this.cameraVelocity, targetCenter, dt);
      this.center = this.reduced ? targetCenter : next.position;
      this.cameraVelocity = this.reduced ? 0 : next.velocity;
    }
    if (this.controlledY !== undefined) this.controlledY += this.center - oldCenter;
    if (!this.dropping && !this.held) this.board.advanceFloor(Math.max(0, Math.floor(this.center - this.halfHeight + 0.5)));
    this.camera.position.set(3, this.center - 4, 22); this.camera.up.set(0, 1, 0); this.camera.lookAt(3, this.center, 0);
    this.shadow.position.y = this.center;
    this.light.position.set(-3, this.center + 7, 12); this.light.target.position.set(3, this.center, 0);
    this.active.visible = !this.board.atLimit;
    if (!this.board.atLimit && this.started && !this.held && !this.dropping && dt > 0) {
      const bottom = this.board.landingFrom(this.x, this.activeY, this.rotation).y;
      this.controlledY = Math.max(bottom, this.activeY - dt * 1.1);
      this.contactTime = this.controlledY <= bottom + 0.00001 ? this.contactTime + dt : 0;
      if (this.contactTime >= 0.45) { this.contactTime = 0; this.onAutoLand(); }
    }
    const p = this.board.landingFrom(this.x, this.activeY, this.rotation);
    this.ghost.position.set(p.x + p.w / 2, p.y + p.h / 2, 0.015); this.ghost.rotation.z = this.spin;
    if (this.dropping) {
      const drop = this.dropping; drop.elapsed += dt;
      const t = Math.min(1, drop.elapsed / (this.reduced ? 0.01 : drop.duration));
      this.active.position.lerpVectors(drop.from, drop.to, dropProgress(t));
      if (t === 1) { this.dropping = undefined; drop.done(); }
    } else {
      const targetX = p.x + p.w / 2;
      this.active.position.x += (targetX - this.active.position.x) * (this.reduced ? 1 : 1 - Math.exp(-dt * 26));
      this.active.position.y = this.activeY + size(this.rotation).h / 2;
      this.active.position.z = 0.12;
      this.ghost.visible = !this.board.atLimit;
    }
    this.active.rotation.z += (this.spin - this.active.rotation.z) * (this.reduced ? 1 : 1 - Math.exp(-dt * 28));
    for (const [id, mesh] of this.settled) {
      if (mesh.position.y < this.center - this.halfHeight - 3) { this.scene.remove(mesh); this.settled.delete(id); continue; }
      const age = this.animationTime - mesh.userData.born;
      if (mesh.userData.white && age < 0.4 && !this.reduced) {
        const t = age / 0.4; mesh.scale.setScalar(Math.max(0.01, 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2));
        mesh.position.z = Math.sin(t * Math.PI) * 0.16;
      } else {
        const squash = mesh.userData.white || this.reduced ? 1 : landingScale(age);
        // Local X points vertically after a quarter turn; squeeze in board Y either way.
        const vertical = mesh.userData.height === 2;
        mesh.scale.set(vertical ? squash : 1, vertical ? 1 : squash, squash);
        mesh.position.y = mesh.userData.baseY + mesh.userData.height * squash / 2;
        mesh.position.z = 0;
      }
    }
    this.renderer.render(this.scene, this.camera); this.raf = requestAnimationFrame(this.frame);
  };
}
