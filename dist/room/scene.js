import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import { createCityMaterial, createRainGlassMaterial } from './shaders.js';

// Units are metres. The back wall sits at z = WALL_Z; the camera looks at it from +z.
export const DESK_Y = 0.79;
const WALL_Z = -1.15;
const WIN = { x0: -1.25, x1: 0.45, y0: 1.05, y1: 2.25 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const HOVER_GLOW = new THREE.Color('#ff9c6b');

const std = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...options });
const rbox = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, r);
const basic = (color, intensity = 1, options = {}) => {
  const material = new THREE.MeshBasicMaterial({ color, ...options });
  material.color.multiplyScalar(intensity);
  return material;
};

function add(parent, geometry, material, [x = 0, y = 0, z = 0] = []) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function rod(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

const PROJECTS = [
  { key: 'class-management', title: 'Class Management', tag: 'SaaS', index: '01' },
  { key: 'boxtravel', title: 'BoxTravel', tag: 'Creator', index: '02' },
  { key: 'carie', title: 'Carie + Mentors', tag: 'AI', index: '03' },
  { key: 'tree-shop', title: 'Tree Shop', tag: 'Commerce', index: '04' }
];

export function buildRoom({ portrait }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05060b');
  scene.fog = new THREE.Fog('#05060b', 7, 17);

  const items = [];
  const markers = [];
  const tickers = [];
  const noShadow = new Set();

  // Every clickable object registers here. `apply(h, t)` animates it from 0 (rest) to 1 (hovered).
  const register = (item) => {
    item.hover = 0;
    item.materials = [];
    item.object.traverse((child) => {
      if (!child.isMesh) return;
      child.userData.item = item;
      const list = Array.isArray(child.material) ? child.material : [child.material];
      list.forEach((m) => {
        if (m.isMeshStandardMaterial && !item.materials.includes(m)) {
          m.emissive = HOVER_GLOW.clone();
          m.emissiveIntensity = 0;
          item.materials.push(m);
        }
      });
    });
    items.push(item);
    return item;
  };

  /* ---------- Shell ---------- */
  const floor = add(scene, new THREE.PlaneGeometry(9, 7), std('#ffffff', { map: T.plankTexture(), roughness: 0.6 }), [0, 0, 2.3]);
  floor.rotation.x = -Math.PI / 2;

  const rug = add(scene, new THREE.PlaneGeometry(2.6, 1.6), std('#ffffff', { map: T.rugTexture(), roughness: 1 }), [-0.25, 0.003, 0.55]);
  rug.rotation.x = -Math.PI / 2;

  const wallShape = new THREE.Shape();
  wallShape.moveTo(-3.2, 0);
  wallShape.lineTo(3.2, 0);
  wallShape.lineTo(3.2, 3.2);
  wallShape.lineTo(-3.2, 3.2);
  wallShape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(WIN.x0, WIN.y0);
  hole.lineTo(WIN.x1, WIN.y0);
  hole.lineTo(WIN.x1, WIN.y1);
  hole.lineTo(WIN.x0, WIN.y1);
  hole.closePath();
  wallShape.holes.push(hole);
  const wallMat = std('#343849', { roughness: 0.95 });
  add(scene, new THREE.ExtrudeGeometry(wallShape, { depth: 0.16, bevelEnabled: false }), wallMat, [0, 0, WALL_Z - 0.16]);

  const ceiling = add(scene, new THREE.PlaneGeometry(6.4, 7), std('#1b1d27', { roughness: 1 }), [0, 3.2, 2.3]);
  ceiling.rotation.x = Math.PI / 2;

  const sideMat = std('#2c2f3e', { roughness: 0.95 });
  const leftWall = add(scene, new THREE.PlaneGeometry(7, 3.2), sideMat, [-3.2, 1.6, 2.3]);
  leftWall.rotation.y = Math.PI / 2;
  const rightWall = add(scene, new THREE.PlaneGeometry(7, 3.2), sideMat, [3.2, 1.6, 2.3]);
  rightWall.rotation.y = -Math.PI / 2;
  add(scene, new THREE.BoxGeometry(6.4, 0.1, 0.025), std('#17181f'), [0, 0.05, WALL_Z + 0.012]);

  /* ---------- Window, city and rain ---------- */
  const winW = WIN.x1 - WIN.x0;
  const winH = WIN.y1 - WIN.y0;
  const winX = (WIN.x0 + WIN.x1) / 2;
  const winY = (WIN.y0 + WIN.y1) / 2;

  const city = createCityMaterial();
  noShadow.add(add(scene, new THREE.PlaneGeometry(4.6, 3.1), city, [winX, 1.95, WALL_Z - 0.95]));
  const glass = createRainGlassMaterial(winW / winH);
  noShadow.add(add(scene, new THREE.PlaneGeometry(winW, winH), glass, [winX, winY, WALL_Z - 0.07]));
  tickers.push((dt, t) => { city.uniforms.uTime.value = t; glass.uniforms.uTime.value = t; });

  const frameMat = std('#d6cebf', { roughness: 0.55 });
  const fz = WALL_Z - 0.07;
  add(scene, new THREE.BoxGeometry(0.05, winH, 0.07), frameMat, [WIN.x0 + 0.025, winY, fz]);
  add(scene, new THREE.BoxGeometry(0.05, winH, 0.07), frameMat, [WIN.x1 - 0.025, winY, fz]);
  add(scene, new THREE.BoxGeometry(winW, 0.05, 0.07), frameMat, [winX, WIN.y1 - 0.025, fz]);
  add(scene, new THREE.BoxGeometry(winW, 0.05, 0.07), frameMat, [winX, WIN.y0 + 0.025, fz]);
  add(scene, new THREE.BoxGeometry(0.035, winH, 0.045), frameMat, [winX, winY, fz]);
  add(scene, new THREE.BoxGeometry(winW, 0.035, 0.045), frameMat, [winX, WIN.y0 + winH * 0.64, fz]);
  add(scene, new THREE.BoxGeometry(winW + 0.22, 0.04, 0.26), frameMat, [winX, WIN.y0 - 0.02, WALL_Z + 0.03]);

  const curtainGeo = new THREE.PlaneGeometry(0.6, 2.1, 30, 1);
  const pos = curtainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 30) * 0.035);
  curtainGeo.computeVertexNormals();
  add(scene, curtainGeo, std('#1c3149', { side: THREE.DoubleSide, roughness: 1 }), [WIN.x0 - 0.2, 1.36, WALL_Z + 0.09]);
  scene.add(rod(V(WIN.x0 - 0.6, 2.42, WALL_Z + 0.09), V(WIN.x1 + 0.3, 2.42, WALL_Z + 0.09), 0.012, std('#9a8a6c', { metalness: 0.7, roughness: 0.35 })));

  /* ---------- Desk ---------- */
  const DX = -0.25;
  const DZ = -0.62;
  const DW = 2.6;
  const DD = 0.95;
  const wood = std('#4b2f21', { roughness: 0.5 });
  add(scene, rbox(DW, 0.06, DD, 0.012), wood, [DX, DESK_Y - 0.03, DZ]);
  const legMat = std('#22170f');
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    add(scene, new THREE.BoxGeometry(0.06, DESK_Y - 0.06, 0.06), legMat, [DX + sx * (DW / 2 - 0.08), (DESK_Y - 0.06) / 2, DZ + sz * (DD / 2 - 0.08)]);
  });
  const drawerX = DX + DW / 2 - 0.32;
  add(scene, new THREE.BoxGeometry(0.48, 0.5, DD - 0.12), wood, [drawerX, DESK_Y - 0.31, DZ]);
  [0.15, -0.1].forEach((y) => {
    add(scene, new THREE.BoxGeometry(0.44, 0.005, 0.005), legMat, [drawerX, DESK_Y - 0.31 + y, DZ + (DD - 0.12) / 2 + 0.003]);
    add(scene, rbox(0.12, 0.018, 0.02, 0.006), std('#a7926a', { metalness: 0.8, roughness: 0.3 }), [drawerX, DESK_Y - 0.31 + y - 0.07, DZ + (DD - 0.12) / 2 + 0.012]);
  });

  /* ---------- Lamp (toggles on click) ---------- */
  const lamp = new THREE.Group();
  lamp.position.set(-1.24, DESK_Y, -0.84);
  lamp.rotation.y = 0.95;
  scene.add(lamp);
  const lampMetal = std('#1f2d29', { roughness: 0.38, metalness: 0.6 });
  add(lamp, new THREE.CylinderGeometry(0.085, 0.1, 0.028, 32), lampMetal, [0, 0.014, 0]);
  const J0 = V(0, 0.028, 0);
  const J1 = V(0, 0.37, -0.1);
  const J2 = V(0, 0.52, 0.2);
  lamp.add(rod(J0, J1, 0.009, lampMetal), rod(J1, J2, 0.009, lampMetal));
  add(lamp, new THREE.SphereGeometry(0.018, 16, 12), lampMetal, J1.toArray());
  add(lamp, new THREE.SphereGeometry(0.02, 16, 12), lampMetal, J2.toArray());
  const aim = V(0, -1, 0.6).normalize();
  const shade = add(lamp, new THREE.ConeGeometry(0.088, 0.15, 32, 1, true), std('#1f2d29', { side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5 }));
  shade.quaternion.setFromUnitVectors(V(0, -1, 0), aim);
  shade.position.copy(J2).addScaledVector(aim, 0.05);
  const innerMat = basic('#ffcf94', 0, { side: THREE.BackSide });
  const inner = add(lamp, new THREE.ConeGeometry(0.084, 0.142, 32, 1, true), innerMat);
  inner.quaternion.copy(shade.quaternion);
  inner.position.copy(shade.position);
  const bulbMat = basic('#ffd6a0', 0);
  const bulbPos = J2.clone().addScaledVector(aim, 0.075);
  const bulb = add(lamp, new THREE.SphereGeometry(0.03, 20, 14), bulbMat, bulbPos.toArray());
  [shade, inner, bulb].forEach((m) => noShadow.add(m));

  const spot = new THREE.SpotLight('#ffae62', 0, 5, 0.78, 0.6, 1.5);
  spot.position.copy(bulbPos);
  spot.target.position.copy(bulbPos).addScaledVector(aim, 1);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0006;
  spot.shadow.normalBias = 0.02;
  spot.shadow.camera.near = 0.05;
  lamp.add(spot, spot.target);
  const lampFill = new THREE.PointLight('#ff9b4f', 0, 3.2, 1.6);
  lampFill.position.copy(bulbPos).add(V(0, 0.08, 0));
  lamp.add(lampFill);

  const lampState = { on: false, level: 0, flicker: 0 };
  const setLamp = (on) => {
    lampState.on = on;
    lampState.flicker = on ? 0.5 : 0;
  };
  tickers.push((dt, t) => {
    const target = lampState.on ? 1 : 0;
    lampState.level += (target - lampState.level) * Math.min(1, dt * 7);
    let level = lampState.level;
    if (lampState.flicker > 0) {
      lampState.flicker -= dt;
      level *= Math.sin(t * 60) > 0.2 ? 1 : 0.15;
    }
    spot.intensity = 7 * level;
    lampFill.intensity = 1.1 * level;
    bulbMat.color.set('#ffd6a0').multiplyScalar(5 * level);
    innerMat.color.set('#ffcf94').multiplyScalar(0.9 * level);
  });

  register({
    id: 'lamp', object: lamp, label: 'Desk lamp', hint: 'Click to switch it',
    action: 'lamp',
    apply: (h) => { lamp.rotation.y = 0.95 + h * 0.08; }
  });

  /* ---------- CRT monitor → About ---------- */
  const terminal = T.createTerminal();
  const monitor = new THREE.Group();
  monitor.position.set(-0.15, DESK_Y, -0.72);
  scene.add(monitor);
  const beige = std('#cfc5b0', { roughness: 0.55 });
  add(monitor, rbox(0.36, 0.03, 0.3, 0.01), beige, [0, 0.015, 0]);
  add(monitor, new THREE.CylinderGeometry(0.05, 0.07, 0.05, 20), beige, [0, 0.05, 0]);
  add(monitor, rbox(0.6, 0.48, 0.34, 0.035), beige, [0, 0.31, 0.05]);
  add(monitor, rbox(0.44, 0.38, 0.28, 0.05), beige, [0, 0.3, -0.2]);
  add(monitor, rbox(0.52, 0.4, 0.02, 0.012), std('#151112', { roughness: 0.4 }), [0, 0.325, 0.215]);
  const screenGeo = new THREE.PlaneGeometry(0.47, 0.35, 20, 14);
  const sp = screenGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i) / 0.235;
    const y = sp.getY(i) / 0.175;
    sp.setZ(i, (1 - (x * x + y * y) * 0.5) * 0.012);
  }
  const screenMat = new THREE.MeshBasicMaterial({ map: terminal.texture });
  screenMat.color.setScalar(1.25);
  const screen = add(monitor, screenGeo, screenMat, [0, 0.325, 0.222]);
  noShadow.add(screen);
  add(monitor, new THREE.SphereGeometry(0.006, 10, 8), basic('#ff2148', 3), [0.24, 0.1, 0.222]);
  for (let i = 0; i < 5; i++) add(monitor, new THREE.BoxGeometry(0.004, 0.06, 0.004), std('#8f8676'), [0.26, 0.42 - i * 0.02, -0.05]).rotation.z = Math.PI / 2;
  const screenGlow = new THREE.PointLight('#ff9a3c', 0.9, 1.8, 1.8);
  screenGlow.position.set(0, 0.32, 0.45);
  monitor.add(screenGlow);
  tickers.push((dt, t, reduced) => {
    terminal.update(dt, t, reduced);
    screenGlow.intensity = 0.85 + Math.sin(t * 13) * 0.03 + Math.sin(t * 0.7) * 0.05;
  });
  register({
    id: 'monitor', object: monitor, label: 'About Vuong', hint: 'The terminal on the desk',
    section: 'about',
    apply: (h) => { screenMat.color.setScalar(1.25 + h * 0.5); }
  });
  markers.push({ section: 'about', label: 'About', anchor: V(-0.15, DESK_Y + 0.66, -0.6) });

  /* ---------- Keyboard, mouse, mug (decor) ---------- */
  const keyboard = new THREE.Group();
  keyboard.position.set(-0.15, DESK_Y, -0.3);
  keyboard.rotation.x = 0.03;
  scene.add(keyboard);
  add(keyboard, rbox(0.5, 0.024, 0.17, 0.006), std('#cbc1ab', { roughness: 0.55 }), [0, 0.012, 0]);
  const keyGeo = rbox(0.026, 0.014, 0.026, 0.004);
  const keys = new THREE.InstancedMesh(keyGeo, std('#e6dece', { roughness: 0.5 }), 14 * 3 + 6);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 14; col++) {
      m4.makeTranslation(-0.2 + col * 0.0308, 0.03, -0.058 + row * 0.033);
      keys.setMatrixAt(k++, m4);
    }
  }
  [0, 1, 2, 11, 12, 13].forEach((col) => {
    m4.makeTranslation(-0.2 + col * 0.0308, 0.03, 0.041);
    keys.setMatrixAt(k++, m4);
  });
  keyboard.add(keys);
  add(keyboard, rbox(0.24, 0.014, 0.026, 0.004), std('#e6dece', { roughness: 0.5 }), [0, 0.03, 0.041]);
  add(keyboard, rbox(0.055, 0.015, 0.026, 0.004), std('#ff2148', { roughness: 0.45 }), [0.205, 0.031, -0.025]);

  add(scene, rbox(0.06, 0.03, 0.1, 0.014), std('#cbc1ab', { roughness: 0.5 }), [0.22, DESK_Y + 0.015, -0.28]);

  const mug = new THREE.Group();
  mug.position.set(0.36, DESK_Y, -0.52);
  scene.add(mug);
  const mugMat = std('#e9e1d3', { roughness: 0.35 });
  add(mug, new THREE.CylinderGeometry(0.044, 0.04, 0.1, 28, 1, true), mugMat, [0, 0.05, 0]).material.side = THREE.DoubleSide;
  add(mug, new THREE.CircleGeometry(0.04, 24), mugMat, [0, 0.001, 0]).rotation.x = -Math.PI / 2;
  add(mug, new THREE.CircleGeometry(0.041, 24), std('#2a1408', { roughness: 0.2 }), [0, 0.085, 0]).rotation.x = -Math.PI / 2;
  add(mug, new THREE.TorusGeometry(0.026, 0.007, 10, 20, Math.PI * 1.3), mugMat, [0.048, 0.052, 0]).rotation.z = -Math.PI * 0.65;
  const dot = T.softDot();
  const steam = Array.from({ length: 6 }, (_, i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#c9b9a8', transparent: true, opacity: 0, depthWrite: false }));
    sprite.userData.offset = i / 6;
    mug.add(sprite);
    return sprite;
  });
  tickers.push((dt, t) => {
    steam.forEach((s) => {
      const p = (t * 0.22 + s.userData.offset) % 1;
      s.position.set(Math.sin(p * 7 + s.userData.offset * 9) * 0.015, 0.1 + p * 0.22, 0);
      s.scale.setScalar(0.03 + p * 0.07);
      s.material.opacity = Math.sin(p * Math.PI) * 0.16;
    });
  });

  /* ---------- Binders → Work ---------- */
  const binders = new THREE.Group();
  binders.position.set(-0.86, DESK_Y, -0.9);
  scene.add(binders);
  const roles = [
    { color: '#a3192e', company: 'TeenCare', years: '2025 — now' },
    { color: '#b9822f', company: 'Thưởng Trà', years: '2025' },
    { color: '#2c4a7c', company: 'eJOY', years: '2018 — 2024' }
  ];
  const binderMeshes = roles.map((role, i) => {
    const cover = std(role.color, { roughness: 0.6 });
    const paper = std('#efe8da', { roughness: 0.9 });
    const front = std('#ffffff', { map: T.binderSpine(role), roughness: 0.6 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.3, 0.24), [cover, cover, paper, cover, front, cover]);
    b.position.set(-0.075 + i * 0.073, 0.15, 0);
    binders.add(b);
    return b;
  });
  binderMeshes[2].rotation.z = -0.2;
  binderMeshes[2].position.x += 0.03;
  binderMeshes[2].position.y -= 0.004;
  const bookend = std('#1a1a1d', { metalness: 0.6, roughness: 0.35 });
  add(binders, new THREE.BoxGeometry(0.008, 0.17, 0.13), bookend, [-0.118, 0.085, 0]);
  add(binders, new THREE.BoxGeometry(0.07, 0.006, 0.13), bookend, [-0.085, 0.003, 0]);
  register({
    id: 'binders', object: binders, label: 'Work history', hint: '3 roles · 2018 — now',
    section: 'work',
    apply: (h) => { binderMeshes[1].position.y = 0.15 + h * 0.05; binderMeshes[0].position.y = 0.15 + h * 0.018; }
  });
  markers.push({ section: 'work', label: 'Work', anchor: V(-0.86, DESK_Y + 0.42, -0.9) });

  /* ---------- VHS tapes → Products ---------- */
  const tapes = new THREE.Group();
  tapes.position.set(0.66, DESK_Y, -0.8);
  scene.add(tapes);
  const turns = [0.07, -0.05, 0.1, -0.03];
  [...PROJECTS].reverse().forEach((project, i) => {
    const shell = std('#141314', { roughness: 0.45 });
    const label = std('#ffffff', { map: T.tapeSpine(project), roughness: 0.7 });
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.042, 0.18), [shell, shell, shell, shell, label, shell]);
    const y = 0.021 + i * 0.0425;
    tape.position.set(0, y, 0);
    tape.rotation.y = turns[i];
    tapes.add(tape);
    register({
      id: `tape-${project.key}`, object: tape, label: project.title, hint: `${project.tag} · tape ${project.index} of 04`,
      section: 'products', project: project.key,
      apply: (h) => { tape.position.z = h * 0.07; tape.position.y = y + h * 0.004; }
    });
  });
  markers.push({ section: 'products', label: 'Products', anchor: V(0.66, DESK_Y + 0.27, -0.8) });

  /* ---------- Phone → Contact ---------- */
  const phone = new THREE.Group();
  phone.position.set(0.8, DESK_Y, -0.36);
  phone.rotation.y = -0.4;
  scene.add(phone);
  const red = std('#d61d3b', { roughness: 0.32 });
  add(phone, rbox(0.21, 0.07, 0.17, 0.022), red, [0, 0.035, 0]);
  add(phone, rbox(0.17, 0.035, 0.11, 0.015), red, [0, 0.075, -0.015]);
  const dial = add(phone, new THREE.CylinderGeometry(0.042, 0.042, 0.008, 32), std('#f1e9da', { roughness: 0.4 }), [0, 0.071, 0.06]);
  dial.rotation.x = 0.45;
  add(phone, new THREE.TorusGeometry(0.03, 0.004, 8, 28), std('#2a2223'), [0, 0.0755, 0.0615]).rotation.x = -Math.PI / 2 + 0.45;
  const handset = new THREE.Group();
  handset.position.set(0, 0.112, -0.015);
  phone.add(handset);
  add(handset, new THREE.CylinderGeometry(0.016, 0.016, 0.17, 16), red).rotation.z = Math.PI / 2;
  add(handset, rbox(0.055, 0.034, 0.06, 0.014), red, [-0.085, -0.012, 0]);
  add(handset, rbox(0.055, 0.034, 0.06, 0.014), red, [0.085, -0.012, 0]);
  const cordPts = [];
  for (let i = 0; i <= 60; i++) {
    const s = i / 60;
    const base = new THREE.Vector3().lerpVectors(V(-0.105, 0.02, 0.02), V(-0.11, 0.095, -0.015), s);
    base.x -= Math.sin(s * Math.PI) * 0.07;
    base.z += Math.sin(s * Math.PI) * 0.05;
    base.y += Math.cos(s * 70) * 0.005;
    base.z += Math.sin(s * 70) * 0.005;
    cordPts.push(base);
  }
  phone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 240, 0.0028, 6), red));
  register({
    id: 'phone', object: phone, label: 'Contact', hint: 'Pick up the phone',
    section: 'contact',
    apply: (h, t) => {
      handset.position.y = 0.112 + h * 0.035;
      handset.rotation.z = h * (0.1 + Math.sin(t * 22) * 0.04);
    }
  });
  markers.push({ section: 'contact', label: 'Contact', anchor: V(0.8, DESK_Y + 0.2, -0.36) });

  /* ---------- Floppy → CV download ---------- */
  const floppy = new THREE.Group();
  floppy.position.set(-0.62, DESK_Y, -0.3);
  floppy.rotation.y = 0.35;
  scene.add(floppy);
  const floppySide = std('#9e1027', { roughness: 0.5 });
  const disk = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.004, 0.094), [floppySide, floppySide, std('#ffffff', { map: T.floppyTop(), roughness: 0.5 }), floppySide, floppySide, floppySide]);
  disk.position.y = 0.0062;
  floppy.add(disk);
  const under = add(floppy, new THREE.BoxGeometry(0.094, 0.004, 0.094), std('#2a2a2e', { roughness: 0.5 }), [0.012, 0.002, -0.01]);
  under.rotation.y = -0.35;
  register({
    id: 'floppy', object: floppy, label: 'CV.pdf', hint: 'Click to download',
    action: 'cv',
    apply: (h) => { disk.position.y = 0.0062 + h * 0.025; disk.rotation.x = h * -0.25; }
  });
  markers.push({ section: 'cv', label: 'CV', anchor: V(-0.62, DESK_Y + 0.08, -0.3) });

  /* ---------- Corkboard → Stack, polaroid → About ---------- */
  const board = new THREE.Group();
  board.position.set(1.32, 1.6, WALL_Z);
  scene.add(board);
  add(board, rbox(1.02, 0.74, 0.03, 0.008), std('#6b4a32', { roughness: 0.6 }), [0, 0, 0.015]);
  add(board, new THREE.PlaneGeometry(0.94, 0.66), std('#ffffff', { map: T.corkTexture(), roughness: 1 }), [0, 0, 0.0305]);

  const notesGroup = new THREE.Group();
  board.add(notesGroup);
  const pinMat = std('#ff2148', { roughness: 0.3 });
  const notes = [
    { color: '#f2d65c', title: 'Product', lines: ['discovery', 'metrics · pricing'], at: [0.09, 0.15], r: -0.06 },
    { color: '#f3a0b4', title: 'AI', lines: ['LLM products', 'Claude · Codex'], at: [0.31, 0.13], r: 0.05 },
    { color: '#a7cbe6', title: 'Engineering', lines: ['TS · Next · Nest', 'Postgres · Redis'], at: [0.1, -0.13], r: 0.04 },
    { color: '#efe9dc', title: 'Ops', lines: ['VietQR · Zalo', 'Docker · CI/CD'], at: [0.32, -0.15], r: -0.07 }
  ].map((n, i) => {
    const note = add(notesGroup, new THREE.PlaneGeometry(0.19, 0.19), std('#ffffff', { map: T.stickyNote(n), roughness: 0.9, side: THREE.DoubleSide }), [n.at[0], n.at[1], 0.033 + i * 0.001]);
    note.rotation.z = n.r;
    add(notesGroup, new THREE.SphereGeometry(0.009, 12, 8), pinMat, [n.at[0], n.at[1] + 0.08, 0.04]);
    return { mesh: note, r: n.r, i };
  });
  register({
    id: 'board', object: notesGroup, label: 'Stack & capabilities', hint: 'Notes pinned to the board',
    section: 'stack',
    apply: (h, t) => { notes.forEach((n) => { n.mesh.rotation.z = n.r + Math.sin(t * 9 + n.i * 2) * 0.04 * h; n.mesh.rotation.x = -h * 0.25; }); }
  });
  markers.push({ section: 'stack', label: 'Stack', anchor: V(1.53, 2.06, WALL_Z + 0.05) });

  const photo = new THREE.Group();
  photo.position.set(-0.25, 0, 0.034);
  photo.rotation.z = 0.05;
  board.add(photo);
  add(photo, new THREE.PlaneGeometry(0.26, 0.32), std('#ffffff', { map: T.polaroid(portrait), roughness: 0.7 }));
  add(photo, new THREE.SphereGeometry(0.009, 12, 8), std('#ff2148', { roughness: 0.3 }), [0, 0.14, 0.008]);
  register({
    id: 'photo', object: photo, label: 'Vuong Ngo', hint: 'Product Engineer · Ha Noi',
    section: 'about',
    apply: (h) => { photo.rotation.z = 0.05 - h * 0.07; photo.scale.setScalar(1 + h * 0.05); photo.position.z = 0.034 + h * 0.02; }
  });

  /* ---------- Neon sign ---------- */
  const neonMat = new THREE.MeshBasicMaterial({ map: T.neonSign('egorlas'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const neon = add(scene, new THREE.PlaneGeometry(1.0, 0.274), neonMat, [1.3, 2.3, WALL_Z + 0.03]);
  noShadow.add(neon);
  const neonLight = new THREE.PointLight('#ff2148', 0, 3.2, 1.6);
  neonLight.position.set(1.3, 2.25, WALL_Z + 0.3);
  scene.add(neonLight);
  const neonState = { on: false, level: 0, glitch: 0 };
  tickers.push((dt, t) => {
    neonState.level += ((neonState.on ? 1 : 0) - neonState.level) * Math.min(1, dt * 5);
    let level = neonState.level;
    neonState.glitch -= dt;
    if (neonState.glitch < -6 - Math.random() * 6) neonState.glitch = 0.35;
    if (neonState.glitch > 0) level *= Math.sin(t * 90) > 0 ? 1 : 0.35;
    neonMat.color.setScalar(2.2 * level);
    neonLight.intensity = 0.9 * level;
  });

  /* ---------- Wall shelf with radio → rain sound ---------- */
  const shelfY = 1.42;
  const shelfZ = WALL_Z + 0.11;
  add(scene, rbox(0.66, 0.03, 0.22, 0.006), wood, [-1.98, shelfY, shelfZ]);
  [-2.2, -1.76].forEach((x) => add(scene, new THREE.BoxGeometry(0.02, 0.1, 0.15), legMat, [x, shelfY - 0.065, shelfZ - 0.03]));
  const radio = new THREE.Group();
  radio.position.set(-2.02, shelfY + 0.015, shelfZ);
  scene.add(radio);
  add(radio, rbox(0.3, 0.17, 0.12, 0.022), std('#d8ccb2', { roughness: 0.5 }), [0, 0.085, 0]);
  add(radio, new THREE.PlaneGeometry(0.13, 0.13), std('#ffffff', { map: T.speakerGrille(), roughness: 0.8 }), [-0.065, 0.085, 0.0605]);
  const freqMat = basic('#ffb347', 0.25);
  add(radio, new THREE.PlaneGeometry(0.09, 0.03), freqMat, [0.075, 0.125, 0.0605]);
  [0.05, 0.1].forEach((x) => add(radio, new THREE.CylinderGeometry(0.014, 0.014, 0.015, 18), std('#2b2627', { roughness: 0.4 }), [x, 0.06, 0.065]).rotation.x = Math.PI / 2);
  radio.add(rod(V(0.1, 0.17, -0.03), V(0.2, 0.36, -0.04), 0.003, std('#c9c9cc', { metalness: 0.9, roughness: 0.25 })));
  const radioState = { on: false };
  tickers.push((dt, t) => {
    freqMat.color.set('#ffb347').multiplyScalar(radioState.on ? 2.4 + Math.sin(t * 3) * 0.3 : 0.25);
  });
  register({
    id: 'radio', object: radio, label: 'Rain radio', hint: 'Click to play the rain',
    action: 'sound',
    apply: (h, t) => { radio.rotation.z = Math.sin(t * 18) * 0.02 * h; }
  });

  add(scene, new THREE.CylinderGeometry(0.04, 0.032, 0.07, 18), std('#c86d4c'), [-1.75, shelfY + 0.05, shelfZ]);
  add(scene, new THREE.CapsuleGeometry(0.022, 0.06, 6, 12), std('#4f7a4d', { roughness: 0.7 }), [-1.75, shelfY + 0.13, shelfZ]);
  [0, 1].forEach((i) => add(scene, new THREE.BoxGeometry(0.16, 0.025, 0.12), std(i ? '#e9e1d3' : '#2c4a7c'), [-2.22, shelfY + 0.03 + i * 0.026, shelfZ]).rotation.y = i * 0.12);

  /* ---------- Plant ---------- */
  const plant = new THREE.Group();
  plant.position.set(1.62, 0, -0.78);
  scene.add(plant);
  add(plant, new THREE.CylinderGeometry(0.17, 0.13, 0.4, 28), std('#57524d', { roughness: 0.85 }), [0, 0.2, 0]);
  add(plant, new THREE.CircleGeometry(0.16, 24), std('#1c140f'), [0, 0.39, 0]).rotation.x = -Math.PI / 2;
  const leafGeo = new THREE.SphereGeometry(1, 16, 10);
  const leaves = Array.from({ length: 11 }, (_, i) => {
    const pivot = new THREE.Group();
    pivot.position.y = 0.39;
    pivot.rotation.order = 'YXZ';
    pivot.rotation.y = i * 2.39996;
    const tilt = 0.25 + ((i * 37) % 10) / 10 * 0.55;
    pivot.rotation.x = tilt;
    const leaf = new THREE.Mesh(leafGeo, std(new THREE.Color('#2d5a3d').offsetHSL(((i * 13) % 7) / 100, 0, ((i * 7) % 5) / 60), { roughness: 0.6, side: THREE.DoubleSide }));
    const len = 0.28 + ((i * 17) % 10) / 10 * 0.16;
    leaf.scale.set(0.065, len, 0.016);
    leaf.position.y = len * 0.95;
    pivot.add(leaf);
    plant.add(pivot);
    return { pivot, tilt, i };
  });
  tickers.push((dt, t) => {
    leaves.forEach((l) => { l.pivot.rotation.x = l.tilt + Math.sin(t * 0.9 + l.i) * 0.025; });
  });

  /* ---------- Dust in the lamp beam ---------- */
  const dustCount = 140;
  const dustPos = new Float32Array(dustCount * 3);
  const seeds = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos.set([-1.3 + Math.random() * 1.1, DESK_Y + 0.05 + Math.random() * 0.7, -1.05 + Math.random() * 0.8], i * 3);
    seeds[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.007, map: dot, color: '#ffd9a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);
  const base = dustPos.slice();
  tickers.push((dt, t) => {
    for (let i = 0; i < dustCount; i++) {
      const s = seeds[i];
      dustPos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + s) * 0.05;
      dustPos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + s * 2) * 0.06;
      dustPos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + s) * 0.05;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.75 * lampState.level;
  });

  /* ---------- Light ---------- */
  scene.add(new THREE.HemisphereLight('#4a5a8f', '#24180f', 1.1));
  const moon = new THREE.DirectionalLight('#7b92d8', 1.3);
  moon.position.set(-1.0, 3.4, -4.6);
  moon.target.position.set(-0.3, 0.5, 0.7);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -3;
  moon.shadow.camera.right = 3;
  moon.shadow.camera.top = 3;
  moon.shadow.camera.bottom = -3;
  moon.shadow.camera.far = 12;
  moon.shadow.bias = -0.0005;
  moon.shadow.normalBias = 0.02;
  scene.add(moon, moon.target);
  const fill = new THREE.PointLight('#5a6cb4', 3.2, 8, 1.3);
  fill.position.set(0.6, 2.5, 1.8);
  scene.add(fill);

  scene.traverse((child) => {
    if (!child.isMesh || noShadow.has(child)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  floor.castShadow = false;
  rug.castShadow = false;

  const pickables = [];
  items.forEach((item) => item.object.traverse((child) => { if (child.isMesh) pickables.push(child); }));

  return {
    scene,
    items,
    markers,
    pickables,
    setLamp,
    get lampOn() { return lampState.on; },
    setNeon: (on) => { neonState.on = on; },
    setRadio: (on) => { radioState.on = on; },
    tick(dt, t, reduced) {
      tickers.forEach((fn) => fn(dt, t, reduced));
      items.forEach((item) => {
        item.apply?.(item.hover, t);
        item.materials.forEach((m) => { m.emissiveIntensity = item.hover * 0.14; });
      });
    }
  };
}
