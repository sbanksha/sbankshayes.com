// Procedural, code-built models. Each factory returns { group, parts, ...handles }.
// parts: [{ obj, cat (0 mech | 1 electromech | 2 pcba), off: Vector3, rot: Euler|null, label, anchor }]
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
const DS = THREE.DoubleSide;
export const MAT = {};

export function initMaterials() {
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  Object.assign(MAT, {
    hull: P({ color: 0x585e64, metalness: 0.32, roughness: 0.44, clearcoat: 0.55, clearcoatRoughness: 0.38 }),
    hullIn: P({ color: 0x16181b, metalness: 0.15, roughness: 0.85, side: THREE.BackSide }),
    hullRim: P({ color: 0x33373c, metalness: 0.35, roughness: 0.6, side: DS }),
    alu: P({ color: 0xc6cacd, metalness: 1, roughness: 0.28 }),
    aluDark: P({ color: 0x6c7176, metalness: 1, roughness: 0.38 }),
    gunmetal: P({ color: 0x2a2d31, metalness: 0.75, roughness: 0.4 }),
    black: P({ color: 0x111214, metalness: 0.2, roughness: 0.5 }),
    rubber: P({ color: 0x0b0b0c, metalness: 0, roughness: 0.92 }),
    pcb: P({ color: 0x0f3d2c, metalness: 0.1, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
    gold: P({ color: 0xd8ad52, metalness: 1, roughness: 0.25 }),
    chip: P({ color: 0x141516, metalness: 0.25, roughness: 0.36 }),
    passive: P({ color: 0x9a8a6a, metalness: 0.1, roughness: 0.5 }),
    copper: P({ color: 0xc87d45, metalness: 1, roughness: 0.28 }),
    battery: P({ color: 0x23272b, metalness: 0.45, roughness: 0.45, clearcoat: 0.5 }),
    bone: P({ color: 0xe7e2d7, metalness: 0, roughness: 0.6 }),
    white: P({ color: 0xefeeea, metalness: 0, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.28, side: DS }),
    whiteFlat: P({ color: 0xefeeea, metalness: 0, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.28 }),
    smoke: P({ color: 0x1b2026, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.48, clearcoat: 1, depthWrite: false, side: DS, envMapIntensity: 2.2 }),
    lens: P({ color: 0x05070a, metalness: 0.3, roughness: 0.02, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 560] }),
    irLed: P({ color: 0x3a0909, roughness: 0.15, clearcoat: 1, emissive: 0xff1a0a, emissiveIntensity: 0 }),
    logo: P({ color: 0x8e9399, metalness: 0.2, roughness: 0.45 }),
    matte: P({ color: 0x17181a, metalness: 0.3, roughness: 0.58, clearcoat: 0.2, clearcoatRoughness: 0.6 }),
    matteDS: P({ color: 0x17181a, metalness: 0.3, roughness: 0.58, clearcoat: 0.2, clearcoatRoughness: 0.6, side: DS }),
    nickel: P({ color: 0xb6b1a7, metalness: 1, roughness: 0.32 }),
    plane: P({ color: 0xc9cdd1, metalness: 0.9, roughness: 0.3, side: DS }),
    glass: P({ color: 0x0a0f15, metalness: 0.2, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.88 }),
    accent: P({ color: 0xff5b1f, metalness: 0.2, roughness: 0.38, clearcoat: 0.6, side: DS }),
    track: P({ color: 0xff6526, metalness: 0.25, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.3 }),  // RailBlazer's bright safety-orange I-beam
    support: P({ color: 0x9ea3a8, metalness: 0.55, roughness: 0.45 }),
    yellow: P({ color: 0xf7c531, metalness: 0.1, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    seat: P({ color: 0x141516, roughness: 0.62 }),
    led: new THREE.MeshBasicMaterial({ color: 0x3a3d40 }),
    blur: new THREE.MeshBasicMaterial({ color: 0xd8dbe0, transparent: true, opacity: 0, depthWrite: false, side: DS }),
  });
  MAT.riders = [0x3b3f45, 0x5a4a3a, 0x2f3a44, 0x6b6a66, 0x45393b, 0x24282d].map((c) => P({ color: c, roughness: 0.85 }));
  MAT.brass = P({ color: 0xc9a467, metalness: 1, roughness: 0.36, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  MAT.brassDS = MAT.brass.clone(); MAT.brassDS.side = DS;
  MAT.gunDS = MAT.gunmetal.clone(); MAT.gunDS.side = DS;
  MAT.zinc = P({ color: 0xb9bcbf, metalness: 1, roughness: 0.42 });
  // ice plant
  MAT.ice = P({ color: 0xe4f4ff, metalness: 0, roughness: 0.06, transmission: 0.55, thickness: 0.4, ior: 1.31, clearcoat: 1 });
  MAT.bag = P({ color: 0xffffff, metalness: 0, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.25, map: canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#eef5fa'; c.fillRect(0, 0, w, h); noise(c, w, h, 22, 4);         // frosted ice showing through clear film
    c.fillStyle = '#2f73b8'; c.fillRect(0, h * 0.38, w, h * 0.22);                   // printed band
    c.fillStyle = '#ffffff'; c.fillRect(w * 0.18, h * 0.45, w * 0.64, h * 0.07);
  }, { srgb: true }) });
  // insulated metal panel cladding: fine vertical ribs in the bump map, matte off-white like a real cold-storage plant
  const ribs = canvasTex(256, 16, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { c.fillStyle = '#b4b4b4'; c.fillRect(x, 0, 3, h); c.fillStyle = '#5a5a5a'; c.fillRect(x + 3, 0, 1, h); } }, { wrap: true });
  ribs.repeat.set(10, 1);
  MAT.panel = P({ color: 0xc9ced2, metalness: 0.35, roughness: 0.52, bumpMap: ribs, bumpScale: 1.2, side: DS });
  MAT.roof = P({ color: 0xb3b8bc, metalness: 0.4, roughness: 0.5, bumpMap: ribs, bumpScale: 0.8, side: DS });
  MAT.steel = P({ color: 0x1f2328, metalness: 0.6, roughness: 0.45 });
  MAT.stainless = P({ color: 0xc4c8cb, metalness: 1, roughness: 0.22, bumpMap: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? 255 : 0},0,0,0.05)`; c.fillRect(0, y, w, 1); } }, { wrap: true }), bumpScale: 0.3 });
  MAT.insul = P({ color: 0xeceae4, metalness: 0, roughness: 0.6 });        // insulated NH3 suction lines
  MAT.nh3 = P({ color: 0xf2b705, metalness: 0.2, roughness: 0.42 });        // ammonia liquid lines (safety yellow)
  MAT.rackBlue = P({ color: 0x1d4f8c, metalness: 0.4, roughness: 0.45 });
  MAT.rackOrange = P({ color: 0xe0661f, metalness: 0.4, roughness: 0.45 });
  MAT.floor = P({ color: 0xffffff, roughness: 0.42, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.38, map: canvasTex(512, 512, (c, w, h) => {
    // grey-green plant epoxy, darker than the white panels so floor and walls separate
    c.fillStyle = '#6d7672'; c.fillRect(0, 0, w, h); noise(c, w, h, 14, 9);
    c.fillStyle = '#e8b417'; c.fillRect(0, h * 0.68, w * 0.52, 5); c.fillRect(0, h * 0.84, w * 0.52, 5); c.fillRect(w * 0.52, h * 0.68, 5, h * 0.16 + 5);   // forklift lane
    for (let i = 0; i < 6; i++) { c.save(); c.translate(w * 0.58 + i * 22, h * 0.9); c.fillStyle = i % 2 ? '#1b1b1b' : '#e8b417'; c.fillRect(0, 0, 22, 14); c.restore(); } // dock hatch
  }, { srgb: true }) });
  MAT.concrete = P({ color: 0x5c5d5b, metalness: 0, roughness: 0.92 });
  MAT.wood = P({ color: 0x9a7650, metalness: 0, roughness: 0.85 });
  MAT.iceBlue = P({ color: 0x3f86c6, metalness: 0.2, roughness: 0.4, clearcoat: 0.6 });
  MAT.skin = [0xc89a7a, 0x8d5f43, 0xe0b896, 0x5e3d2b].map((c) => P({ color: c, roughness: 0.7 }));
  // procedural surface maps
  
  const fine = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#8c8c8c'; c.fillRect(0, 0, w, h); noise(c, w, h, 40, 5); }, { wrap: true });
  fine.repeat.set(4, 4);
  MAT.matte.roughnessMap = fine; MAT.matte.bumpMap = fine; MAT.matte.bumpScale = 0.35; MAT.matte.roughness = 0.75;
  MAT.matteDS.roughnessMap = fine; MAT.matteDS.bumpMap = fine; MAT.matteDS.bumpScale = 0.35; MAT.matteDS.roughness = 0.75;
  const brushed = canvasTex(1024, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); const R = rng(8); for (let i = 0; i < 1400; i++) { const g = R() < 0.5 ? 255 : 0; c.fillStyle = `rgba(${g},${g},${g},0.035)`; c.fillRect(0, R() * h, w, 0.5 + R() * 0.8); } }, { wrap: true });
  [MAT.nickel, MAT.alu, MAT.brass, MAT.zinc].forEach((m) => { if (m) { m.bumpMap = brushed; m.bumpScale = 0.05; } });
  const peel = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); noise(c, w, h, 18, 12); }, { wrap: true });
  peel.repeat.set(6, 3); MAT.white.bumpMap = peel; MAT.white.bumpScale = 0.12; MAT.whiteFlat.bumpMap = peel; MAT.whiteFlat.bumpScale = 0.12;
  MAT.trackBump = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); noise(c, w, h, 24, 21); }, { wrap: true });
}

// ---------- art style: CAD linework over clean studio materials ----------
export function stylize() { return null; }
function _stylizeUnused(root, { color = 0xe9e5dc, opacity = 0.42, threshold = 28, minSize = 0.02 } = {}) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const list = []; root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.userData.noLines && o.geometry && o.material && !o.material.transparent) list.push(o); });
  for (const m of list) {
    m.geometry.computeBoundingSphere(); if (m.geometry.boundingSphere.radius < minSize) continue;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, threshold), mat); e.raycast = () => {}; e.renderOrder = 2; m.add(e);
    [].concat(m.material).forEach((mm) => { mm.polygonOffset = true; mm.polygonOffsetFactor = 1; mm.polygonOffsetUnits = 1; });
  }
  return mat;
}

// ---------- art style: stylized miniature (flat-shaded, low-poly, matte toy palette) ----------
const MINI = new Map();
export function miniOf(m) { return MINI.get(m) || m; }
export function miniaturize(root) {
  const conv = (m) => {
    if (!m || m.isMeshBasicMaterial || m.isLineBasicMaterial || m.isShaderMaterial) return m;
    if (m.transparent) return m;                       // smoked dome, glass, decals keep their look
    if (MINI.has(m)) return MINI.get(m);
    const metal = m.metalness > 0.6;
    const n = new THREE.MeshStandardMaterial({ color: m.color.clone(), map: m.map || null, roughness: metal ? 0.5 : 0.82, metalness: metal ? 0.3 : 0,
      flatShading: true, side: m.side, emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0), emissiveIntensity: m.emissiveIntensity ?? 1, envMapIntensity: metal ? 0.6 : 0.3 });
    MINI.set(m, n); return n;
  };
  root.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material); });
}

// ---------- helpers ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V3 = (a) => new THREE.Vector3(...a);
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; }
function cylGeo(rTop, rBot, len, axis = 'y', seg = 48, open = false, t0 = 0, tl = PI * 2) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1, open, t0, tl);
  if (axis === 'x') g.rotateZ(-PI / 2); else if (axis === 'z') g.rotateX(PI / 2);
  return g;
}
const cyl = (r, len, m, axis = 'y', seg = 48) => new THREE.Mesh(cylGeo(r, r, len, axis, seg), m);
const rbox = (w, h, d, r, m, seg = 4) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
function grp(...ch) { const g = new THREE.Group(); ch.forEach((c) => g.add(c)); return g; }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }
function rot(o, x, y, z) { o.rotation.set(x, y, z); return o; }
function lathe(pts, seg = 96) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

function partAdder(parts) {
  return (obj, cat, off, opt = {}) => {
    parts.push({ obj, cat, off: V3(off), rot: opt.rot ? new THREE.Euler(...opt.rot) : null, label: opt.label || null, anchor: V3(opt.anchor || [0, 0, 0]) });
    return obj;
  };
}

function textTexture(text, { font = '600 96px Archivo', color = '#e7e2d7', spacing = 0, pad = 16 } = {}) {
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  ctx.font = font; if (spacing) ctx.letterSpacing = spacing + 'px';
  const m = ctx.measureText(text);
  c.width = Math.ceil(m.width + pad * 2); c.height = Math.ceil((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2);
  ctx.font = font; if (spacing) ctx.letterSpacing = spacing + 'px';
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, pad, pad + m.actualBoundingBoxAscent);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, aspect: c.width / c.height };
}
function decal(text, h, opts) {
  const { tex, aspect } = textTexture(text, opts);
  const m = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.5, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  return new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), m);
}

// Printed circuit board lying in XZ (component side +Y)
function pcb({ w = 1, d = 0.6, round = 0, ring = 0, seed = 1, chips = [], passives = 36, mat } = {}) {
  const g = new THREE.Group(); const t = 0.026; const R = rng(seed);
  let board;
  if (ring) {
    const s = new THREE.Shape(); s.absarc(0, 0, round, 0, PI * 2); const h = new THREE.Path(); h.absarc(0, 0, ring, 0, PI * 2, true); s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 48 }); geo.rotateX(-PI / 2); geo.translate(0, -t / 2, 0);
    board = new THREE.Mesh(geo, mat || MAT.pcb);
  } else if (round) board = cyl(round, t, mat || MAT.pcb, 'y', 64);
  else board = rbox(w, t, d, 0.012, mat || MAT.pcb, 2);
  g.add(board);
  for (const c of chips) {
    const h = c.h || 0.03;
    g.add(at(box(c.w, h, c.d, c.m || MAT.chip), c.x, t / 2 + h / 2, c.z));
    if (c.spreader) g.add(at(box(c.w * 0.72, 0.012, c.d * 0.72, MAT.alu), c.x, t / 2 + h + 0.006, c.z));
    if (c.pins) { // gold pins along two edges
      const n = c.pins; for (let i = 0; i < n; i++) { const px = c.x - c.w / 2 + (i + 0.5) * (c.w / n);
        g.add(at(box(c.w / n * 0.45, 0.008, 0.04, MAT.gold), px, t / 2 + 0.004, c.z + c.d / 2 + 0.02));
        g.add(at(box(c.w / n * 0.45, 0.008, 0.04, MAT.gold), px, t / 2 + 0.004, c.z - c.d / 2 - 0.02)); }
    }
  }
  const ig = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(ig, MAT.passive, passives); const instG = new THREE.InstancedMesh(ig, MAT.gold, passives);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < passives; i++) {
    let x, z;
    if (round) { const a = R() * PI * 2, r = (ring ? ring + 0.03 : 0.08) + R() * (round - (ring ? ring + 0.06 : 0.12)); x = Math.cos(a) * r; z = Math.sin(a) * r; }
    else { x = (R() - 0.5) * (w - 0.08); z = (R() - 0.5) * (d - 0.08); }
    const rotY = R() < 0.5 ? 0 : PI / 2; q.setFromEuler(new THREE.Euler(0, rotY, 0));
    const big = R() < 0.25; s.set(big ? 0.05 : 0.03, big ? 0.024 : 0.014, big ? 0.03 : 0.016);
    p.set(x, t / 2 + s.y / 2, z); m4.compose(p, q, s); inst.setMatrixAt(i, m4);
    s.set(0.012, 0.006, s.z * 0.9); p.set(x + (rotY ? 0 : 0.024), t / 2 + 0.003, z + (rotY ? 0.024 : 0)); m4.compose(p, q, s); instG.setMatrixAt(i, m4);
  }
  g.add(inst, instG);
  return g;
}

// ---------- procedural surface textures ----------
function canvasTex(w, h, draw, { srgb = false, wrap = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function noise(ctx, w, h, amt, seed = 1) {
  const R = rng(seed); const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}


// ============================================================
// VERKADA DOME CAMERA  (vertical, mounts to ceiling at +Y)
// ============================================================
export function makeDome() {
  const g = new THREE.Group(); const parts = []; const add = partAdder(parts);
  const mount = add(new THREE.Mesh(lathe([[0, 0.55], [1.12, 0.55], [1.17, 0.54], [1.2, 0.51], [1.205, 0.46], [1.19, 0.42], [0, 0.42]], 128), MAT.matteDS), 0, [0, 1.45, 0], { label: 'Mount plate', anchor: [0.9, 0.5, 0.6] });
  const housing = new THREE.Mesh(lathe([
    [1.1, 0.42], [1.17, 0.418], [1.205, 0.4], [1.228, 0.35], [1.244, 0.22], [1.254, 0.08], [1.25, -0.03], [1.232, -0.12], [1.19, -0.2], [1.12, -0.26], [1.03, -0.3], [0.95, -0.315], [0.905, -0.305], [0.895, -0.28],
    [0.94, -0.25], [1.06, -0.19], [1.15, -0.08], [1.19, 0.08], [1.17, 0.3], [1.12, 0.39], [1.1, 0.42]], 128), MAT.white);
  g.add(mount, housing); add(housing, 0, [0, 0.75, 0], { label: 'Aluminum housing', anchor: [-1.0, 0.2, 0.7] });
  // chevron logo + status LED on the front
  const ls = new THREE.Shape(); ls.moveTo(-0.11, 0.07); ls.lineTo(-0.055, 0.07); ls.lineTo(0, -0.01); ls.lineTo(0.055, 0.07); ls.lineTo(0.11, 0.07); ls.lineTo(0, -0.09); ls.closePath();
  const logo = new THREE.Mesh(new THREE.ExtrudeGeometry(ls, { depth: 0.01, bevelEnabled: false }), MAT.logo);
  logo.position.set(0, 0.17, 1.238); logo.rotation.x = -0.05; housing.add(logo);
  const led = mesh(new THREE.SphereGeometry(0.016, 64, 40), MAT.led.clone(), 0, -0.02, 1.252); housing.add(led);
  housing.add(mesh(new THREE.SphereGeometry(0.013, 32, 20), MAT.lens, 0, 0.065, 1.25)); // ambient-light sensor dot above the status LED, as on the CD63
  housing.add(mesh(new THREE.SphereGeometry(0.014, 64, 40), MAT.black, 0, 0.06, 1.253));
  housing.add(at(rot(new THREE.Mesh(new THREE.TorusGeometry(1.238, 0.004, 12, 96), MAT.logo), PI / 2, 0, 0), 0, 0.32, 0));
  const shroud = new THREE.Mesh(new THREE.RingGeometry(0.63, 0.91, 96), MAT.matteDS); shroud.rotation.x = PI / 2; shroud.position.y = -0.3; housing.add(shroud);
  // bubble + shroud
  const bubble = grp(mesh(new THREE.SphereGeometry(0.9, 64, 40, 0, PI * 2, PI / 2, PI / 2), MAT.smoke), at(cyl(0.905, 0.05, MAT.black, 'y', 96), 0, 0.01, 0)); bubble.children[0].scale.y = 1.12;
  at(bubble, 0, -0.285, 0); g.add(bubble); add(bubble, 0, [0, -1.15, 0], { label: 'Optical dome', anchor: [0.62, -0.66, 0.0] });
  const gasket = mesh(new THREE.TorusGeometry(0.93, 0.022, 12, 96), MAT.rubber, 0, -0.29, 0); gasket.rotation.x = PI / 2;
  g.add(gasket); add(gasket, 0, [0, -0.5, 0], { label: 'Gasket', anchor: [-0.93, 0, 0] });
  const screws = new THREE.Group();
  for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4; screws.add(at(cyl(0.035, 0.24, MAT.alu), Math.cos(a) * 0.98, 0.46, Math.sin(a) * 0.98)); }
  g.add(screws); add(screws, 0, [0, 2.15, 0]);

  // gimbal ball with lens module (local +Z is the optical axis)
  const gimbal = new THREE.Group(); gimbal.position.set(0, -0.36, 0); gimbal.rotation.x = 0.62; g.add(gimbal);
  gimbal.add(mesh(new THREE.SphereGeometry(0.62, 64, 40), MAT.matte));
  gimbal.add(at(cyl(0.29, 0.06, MAT.black, 'z'), 0, 0, 0.6));
  const lensMod = new THREE.Group();
  lensMod.add(at(cyl(0.22, 0.34, MAT.black, 'z'), 0, 0, 0.52));
  // motorized varifocal (5.9-13.3 mm): front group travels on zoom
  const zoom = new THREE.Group(); lensMod.add(zoom);
  zoom.add(at(cyl(0.205, 0.12, MAT.black, 'z'), 0, 0, 0.64));
  zoom.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 12, 96), MAT.alu), 0, 0, 0.7));
  lensMod.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 12, 96), MAT.gunmetal), 0, 0, 0.66));
  lensMod.add(at(cyl(0.12, 0.01, MAT.lens, 'z'), 0, 0, 0.6));
  lensMod.add(at(cyl(0.05, 0.012, MAT.black, 'z'), 0, 0, 0.605));
  const glass = mesh(new THREE.SphereGeometry(0.19, 64, 40, 0, PI * 2, 0, PI * 0.32), MAT.lens, 0, 0, 0.56); glass.rotation.x = PI / 2; zoom.add(glass);
  lensMod.add(at(cyl(0.06, 0.16, MAT.gunmetal, 'x'), 0.27, 0.06, 0.44)); // focus motor
  lensMod.add(at(cyl(0.065, 0.02, MAT.copper, 'x'), 0.36, 0.06, 0.44));
  gimbal.add(lensMod); add(lensMod, 1, [0, 0, 1.45], { label: 'Motorized zoom lens', anchor: [0.27, 0.12, 0.44] });
  const irb = pcb({ round: 0.44, ring: 0.27, seed: 7, passives: 18 });
  for (let k = 0; k < 8; k++) { const a = k * PI / 4 + PI / 8; irb.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8, 0, PI * 2, 0, PI / 2), MAT.irLed), Math.cos(a) * 0.355, 0.013, Math.sin(a) * 0.355)); }
  irb.rotation.x = PI / 2; irb.position.z = 0.5; gimbal.add(irb); add(irb, 2, [0, 0, 0.85], { label: 'IR illuminator board', anchor: [0.36, 0, 0.1] });
  const sens = pcb({ w: 0.36, d: 0.36, seed: 3, passives: 12, chips: [{ x: 0, z: 0, w: 0.15, d: 0.15, h: 0.02, m: MAT.lens }] });
  sens.rotation.x = PI / 2; sens.position.z = 0.3; gimbal.add(sens); add(sens, 2, [-1.05, 0.25, 0.75], { label: '1/1.2" image sensor', anchor: [0, 0.02, 0] });
  const ircut = grp(box(0.16, 0.1, 0.12, MAT.gunmetal), at(box(0.12, 0.012, 0.1, MAT.lens), 0, 0.056, 0));
  at(ircut, -0.3, 0.12, 0.36); gimbal.add(ircut); add(ircut, 1, [-0.75, 0.15, 0.45], { label: 'IR-cut actuator', anchor: [0, 0.06, 0] });

  const main = pcb({ round: 0.95, seed: 21, passives: 70, chips: [
    { x: 0, z: 0, w: 0.3, d: 0.3, h: 0.03, spreader: true }, { x: 0.36, z: -0.05, w: 0.18, d: 0.1, h: 0.018, pins: 6 }, { x: 0.36, z: 0.14, w: 0.18, d: 0.1, h: 0.018, pins: 6 },
    { x: -0.36, z: 0.18, w: 0.16, d: 0.12, h: 0.02 }, { x: -0.1, z: -0.48, w: 0.4, d: 0.07, h: 0.06, m: MAT.black }, { x: 0.15, z: 0.5, w: 0.14, d: 0.14, h: 0.05, m: MAT.alu }] });
  at(main, 0, 0.25, 0); g.add(main); add(main, 2, [0, 2.25, 0.15], { rot: [0.35, 0, 0], label: 'Ambarella SoC board', anchor: [0, 0.05, 0] });
  const poe = pcb({ w: 0.8, d: 0.5, seed: 33, passives: 24, chips: [
    { x: -0.24, z: 0, w: 0.22, d: 0.26, h: 0.18, m: MAT.alu }, { x: 0.12, z: 0.1, w: 0.12, d: 0.12, h: 0.1, m: MAT.black }, { x: 0.12, z: -0.12, w: 0.12, d: 0.12, h: 0.1, m: MAT.black }, { x: 0.3, z: 0, w: 0.08, d: 0.08, h: 0.02 }] });
  at(poe, 0, 0.36, -0.1); g.add(poe); add(poe, 2, [0, 3.0, 0.25], { rot: [0.35, 0, 0], label: 'PoE power board', anchor: [0.4, 0.02, 0] });

  return { group: g, parts, gimbal, led, zoom };
}

// ============================================================
// LEVEL LOCK+  (door normal along X; exterior faces -X, bolt throws +Z)
// ============================================================
export function makeLock() {
  // Level Lock Pro. Scale: 1 unit = 40 mm. Door normal is X (exterior faces -X), bolt throws +Z.
  // Door 44 mm, bore 54 mm, backset 60 mm, exterior trim ~57 mm, interior puck ~69 mm, 1" throw.
  const g = new THREE.Group(); const parts = []; const add = partAdder(parts);
  const D = 0.55; // half door thickness
  // exterior: standard keyed deadbolt collar
  const extG = lathe([[0, 0.7], [0.46, 0.7], [0.51, 0.695], [0.545, 0.68], [0.575, 0.655], [0.62, 0.58], [0.69, 0.46], [0.755, 0.32], [0.79, 0.2], [0.8, 0.12], [0.84, 0.075], [0.88, 0.04], [0.89, 0.015], [0.885, 0], [0, 0]], 160); extG.rotateZ(PI / 2);
  const ext = mesh(extG, MAT.brassDS, -D, 0, 0); g.add(ext); add(ext, 0, [-1.6, 0, 0], { label: 'Exterior rose', anchor: [-0.35, 0.7, 0] });
  const keyc = new THREE.Group();
  keyc.add(at(cyl(0.36, 0.04, MAT.brass, 'x'), 0.005, 0, 0));
  keyc.add(at(cyl(0.3, 0.05, MAT.nickel, 'x'), -0.01, 0, 0));
  const kw = new THREE.Shape(); kw.moveTo(-0.022, 0.2); kw.lineTo(0.026, 0.2); kw.lineTo(0.026, 0.07); kw.lineTo(0.008, 0.035); kw.lineTo(0.026, -0.02); kw.lineTo(0.026, -0.15); kw.lineTo(-0.022, -0.15); kw.lineTo(-0.022, -0.05); kw.lineTo(-0.004, -0.012); kw.lineTo(-0.022, 0.045); kw.closePath();
  const kwm = new THREE.Mesh(new THREE.ExtrudeGeometry(kw, { depth: 0.02, bevelEnabled: false }), MAT.rubber); kwm.rotation.y = -PI / 2; kwm.position.x = -0.04; keyc.add(kwm);
  for (let i = 0; i < 5; i++) keyc.add(at(cyl(0.02, 0.012, MAT.black, 'x'), -0.044, 0.23, -0.09 + i * 0.045));
  keyc.add(at(cyl(0.25, 0.9, MAT.nickel, 'x'), 0.45, 0, 0));
  at(keyc, -D - 0.7, 0, 0); g.add(keyc); add(keyc, 0, [-2.9, 0, 0], { label: 'Keyed cylinder', anchor: [0, 0.34, 0] });
  // interior puck + thumbturn
  const intG = lathe([[0, 0.6], [0.6, 0.595], [0.73, 0.575], [0.81, 0.53], [0.85, 0.46], [0.86, 0.16], [0.88, 0.1], [0.92, 0.05], [0.93, 0.015], [0.925, 0], [0, 0]], 160); intG.rotateZ(-PI / 2);
  const int = mesh(intG, MAT.brassDS, D, 0, 0); g.add(int); add(int, 0, [1.7, 0, 0], { label: 'Interior puck', anchor: [0.4, 0.86, 0] });
  const turn = new THREE.Group(); turn.position.x = D + 0.6; g.add(turn);
  // slim fin thumbturn with a rounded crown, like the Lock Pro's
  turn.add(at(rbox(0.3, 0.84, 0.17, 0.08, MAT.brass, 6), 0.14, 0, 0));
  turn.add(at(box(0.02, 0.5, 0.012, MAT.gunmetal), 0.295, 0.0, 0.0));
  const pin = cyl(0.018, 0.01, MAT.rubber, 'x'); pin.position.set(0.6, -0.5, 0.42); int.add(pin);
  add(turn, 0, [2.9, 0, 0], { label: 'Thumbturn', anchor: [0.2, 0.46, 0] });
  // latch housing halves (bore to door edge)
  const half = (sign) => { // brushed-stainless latch housing half with stamped windows and a flange tab at the door edge
    const hg = new THREE.Group(); hg.rotation.z = sign * PI / 2; hg.position.z = 0.72;
    const m = new THREE.Mesh(cylGeo(0.38, 0.38, 1.55, 'z', 48, true, 0, PI), (MAT.stainless || MAT.zinc).clone()); m.material.side = DS; hg.add(m);
    for (const z of [-0.35, 0.2]) { const w = at(box(0.2, 0.012, 0.32, MAT.black), 0.0, 0.381, z); hg.add(w); }   // stamped windows
    hg.add(at(box(0.5, 0.03, 0.06, MAT.stainless || MAT.zinc), 0, 0.37, 0.75));                                       // flange tab
    return hg; };
  const tubeTop = half(1), tubeBot = half(-1); g.add(tubeTop, tubeBot);
  add(tubeTop, 0, [0, 1.1, 0], { label: 'Latch housing', anchor: [0, 0.38, 0.6] }); add(tubeBot, 0, [0, -1.1, 0]);
  // faceplate + bolt shell (carries the CR2)
  const front = new THREE.Group(); front.add(at(rbox(0.63, 1.43, 0.08, 0.04, MAT.brass), 0, 0, 1.5));
  [-0.55, 0.55].forEach((y) => front.add(at(cyl(0.045, 0.085, MAT.gunmetal, 'z'), 0, y, 1.51)));
  const bolt = new THREE.Group(); bolt.position.z = 0.98; front.add(bolt);
  bolt.add(cyl(0.33, 1.05, MAT.brass, 'z')); bolt.add(at(cyl(0.3, 0.02, MAT.nickel, 'z'), 0, 0, 0.53));
  g.add(front); add(front, 0, [0, 2.5, 1.7], { label: 'Bolt', anchor: [0, 0.72, 1.5] });
  const cell = grp(cyl(0.195, 0.68, MAT.battery, 'z'), at(cyl(0.197, 0.06, MAT.nickel, 'z'), 0, 0, 0.31), at(cyl(0.07, 0.04, MAT.nickel, 'z'), 0, 0, 0.36), at(cyl(0.196, 0.08, MAT.accent, 'z'), 0, 0, -0.12));
  at(cell, 0, 0, 0.98); g.add(cell); add(cell, 1, [0, 2.5, 0.25], { label: 'CR2 cell', anchor: [0, 0.2, 0] });
  // motor module in the cross bore (flat tailpiece slot + two arch openings)
  const mod = new THREE.Group(); g.add(mod);
  mod.add(cyl(0.66, 1.0, new THREE.MeshPhysicalMaterial({ color: 0x8f9398, metalness: 0.7, roughness: 0.48 }), 'x'));          // die-cast chassis
  for (const x of [0.5, -0.5]) mod.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 8, 64).rotateY(PI / 2), MAT.alu), x, 0, 0)); // machined face rings
  [1, -1].forEach((sgn) => { const a = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 96, PI * 0.55), MAT.rubber); a.rotation.y = -PI / 2; a.rotation.x = sgn > 0 ? PI * 0.225 : PI * 1.225; a.position.x = -0.505; mod.add(a); });
  mod.add(at(box(0.02, 0.36, 0.08, MAT.rubber), -0.505, 0, 0));
  add(mod, 1, [0, -0.6, -2.2], { label: 'Motor module', anchor: [0, 0.66, 0] });
  const drive = new THREE.Group(); g.add(drive);
  drive.add(at(cyl(0.16, 0.5, MAT.gunmetal, 'z'), 0, 0.18, -0.2)); drive.add(at(cyl(0.15, 0.05, MAT.copper, 'z'), 0, 0.18, -0.47));
  [[0.22, 0.12], [0.15, 0.32], [0.1, 0.48]].forEach(([r, z], k) => { const gr = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 24 + k * 6), MAT.alu); gr.rotation.x = PI / 2; gr.position.set(0, -0.15, z); drive.add(gr);
    for (let t = 0; t < 16; t++) { const a = (t / 16) * PI * 2; drive.add(at(box(0.04, 0.04, 0.06, MAT.alu), Math.cos(a) * (r + 0.015), -0.15 + Math.sin(a) * (r + 0.015), z)); } });
  add(drive, 1, [0, -0.6, -3.6], { label: 'Gear train', anchor: [0, 0.4, 0] });
  // magnetic strike (deeper pocket)
  const strike = new THREE.Group();
  const ss = new THREE.Shape(); ss.moveTo(-0.32, -0.75); ss.lineTo(0.32, -0.75); ss.lineTo(0.32, 0.75); ss.lineTo(-0.32, 0.75); ss.closePath();
  const sh = new THREE.Path(); sh.absellipse(0, 0, 0.36, 0.36, 0, PI * 2, true); ss.holes.push(sh);
  strike.add(new THREE.Mesh(new THREE.ExtrudeGeometry(ss, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.012, bevelSegments: 2 }), MAT.brass));
  strike.add(at(new THREE.Mesh(cylGeo(0.37, 0.37, 0.8, 'z', 40, true), MAT.brassDS), 0, 0, 0.42));
  strike.add(at(cyl(0.1, 0.06, MAT.nickel, 'z'), 0, -0.55, 0.06));
  strike.position.z = 2.35; strike.visible = false; g.add(strike); add(strike, 0, [0, 2.5, 2.6], { label: 'Magnetic strike', anchor: [0, 0.75, 0] });
  const tailp = at(box(1.8, 0.3, 0.06, MAT.nickel), 0, 0, 0); g.add(tailp); add(tailp, 0, [0, -2.2, 0], { label: 'Tailpiece', anchor: [0.8, 0, 0] });
  // electronics in the interior puck
  const board = pcb({ round: 0.72, seed: 41, passives: 52, chips: [{ x: 0.0, z: 0.14, w: 0.24, d: 0.24, h: 0.026 }, { x: -0.3, z: -0.22, w: 0.12, d: 0.12, h: 0.02 }, { x: 0.34, z: -0.28, w: 0.2, d: 0.06, h: 0.02, m: MAT.gold }, { x: 0.22, z: 0.42, w: 0.14, d: 0.1, h: 0.05, m: MAT.black }] });
  board.rotation.z = -PI / 2; board.position.x = D + 0.45; g.add(board);
  add(board, 2, [2.1, 1.3, -2.0], { rot: [0, -0.6, 0], label: 'Main board · Thread/BLE', anchor: [0.03, 0.5, 0] });
  const spk = grp(cyl(0.26, 0.08, MAT.black, 'x'), at(cyl(0.2, 0.02, MAT.gunmetal, 'x'), 0.05, 0, 0));
  for (let i = 0; i < 37; i++) { const a = i * 2.39996, r = 0.03 * Math.sqrt(i); spk.add(at(cyl(0.012, 0.01, MAT.rubber, 'x'), 0.065, Math.sin(a) * r, Math.cos(a) * r)); } // sunflower-pattern grille
  at(spk, D + 0.75, -0.35, 0.3); g.add(spk); add(spk, 2, [1.6, -1.9, -0.4], { label: 'Speaker', anchor: [0.05, 0.26, 0] });

  return { group: g, parts, bolt, turn, leds: [], strike, throw: 0.63 };
}

// ============================================================
// TRAINER AIRCRAFT  (nose +X)
// ============================================================
function naca(m, p, t, n = 40) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos(PI * i / n)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0, dy = 0;
    if (m > 0) { if (x < p) { yc = m / (p * p) * (2 * p * x - x * x); dy = 2 * m / (p * p) * (p - x); } else { yc = m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x); dy = 2 * m / ((1 - p) ** 2) * (p - x); } }
    const th = Math.atan(dy);
    up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return [...up.reverse(), ...lo.slice(1, -1)];
}
function loft(stations, af, map) {
  const pos = [], idx = [], n = af.length;
  stations.forEach((st) => af.forEach(([ax, ay]) => pos.push(...map(st.xLE - ax * st.chord, st.s, ay * st.chord))));
  for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; const a = i * n + j, b = (i + 1) * n + j, c = i * n + j2, d = (i + 1) * n + j2; idx.push(a, b, c, b, d, c); }
  const cap = (i, flip) => {
    const base = pos.length / 3; let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < n; j++) { const k = (i * n + j) * 3; cx += pos[k]; cy += pos[k + 1]; cz += pos[k + 2]; }
    for (let j = 0; j < n; j++) { const k = (i * n + j) * 3; pos.push(pos[k], pos[k + 1], pos[k + 2]); }
    pos.push(cx / n, cy / n, cz / n); const c = base + n;
    for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; flip ? idx.push(c, base + j2, base + j) : idx.push(c, base + j, base + j2); }
  };
  cap(0, false); cap(stations.length - 1, true);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
// Cessna 152 (the production successor of the one-off Model 142 prototype). Built in meters, then scaled.
// Length 7.34 m, span 10.16 m, height 2.59 m, chord ~1.6 m, NACA 2412 wing, Fowler flaps 0-30 deg, 69 in prop.
const crInterp = (arr, t) => { const n = arr.length, i = Math.min(n - 2, Math.max(0, Math.floor(t))), f = t - i;
  const p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(n - 1, i + 2)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f); };
function cessnaPaint() {
  const W = 2048, H = 1024; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#f3f2ee'; x.fillRect(0, 0, W, H);
  // anti-glare panel on the cowl top
  x.fillStyle = '#26292d'; x.fillRect(0.02 * W, (1 - 0.53) * H, 0.1 * W, 0.06 * H);
  const band = (v0, v1, color) => { x.fillStyle = color; x.beginPath();
    for (let i = 0; i <= 100; i++) { const u = i / 100, v = v0(u); i ? x.lineTo(u * W, (1 - v) * H) : x.moveTo(u * W, (1 - v) * H); }
    for (let i = 100; i >= 0; i--) { const u = i / 100, v = v1(u); x.lineTo(u * W, (1 - v) * H); } x.closePath(); x.fill(); };
  const base = (u) => 0.262 + 0.07 * Math.pow(u, 2.2);
  for (const side of [0, 1]) {
    const m = (f) => (side ? (u) => 1 - f(u) : f);
    band(m((u) => base(u) + 0.022), m((u) => base(u)), '#ff5b1f');
    band(m((u) => base(u) - 0.008), m((u) => base(u) - 0.014), '#2a2d31');
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function makePlane() {
  const outer = new THREE.Group(); const SC = 0.45; const g = new THREE.Group(); g.scale.setScalar(SC); outer.add(g);
  const paint = new THREE.MeshPhysicalMaterial({ map: cessnaPaint(), roughness: 0.32, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.12, side: DS });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f2ee, roughness: 0.32, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.12, side: DS });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0f15, metalness: 0.25, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.9, side: DS });
  // ---- fuselage loft (superellipse sections) ----
  const X = [-0.1, -0.3, -0.5, -0.9, -1.35, -1.8, -2.4, -2.9, -3.4, -4.2, -5.2, -6.2, -7.0, -7.34];
  const Wd = [0.36, 0.66, 0.86, 1.0, 1.06, 1.1, 1.08, 1.0, 0.84, 0.64, 0.45, 0.3, 0.17, 0.07];
  const Hd = [0.36, 0.64, 0.84, 1.05, 1.45, 1.6, 1.58, 1.4, 1.1, 0.86, 0.64, 0.46, 0.34, 0.22];
  const Yc = [0.0, 0.0, 0.0, 0.05, 0.25, 0.32, 0.32, 0.31, 0.32, 0.33, 0.35, 0.38, 0.4, 0.42];
  const NS = X.length - 1, sp = (v, n) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
  const F = (t, th, k = 1) => { const n = 2.9, w = crInterp(Wd, t) * k, h = crInterp(Hd, t) * k, yc = crInterp(Yc, t);
    return [crInterp(X, t), yc + (h / 2) * sp(Math.sin(th), n), (w / 2) * sp(Math.cos(th), n)]; };
  const tOfX = (x) => { let lo = 0, hi = NS; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; crInterp(X, m) > x ? (lo = m) : (hi = m); } return (lo + hi) / 2; };
  const surf = (t0, t1, th0, th1, k, nu, nt, uv) => { const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nt; j++) { const t = t0 + (t1 - t0) * i / nu, th = th0 + (th1 - th0) * j / nt; pos.push(...F(t, th, k)); uvs.push(t / NS, (th + PI / 2) / (2 * PI)); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nt; j++) { const a = i * (nt + 1) + j, b = a + nt + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };
  g.add(new THREE.Mesh(surf(0, NS, -PI / 2, 1.5 * PI, 1, 140, 80, true), paint));
  // windows: windshield, door + rear side windows, omni-vision rear window
  const win = (x0, x1, a0, a1) => g.add(new THREE.Mesh(surf(tOfX(x0), tOfX(x1), a0, a1, 1.008, 16, 16), glass));
  win(-0.93, -1.62, 0.17 * PI, 0.83 * PI);
  [[0.06, 0.3], [0.7, 0.94]].forEach(([a, b]) => { win(-1.64, -2.3, a * PI, b * PI); win(-2.38, -2.86, (a + 0.03) * PI, (b - 0.03) * PI); });
  win(-2.8, -3.3, 0.32 * PI, 0.68 * PI);
  // cowl inlets + landing light
  [-0.19, 0.19].forEach((z) => { const d = mesh(new THREE.CircleGeometry(0.075, 24), MAT.rubber, -0.205, 0.05, z); d.rotation.y = PI / 2; d.scale.set(1, 0.7, 1); g.add(d); });
  const llight = mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(5) }), -0.2, -0.12, 0); llight.rotation.y = PI / 2; g.add(llight);
  // registration
  [1, -1].forEach((sd) => { const r = decal('N152BH', 0.2, { font: '700 110px Archivo', spacing: 8, color: '#2a2d31' }); const t = tOfX(-4.7);
    r.position.set(-4.7, crInterp(Yc, t) + 0.05, sd * (crInterp(Wd, t) / 2 + 0.012)); if (sd < 0) r.rotation.y = PI; g.add(r); });
  // spinner + prop (69 in, 2 blades, painted tips)
  const spinner = new THREE.Mesh(lathe([[0.2, 0], [0.195, 0.08], [0.15, 0.22], [0.07, 0.32], [0, 0.35]], 48), white); spinner.geometry.rotateZ(-PI / 2); spinner.position.x = -0.12; g.add(spinner);
  const prop = new THREE.Group(); prop.position.x = 0.0; g.add(prop);
  for (let k = 0; k < 2; k++) { const b = new THREE.Group(); b.rotation.x = k * PI; prop.add(b);
    const bl = rbox(0.04, 0.72, 0.13, 0.02, MAT.black, 3); bl.position.y = 0.5; bl.rotation.y = 0.32; b.add(bl);
    const tip = rbox(0.042, 0.1, 0.12, 0.02, MAT.accent, 2); tip.position.y = 0.83; tip.rotation.y = 0.28; b.add(tip); }
  const blur = mesh(new THREE.CircleGeometry(0.9, 64), MAT.blur, 0.02, 0, 0); blur.rotation.y = PI / 2; g.add(blur);
  // ---- wing: NACA 2412, constant chord inboard, tapered outer panel, 1.7 deg dihedral ----
  const af = naca(0.02, 0.4, 0.12, 36), af0 = naca(0, 0.3, 0.1, 24), af9 = naca(0, 0.3, 0.09, 24);
  const SPAN = 5.08, BRK = 2.55, dih = Math.tan(THREE.MathUtils.degToRad(1.7));
  const wingAt = (s) => { const a = Math.max(0, (Math.abs(s) - BRK) / (SPAN - BRK)); return { chord: 1.6 - 0.48 * a, xLE: -1.32 - 0.48 * a, y: 1.2 + Math.abs(s) * dih }; };
  const ws = []; for (let i = -24; i <= 24; i++) { const s = (i / 24) * SPAN; const w = wingAt(s); ws.push({ s, chord: w.chord, xLE: w.xLE, y: w.y }); }
  g.add(new THREE.Mesh(loft(ws, af, (x, s, ty) => [x, wingAt(s).y + ty, s]), white));
  // flaps (Fowler): hidden in the wing trailing edge, slide aft and rotate down
  const flaps = [1, -1].map((sd) => { const piv = new THREE.Group(); piv.position.set(-2.4, 1.17, 0); g.add(piv);
    const st = []; for (let i = 0; i <= 6; i++) { const s = sd * (0.6 + (BRK - 0.65) * i / 6); st.push({ s, chord: 0.5, xLE: 0 }); }
    piv.add(new THREE.Mesh(loft(st, af0, (x, s, ty) => [x, ty + Math.abs(s) * dih, s]), white)); piv.userData.base = piv.position.clone(); return piv; });
  // struts, step, fuel caps, pitot
  [1, -1].forEach((sd) => {
    const a = new THREE.Vector3(-1.95, -0.2, sd * 0.5), b = new THREE.Vector3(-1.88, wingAt(BRK).y - 0.06, sd * BRK);
    const d = b.clone().sub(a); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, d.length(), 16), white);
    st.scale.set(1, 1, 0.45); st.position.copy(a).addScaledVector(d, 0.5); st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(st);
    g.add(at(cyl(0.05, 0.02, MAT.gunmetal), -1.95, wingAt(1.9).y + 0.1, sd * 1.9));
    if (sd < 0) { g.add(at(box(0.16, 0.02, 0.1, MAT.gunmetal), -1.93, 0.2, -0.95)); g.add(at(cyl(0.012, 0.32, MAT.alu, 'x'), -1.3, wingAt(3.6).y - 0.12, -3.6)); }
  });
  // ---- empennage (152: tall swept fin + dorsal fillet, big rudder with a balance horn, low stabilator-free tailplane) ----
  const TY = 0.42; // tailcone centerline at the tail
  const stabAt = (s) => { const a = Math.abs(s) / 1.52; return { chord: 0.7 - 0.16 * a, xLE: -6.22 - 0.1 * a }; };
  const hs = []; for (let i = -8; i <= 8; i++) { const s = (i / 8) * 1.52; hs.push({ s, ...stabAt(s) }); }
  g.add(new THREE.Mesh(loft(hs, af9, (x, s, ty) => [x, TY + ty, s]), white));
  const elevator = new THREE.Group(); elevator.position.set(-6.93, TY, 0); g.add(elevator);
  const es = []; for (let i = -8; i <= 8; i++) { const s = (i / 8) * 1.5; es.push({ s, chord: 0.48 - 0.1 * Math.abs(s) / 1.5, xLE: -0.01 }); }
  elevator.add(new THREE.Mesh(loft(es, af9, (x, s, ty) => [x, ty, s]), white));
  elevator.add(at(box(0.2, 0.012, 0.32, MAT.logo), -0.36, 0.0, 0.75)); // trim tab
  // fin: LE swept ~38 deg from the dorsal to the tip, hinge line nearly vertical
  const FIN0 = 0.62, FIN1 = 1.66, hingeAt = (y) => -6.8 - 0.06 * (y - FIN0) / (FIN1 - FIN0);
  const fs = []; for (let i = 0; i <= 10; i++) { const y = FIN0 + (i / 10) * (FIN1 - 0.1 - FIN0), xle = -5.35 - (y - FIN0) * 1.05; fs.push({ s: y, chord: xle - hingeAt(y), xLE: xle }); }
  g.add(new THREE.Mesh(loft(fs, af9, (x, s, ty) => [x, s, ty]), white));
  // dorsal fillet
  const dorsal = new THREE.Shape(); dorsal.moveTo(0, 0); dorsal.lineTo(-1.25, 0); dorsal.lineTo(-1.25, 0.12); dorsal.closePath();
  const dg = new THREE.ExtrudeGeometry(dorsal, { depth: 0.06, bevelEnabled: false }); dg.translate(0, 0, -0.03); g.add(at(new THREE.Mesh(dg, white), -4.1, crInterp(Yc, tOfX(-4.6)) + crInterp(Hd, tOfX(-4.6)) / 2 - 0.02, 0));
  // rudder: wide chord, trailing edge near vertical, balance horn reaching forward over the fin tip
  const rudder = new THREE.Group(); rudder.position.set(hingeAt(FIN0), 0, 0); g.add(rudder);
  const rs = []; for (let i = 0; i <= 12; i++) { const y = 0.3 + (i / 12) * (FIN1 + 0.05 - 0.3); const horn = y > FIN1 - 0.14 ? 0.32 * Math.min(1, (y - (FIN1 - 0.14)) / 0.1) : 0;
    const top = Math.max(0, (y - (FIN1 - 0.02)) / 0.07); rs.push({ s: y, chord: Math.max(0.05, 0.52 + horn - 0.04 * (i / 12) - top * 0.4), xLE: 0.02 + horn }); }
  rudder.add(new THREE.Mesh(loft(rs, af9, (x, s, ty) => [x, s, ty]), white));
  // paint: fin stripes that continue the cheatline + colored tip
  [1, -1].forEach((sd) => {
    const band = (y0, y1, dx, col) => { const sh = new THREE.Shape(); sh.moveTo(-5.35 - (y0 - FIN0) * 1.05, y0); sh.lineTo(-7.32, y0 + dx); sh.lineTo(-7.32, y1 + dx); sh.lineTo(-5.35 - (y1 - FIN0) * 1.05, y1); sh.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), col); m.position.z = sd * 0.058; g.add(m); };
    band(1.05, 1.17, 0.1, MAT.accent); band(1.2, 1.235, 0.1, MAT.gunDS);
  });
  // ---- lights + antennas ----
  const lamp = (c, k, x, y, z, r = 0.04) => { const m = mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }), x, y, z); g.add(m); return m; };
  lamp(0xff2a1a, 5, -1.5, wingAt(SPAN).y, -SPAN - 0.02); lamp(0x22ff66, 5, -1.5, wingAt(SPAN).y, SPAN + 0.02); lamp(0xffffff, 4, -7.36, 1.0, 0, 0.03);
  const beacon = lamp(0x330604, 1, -6.55, 1.62, 0, 0.05);
  g.add(at(cyl(0.008, 0.55, MAT.black), -3.3, 1.18, 0)); g.add(at(rot(rbox(0.22, 0.14, 0.015, 0.006, MAT.gunmetal), 0, 0, -0.4), -2.0, -0.5, 0));
  g.add(at(rot(cyl(0.03, 0.22, MAT.gunmetal, 'y'), 0, 0, 0.6), -0.75, -0.42, 0.12));
  // ---- fixed tricycle gear: spring-steel mains, oleo nose strut, wheel fairings ----
  const wheels = [];
  const wheel = (x, y, z, r) => { const w = grp(cyl(r, 0.14, MAT.rubber, 'z', 32), cyl(r * 0.55, 0.15, MAT.alu, 'z', 24)); w.position.set(x, y, z); g.add(w); wheels.push(w);
    const pant = mesh(new THREE.SphereGeometry(1, 64, 40), white, x - 0.04, y + 0.02, z); pant.scale.set(r * 1.9, r * 1.0, 0.11); g.add(pant); return w; };
  [1, -1].forEach((sd) => { const a = new THREE.Vector3(-2.05, -0.42, sd * 0.32), b = new THREE.Vector3(-2.1, -0.66, sd * 0.98); const d = b.clone().sub(a);
    const leg = box(0.12, d.length(), 0.03, MAT.aluDark); leg.position.copy(a).addScaledVector(d, 0.5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(leg);
    wheel(-2.1, -0.68, sd * 1.02, 0.24); });
  g.add(at(cyl(0.04, 0.4, MAT.alu), -0.52, -0.46, 0)); wheel(-0.5, -0.73, 0, 0.19);
  outer.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return {
    group: outer, prop, blur, wheels, beacon, wheelBottom: -0.92 * SC, wheelR: 0.24 * SC, scale: SC,
    anchors: { lift: [-0.86, 0.72, 0], weight: [-0.86, -0.12, 0], thrust: [0.2, -0.02, 0], drag: [-3.45, 0.35, 0] },
    setFlaps(deg) { const f = deg / 30; flaps.forEach((p) => { p.position.copy(p.userData.base); p.position.x -= 0.26 * Math.min(1, f * 1.6); p.position.y -= 0.06 * f; p.rotation.z = THREE.MathUtils.degToRad(deg); }); },
    setElevator(deg) { elevator.rotation.z = -THREE.MathUtils.degToRad(deg); },
    setRudder(deg) { rudder.rotation.y = THREE.MathUtils.degToRad(deg); },
  };
}

// ============================================================
// RAILBLAZER: track sweep + single-file train
// ============================================================
const IBOX = [[-0.1, 0.17], [0.1, 0.17], [0.1, 0.13], [0.045, 0.13], [0.045, -0.13], [0.08, -0.13], [0.08, -0.17], [-0.08, -0.17], [-0.08, -0.13], [-0.045, -0.13], [-0.045, 0.13], [-0.1, 0.13]];

export function buildTrack(curve, { samples = 900, closed = false, bank = () => 0, rollKeys = null, upSpan = null, profile = IBOX, mat } = {}) {
  curve.arcLengthDivisions = Math.max(curve.arcLengthDivisions || 200, samples * 24); curve.needsUpdate = true; curve.updateArcLengths();
  let P = curve.getSpacedPoints(samples); if (closed) P = P.slice(0, -1);
  const N = P.length, T = [], U = [], B = [];
  for (let i = 0; i < N; i++) {
    const a = closed ? P[(i - 1 + N) % N] : P[Math.max(0, i - 1)], b = closed ? P[(i + 1) % N] : P[Math.min(N - 1, i + 1)];
    T.push(b.clone().sub(a).normalize());
  }
  let u = new THREE.Vector3(0, 1, 0); u.addScaledVector(T[0], -u.dot(T[0])); if (u.lengthSq() < 1e-6) u.set(0, 0, 1); u.normalize(); U.push(u.clone());
  const ax = new THREE.Vector3();
  for (let i = 1; i < N; i++) {
    ax.crossVectors(T[i - 1], T[i]); const l = ax.length();
    if (l > 1e-7) u.applyAxisAngle(ax.divideScalar(l), Math.atan2(l, T[i - 1].dot(T[i])));
    u.addScaledVector(T[i], -u.dot(T[i])).normalize(); U.push(u.clone());
  }
  if (closed) { // close twist seam
    const ue = u.clone(); ax.crossVectors(T[N - 1], T[0]); const l = ax.length(); if (l > 1e-7) ue.applyAxisAngle(ax.divideScalar(l), Math.atan2(l, T[N - 1].dot(T[0])));
    ue.addScaledVector(T[0], -ue.dot(T[0])).normalize();
    const ang = Math.atan2(new THREE.Vector3().crossVectors(U[0], ue).dot(T[0]), U[0].dot(ue));
    for (let i = 0; i < N; i++) U[i].applyAxisAngle(T[i], -ang * i / N);
  }
  if (rollKeys) {
    // rollKeys: [{u (arc fraction), deg}] = rider roll relative to WORLD up (0 upright, +right, 180 inverted).
    // Convert each key into a roll about the transported frame, unwrap, and blend between keys.
    const up = new THREE.Vector3(0, 1, 0), ref = new THREE.Vector3(), tg = new THREE.Vector3(), cr = new THREE.Vector3();
    const ks = [];
    for (const k of rollKeys) {
      const i = Math.round(k.u * (N - 1)); if (Math.abs(T[i].y) > 0.9) continue;
      ref.copy(up).addScaledVector(T[i], -up.dot(T[i])).normalize();
      tg.copy(ref).applyAxisAngle(T[i], THREE.MathUtils.degToRad(k.deg));
      let r = Math.atan2(cr.crossVectors(U[i], tg).dot(T[i]), U[i].dot(tg));
      if (ks.length) { const prev = ks[ks.length - 1].r; while (r - prev > PI) r -= 2 * PI; while (r - prev < -PI) r += 2 * PI; }
      ks.push({ i, r });
    }
    if (ks.length) {
      let k = 0;
      for (let i = 0; i < N; i++) {
        while (k < ks.length - 1 && ks[k + 1].i <= i) k++;
        let r; if (i <= ks[0].i) r = ks[0].r; else if (k >= ks.length - 1) r = ks[ks.length - 1].r;
        else { const a = ks[k], b = ks[k + 1]; const f = (i - a.i) / Math.max(1, b.i - a.i); r = a.r + (b.r - a.r) * (f * f * (3 - 2 * f)); }
        U[i].applyAxisAngle(T[i], r);
      }
    }
  }
  if (upSpan) {
    // upSpan: {u0, u1, deg(point)} = exact rider roll vs WORLD up inside the span (heartline rolls); eased in before, held after.
    const up = new THREE.Vector3(0, 1, 0), tg = new THREE.Vector3(), cr = new THREE.Vector3();
    const i0 = Math.round(upSpan.u0 * (N - 1)), i1 = Math.round(upSpan.u1 * (N - 1)), iR = Math.max(0, i0 - Math.round(0.015 * (N - 1)));
    const R = new Float32Array(N); let prev = null;
    for (let i = i0; i <= i1; i++) {
      tg.copy(up).addScaledVector(T[i], -up.dot(T[i])).normalize().applyAxisAngle(T[i], THREE.MathUtils.degToRad(upSpan.deg(P[i])));
      let r = Math.atan2(cr.crossVectors(U[i], tg).dot(T[i]), U[i].dot(tg));
      if (prev != null) { while (r - prev > PI) r -= 2 * PI; while (r - prev < -PI) r += 2 * PI; }
      R[i] = prev = r;
    }
    for (let i = iR; i < i0; i++) { const f = (i - iR) / Math.max(1, i0 - iR); R[i] = R[i0] * f * f * (3 - 2 * f); }
    for (let i = i1 + 1; i < N; i++) R[i] = R[i1];
    for (let i = iR; i < N; i++) U[i].applyAxisAngle(T[i], R[i]);
  }
  for (let i = 0; i < N; i++) { U[i].applyAxisAngle(T[i], bank(i / (N - 1))); B.push(new THREE.Vector3().crossVectors(T[i], U[i]).normalize()); }
  let length = 0; const segs = closed ? N : N - 1; const CUM = [0]; for (let i = 0; i < segs; i++) { length += P[i].distanceTo(P[(i + 1) % N]); CUM.push(length); }
  // sweep geometry with hard profile edges
  let pr = profile.slice(); let area = 0; for (let k = 0; k < pr.length; k++) { const a = pr[k], b = pr[(k + 1) % pr.length]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area < 0) pr.reverse();
  const pos = [], nor = [], idx = []; const M = closed ? N + 1 : N;
  for (let k = 0; k < pr.length; k++) {
    const a = pr[k], b = pr[(k + 1) % pr.length]; const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy); const nz = dy / l, ny = -dz / l;
    const base = pos.length / 3;
    for (let i = 0; i < M; i++) {
      const ii = i % N, p = P[ii], uu = U[ii], bb = B[ii];
      for (const q of [a, b]) pos.push(p.x + bb.x * q[0] + uu.x * q[1], p.y + bb.y * q[0] + uu.y * q[1], p.z + bb.z * q[0] + uu.z * q[1]);
      const nx = bb.x * nz + uu.x * ny, nyy = bb.y * nz + uu.y * ny, nzz = bb.z * nz + uu.z * ny; nor.push(nx, nyy, nzz, nx, nyy, nzz);
    }
    for (let i = 0; i < M - 1; i++) { const v = base + i * 2; idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx);
  const meshT = new THREE.Mesh(geo, mat || MAT.track); meshT.castShadow = true;
  // web stiffener plates + top-flange splice plates, instanced along the rail
  const step = Math.max(2, Math.round(N / (length / 0.55))); const cnt = Math.floor(N / step);
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.25, 0.155), mat || MAT.track, cnt);
  const splice = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.012, 0.21), MAT.gunmetal, Math.ceil(cnt / 6));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), bb = new THREE.Vector3();
  let si = 0;
  for (let k = 0; k < cnt; k++) {
    const i = k * step; bb.crossVectors(T[i], U[i]).normalize(); m4.makeBasis(T[i], U[i], bb); q.setFromRotationMatrix(m4);
    m4.compose(P[i], q, sc); plates.setMatrixAt(k, m4);
    if (k % 6 === 0) { m4.compose(P[i].clone().addScaledVector(U[i], 0.176), q, sc); splice.setMatrixAt(si++, m4); }
  }
  splice.count = si; plates.castShadow = true; meshT.add(plates, splice);
  const tmp = { p: new THREE.Vector3(), t: new THREE.Vector3(), u: new THREE.Vector3() };
  function sample(s, out = tmp) {
    if (closed) s = ((s % length) + length) % length; else s = Math.max(0, Math.min(length - 1e-4, s));
    let lo = 0, hi = CUM.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CUM[m] <= s) lo = m; else hi = m; }
    const i0 = lo % N, i1 = closed ? (lo + 1) % N : Math.min(N - 1, lo + 1), fr = (s - CUM[lo]) / Math.max(1e-6, CUM[lo + 1] - CUM[lo]);
    out.p.lerpVectors(P[i0], P[i1], fr); out.t.lerpVectors(T[i0], T[i1], fr).normalize(); out.u.lerpVectors(U[i0], U[i1], fr).normalize();
    return out;
  }
  return { mesh: meshT, P, T, U, B, N, length, closed, sample };
}

export function supportsFor(track, { every = 14, skip = () => false, ground = 0 } = {}) {
  const geos = [];
  for (let i = 4; i < track.N - 4; i += every) {
    if (skip(i / track.N) || Math.abs(track.U[i].y) < 0.55) continue;
    const p = track.P[i], u = track.U[i]; const top = p.clone().addScaledVector(u, u.y > 0 ? -0.17 : 0.17); const h = top.y - ground;
    if (h < 0.5) continue;
    const c = new THREE.CylinderGeometry(0.09, 0.13, h, 10); c.translate(top.x, ground + h / 2, top.z); geos.push(c);
    const f = new THREE.BoxGeometry(0.5, 0.12, 0.5); f.translate(top.x, ground + 0.06, top.z); geos.push(f);
    const k = new THREE.BoxGeometry(0.16, 0.16, 0.36); k.translate(top.x, top.y - 0.04, top.z); geos.push(k);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), MAT.support); m.castShadow = true; m.receiveShadow = true; return m;
}

function makeRider(seed) {
  const R = rng(seed); const m = MAT.riders[Math.floor(R() * MAT.riders.length)]; const sk = MAT.skin[Math.floor(R() * MAT.skin.length)]; const r = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 6, 14), m); torso.scale.set(0.85, 1, 1.25); at(torso, -0.12, 0.74, 0); torso.rotation.z = 0.08; r.add(torso);
  r.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 12), sk), -0.1, 0.93, 0));
  r.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.075, 64, 40), sk), -0.09, 1.01, 0));
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.079, 64, 40, 0, PI * 2, 0, PI * 0.5), MAT.riders[5]); at(hair, -0.1, 1.02, 0); hair.rotation.z = 0.35; r.add(hair);
  const up = R() < 0.7;
  [-1, 1].forEach((s) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.3, 4, 10), up ? sk : m);
    if (up) { arm.position.set(-0.06, 1.04, s * 0.17); arm.rotation.set(s * -0.4, 0, 0.12); r.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), sk), -0.03, 1.22, s * 0.24)); }
    else { arm.position.set(0.05, 0.68, s * 0.14); arm.rotation.set(0, 0, -1.15); }
    r.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), m), -0.11, 0.86, s * 0.12));
    r.add(arm);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, 4, 10), MAT.riders[1]); thigh.position.set(0.0, 0.47, s * 0.14); thigh.rotation.set(s * 0.25, 0, -1.25); r.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 10), MAT.riders[1]); shin.position.set(0.14, 0.33, s * 0.2); shin.rotation.set(s * 0.2, 0, -0.25); r.add(shin);
  });
  return r;
}
export function makeCar(front, riders, seed) {
  const c = new THREE.Group();
  c.add(at(rbox(0.8, 0.17, 0.34, 0.06, MAT.yellow), 0, 0.3, 0));
  [-1, 1].forEach((s) => {
    c.add(at(box(0.36, 0.3, 0.035, MAT.gunmetal), 0, 0.06, s * 0.125));
    c.add(at(cyl(0.05, 0.03, MAT.rubber, 'z', 16), -0.1, 0.0, s * 0.105)); c.add(at(cyl(0.05, 0.03, MAT.rubber, 'z', 16), 0.1, 0.0, s * 0.105));
    c.add(at(rbox(0.22, 0.04, 0.13, 0.015, MAT.seat), 0.18, 0.2, s * 0.24));
  });
  c.add(at(rbox(0.44, 0.1, 0.24, 0.045, MAT.seat), -0.02, 0.43, 0));
  c.add(at(rbox(0.09, 0.42, 0.3, 0.04, MAT.seat), -0.3, 0.63, 0));
  c.add(at(rbox(0.06, 0.24, 0.07, 0.025, MAT.yellow), 0.16, 0.5, 0));
  c.add(at(rbox(0.1, 0.07, 0.28, 0.03, MAT.seat), 0.12, 0.63, 0));
  if (front) {
    const nose = new THREE.Mesh(lathe([[0.17, 0], [0.165, 0.12], [0.13, 0.3], [0.07, 0.43], [0, 0.47]], 40), MAT.yellow);
    nose.geometry.rotateZ(-PI / 2); nose.scale.set(1, 0.85, 1.15); nose.position.set(0.38, 0.3, 0); c.add(nose);
    c.add(at(box(0.02, 0.06, 0.36, MAT.seat), 0.4, 0.3, 0));
    // ATV-style front: grille, headlights, bumper
    c.add(at(rbox(0.06, 0.16, 0.3, 0.02, MAT.seat), 0.62, 0.33, 0));
    for (let i = 0; i < 4; i++) c.add(at(box(0.065, 0.012, 0.24, MAT.gunmetal), 0.625, 0.28 + i * 0.03, 0));
    [-0.11, 0.11].forEach((z) => c.add(at(rot(new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d8).multiplyScalar(4) })), 0, PI / 2, 0), 0.66, 0.38, z)));
    c.add(at(rbox(0.05, 0.05, 0.42, 0.02, MAT.seat), 0.7, 0.2, 0));
  }
  // handlebars
  c.add(at(cyl(0.012, 0.36, MAT.seat, 'z'), 0.2, 0.62, 0));
  if (riders) c.add(makeRider(seed * 7 + 3));
  c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return c;
}
export function makeTrain(n, { riders = true } = {}) {
  const group = new THREE.Group(); const cars = [];
  for (let i = 0; i < n; i++) { const c = makeCar(i === 0, riders, i + 1); group.add(c); cars.push(c); }
  return { group, cars, spacing: 0.96 };
}
const _m = new THREE.Matrix4(), _b = new THREE.Vector3();
export function placeTrain(train, track, s) {
  train.cars.forEach((c, i) => {
    const smp = track.sample(s - i * train.spacing);
    _b.crossVectors(smp.t, smp.u).normalize();
    _m.makeBasis(smp.t, smp.u, _b); c.quaternion.setFromRotationMatrix(_m); c.position.copy(smp.p);
  });
}


// Swap the procedural Cessna for the Blender GLB (same meters, same axes) and rebind its controls.
export function upgradePlane(pl, gltfScene) {
  const inner = pl.group.children[0]; const src = gltfScene.clone(true);
  inner.children.forEach((c) => { if (c !== pl.blur) c.visible = false; });
  inner.add(src);
  const N = (n) => src.getObjectByName(n);
  const flaps = ['Flap_L', 'Flap_R'].map(N).filter(Boolean); flaps.forEach((f) => (f.userData.base = f.position.clone()));
  const elev = N('Elevator'), rud = N('Rudder'), prop = N('Prop');
  if (prop) pl.prop = prop;
  pl.wheels = ['Wheel_L', 'Wheel_R', 'Wheel_N'].map(N).filter(Boolean);
  const bc = N('Beacon'); if (bc) { bc.material = new THREE.MeshBasicMaterial({ color: 0x330604 }); pl.beacon = bc; }
  pl.setFlaps = (deg) => { const f = deg / 30; flaps.forEach((p) => { p.position.copy(p.userData.base); p.position.x -= 0.26 * Math.min(1, f * 1.6); p.position.y -= 0.06 * f; p.rotation.z = THREE.MathUtils.degToRad(deg); }); };
  pl.setElevator = (deg) => { if (elev) elev.rotation.z = -THREE.MathUtils.degToRad(deg); };
  pl.setRudder = (deg) => { if (rud) rud.rotation.y = THREE.MathUtils.degToRad(deg); };
  src.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material && o.material.isMeshStandardMaterial && !o.material.transparent) o.material.envMapIntensity = 1.0; } });
}

// Swap procedural coaster cars for the Blender ATV cars + riders. Same site units and axes.
export function upgradeTrain(train, gltfScene, { riders = true } = {}) {
  const car = gltfScene.getObjectByName('Car'), front = gltfScene.getObjectByName('FrontCar'), rider = gltfScene.getObjectByName('Rider');
  if (!car || !front) return;
  const shirts = [0x3c5a78, 0x8a3b2e, 0x2f5d45, 0xd8d4c8, 0x6a4c8a, 0x2a2d33, 0xc7862f];
  train.cars.forEach((c, i) => {
    c.children.forEach((k) => (k.visible = false));
    const body = (i === 0 ? front : car).clone(true); body.position.set(0, 0, 0); c.add(body);
    if (riders && rider) {
      const r = rider.clone(true); r.position.set(0, 0, 0);
      r.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'R_Shirt') { o.material = o.material.clone(); o.material.color.setHex(shirts[i % shirts.length]).convertSRGBToLinear(); } });
      c.add(r);
    }
    c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  });
}

// Swap the Lock Pro's visible exterior for the Blender satin-brass parts, keeping the teardown rig and bolt throw.
export function upgradeLock(lock, gltfScene) {
  const src = gltfScene.clone(true); lock.group.updateMatrixWorld(true);
  const holder = new THREE.Group(); lock.group.add(holder); holder.add(src); holder.updateMatrixWorld(true);
  const part = (label) => (lock.parts.find((p) => p.label === label) || {}).obj;
  const N = (n) => src.getObjectByName(n);
  const blank = (o) => { if (o.isMesh) o.geometry = new THREE.BufferGeometry(); else o.children.forEach((c) => (c.visible = false)); };
  const map = [['ExtRose', part('Exterior rose')], ['KeyCylinder', part('Keyed cylinder')], ['IntPuck', part('Interior puck')], ['Thumbturn', lock.turn], ['Strike', lock.strike]];
  for (const [name, target] of map) { const n = N(name); if (n && target) { blank(target); target.attach(n); } }
  const fp = N('Faceplate'); const front = part('Bolt'); if (front) { front.children.slice(0, 3).forEach((c) => (c.visible = false)); if (fp) front.attach(fp); }
  lock.bolt.children.forEach((c) => (c.visible = false)); const bs = N('BoltShell'); if (bs) lock.bolt.attach(bs);
  lock.group.remove(holder);
  lock.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { faceplate: fp };
}


// evaporative condenser: galvanized casing with louvres, a fan shroud and a five-blade fan (base at y = 0)
export function makeCondenser() {
  // evaporative condenser (as on real ice-plant roofs): matte galvanized casing with seamed panels, angled air-inlet
  // louvres on the lower third only, a round fan stack on top behind a wire guard
  if (!MAT.galv) MAT.galv = new THREE.MeshPhysicalMaterial({ color: 0xbfc4c7, metalness: 0.55, roughness: 0.52, bumpMap: MAT.panel ? MAT.panel.bumpMap : null, bumpScale: 0.4 });
  const cd = new THREE.Group(); const G = MAT.galv; const Hc = 0.92; // taller than wide, like real induced-draft units
  cd.add(at(box(0.95, Hc, 0.85, G), 0, Hc / 2, 0));
  // cold-water basin below a seam line; dark air inlet behind the louvres so they read as an opening, not trim
  cd.add(at(box(0.966, 0.014, 0.866, MAT.aluDark), 0, 0.34, 0));
  for (const z of [-0.427, 0.427]) cd.add(at(box(0.86, 0.25, 0.004, MAT.black), 0, 0.18, z));
  for (const x of [-0.477, 0.477]) cd.add(at(box(0.004, 0.25, 0.76, MAT.black), x, 0.18, 0));
  const sy = (0.34 + Hc) / 2, sh = Hc - 0.34 - 0.06;
  for (const z of [-0.426, 0.426]) for (const x of [-0.16, 0.16]) cd.add(at(box(0.012, sh, 0.006, MAT.aluDark), x, sy, z)); // panel seams
  for (const x of [-0.476, 0.476]) cd.add(at(box(0.006, sh, 0.012, MAT.aluDark), x, sy, 0));
  for (let k = 0; k < 4; k++) for (const [w_, d_, z_, rx] of [[0.9, 0.05, 0.43, 0.5], [0.9, 0.05, -0.43, -0.5]]) { const l = at(box(w_, 0.012, d_, MAT.aluDark), 0, 0.08 + k * 0.06, z_); l.rotation.x = rx; cd.add(l); } // inlet louvres
  for (let k = 0; k < 4; k++) for (const [x_, rz] of [[0.48, -0.5], [-0.48, 0.5]]) { const l = at(box(0.05, 0.012, 0.8, MAT.aluDark), x_, 0.08 + k * 0.06, 0); l.rotation.z = rz; cd.add(l); }
  cd.add(at(box(0.99, 0.03, 0.89, G), 0, Hc + 0.01, 0));                                  // top deck lip
  cd.add(at(cyl(0.3, 0.22, G), 0, Hc + 0.11, 0));                                          // fan cowl
  cd.add(at(new THREE.Mesh(cylGeo(0.335, 0.3, 0.06), G), 0, Hc + 0.25, 0));                // flared discharge
  const fan = new THREE.Group(); fan.position.set(0, Hc + 0.18, 0);
  for (let b = 0; b < 5; b++) { const bl = at(box(0.26, 0.012, 0.08, MAT.gunmetal), 0.14, 0, 0); const piv = new THREE.Group(); piv.rotation.y = b * PI * 2 / 5; bl.rotation.x = 0.35; piv.add(bl); fan.add(piv); }
  fan.add(at(cyl(0.05, 0.05, MAT.gunmetal), 0, 0, 0)); cd.add(fan);
  const guard = new THREE.Group(); guard.position.y = Hc + 0.285;                           // wire fan guard
  for (const r of [0.11, 0.21, 0.31]) guard.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.005, 6, 40).rotateX(PI / 2), MAT.gunmetal));
  for (let k = 0; k < 8; k++) { const w = at(box(0.64, 0.008, 0.008, MAT.gunmetal), 0, 0, 0); w.rotation.y = k * PI / 8; guard.add(w); }
  cd.add(guard);
  for (const z of [-0.2, 0.2]) cd.add(at(cyl(0.035, 0.18, MAT.steel, 'x'), 0.56, Hc - 0.2, z)); // coil inlet/outlet stubs
  return { group: cd, fan };
}

// ============================================================
// ICE PLANT (Arctic Glacier chapter): a miniature packaged-ice plant whose roofs and walls lift off.
// cat 0 refrigeration: roof, evaporative condensers, NH3 compressor skid, tube-ice evaporators
// cat 1 ice & bagging: front wall, ice bin room, two bagging lines
// cat 2 cold storage: warehouse roof + wall, pallets of bagged ice, unit coolers, PLC controls
// ============================================================
// Bake static meshes into one mesh per material inside each moving container (the root and every teardown part),
// so a part that moves as one unit costs a handful of draw calls instead of dozens. Nested parts and anything
// animated (passed in `keep`) stay separate objects; part objects themselves are never removed.
export function mergeStatic(root, partObjs, keep) {
  const parts = new Set(partObjs), kept = new Set(keep);
  root.updateMatrixWorld(true);
  for (const C of [root, ...partObjs]) {
    const inv = new THREE.Matrix4().copy(C.matrixWorld).invert(); const buckets = new Map();
    const walk = (node) => { for (const ch of node.children) {
      if (parts.has(ch) || kept.has(ch) || !ch.visible) continue;
      if (ch.isMesh && !ch.isInstancedMesh && !Array.isArray(ch.material) && ch.geometry.attributes.position && !ch.children.length) {
        const k = ch.material.uuid; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(ch);
      } else walk(ch);
    } };
    walk(C);
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const names = ['position', 'normal', 'uv'].filter((a) => list.every((m) => m.geometry.attributes[a]));
      if (!names.includes('normal')) continue;
      const geos = list.map((m) => { const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); const gg = new THREE.BufferGeometry();
        for (const a of names) gg.setAttribute(a, src.attributes[a]); gg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); return gg; });
      const merged = mergeGeometries(geos, false); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, list[0].material);
      mesh.castShadow = list.some((m) => m.castShadow); mesh.receiveShadow = list.some((m) => m.receiveShadow);
      list.forEach((m) => m.parent.remove(m)); C.add(mesh);
    }
  }
}

export function makeIcePlant() {
  const g = new THREE.Group(); const parts = []; const add = partAdder(parts); const fans = []; const bags = [];
  const H = 2.2, HW = 1.9, XA = -3.2, XM = 0.6, XB = 3.2, ZF = 1.8;
  const grp = (...o) => { const q = new THREE.Group(); o.forEach((c) => q.add(c)); return q; };
  // slab + fixed back/side walls
  g.add(at(box(6.7, 0.12, 3.9, MAT.concrete), 0, -0.07, 0), at(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6).rotateX(-PI / 2), MAT.floor), 0, 0.002, 0));
  g.add(at(box(XM - XA, H, 0.06, MAT.panel), (XA + XM) / 2, H / 2, -ZF), at(box(0.06, H, 2 * ZF, MAT.panel), XA, H / 2, 0));
  g.add(at(box(XB - XM, HW, 0.06, MAT.panel), (XM + XB) / 2, HW / 2, -ZF), at(box(0.06, HW, 2 * ZF, MAT.panel), XB, HW / 2, 0));
  // divider with a dock door between production and cold storage
  g.add(at(box(0.08, HW, 2 * ZF - 1.5, MAT.panel), XM, HW / 2, -0.75), at(box(0.08, HW - 1.1, 1.5, MAT.panel), XM, 1.1 + (HW - 1.1) / 2, ZF - 0.75));
  for (const x of [XA + 0.08, -1.0, XM - 0.08, 1.9, XB - 0.08]) for (const z of [-ZF + 0.08]) g.add(at(box(0.09, x < XM ? H : HW, 0.09, MAT.steel), x, (x < XM ? H : HW) / 2, z)); // wall columns
  { // NH3 pipe rack along the back wall: insulated suction mains + yellow liquid line, dropping to the evaporators
    const run = (pts, r, m) => { const cp = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) cp.add(new THREE.LineCurve3(V3(pts[i]), V3(pts[i + 1]))); g.add(new THREE.Mesh(new THREE.TubeGeometry(cp, 24 * pts.length, r, 12, false), m)); };
    const yR = 1.92, zR = -ZF + 0.22;
    run([[XA + 0.2, yR, zR], [XM - 0.1, yR, zR]], 0.055, MAT.insul);
    run([[XA + 0.2, yR - 0.14, zR], [-1.48, yR - 0.14, zR], [-1.48, yR - 0.14, -0.35], [-1.48, 1.95, -0.35]], 0.035, MAT.nh3);
    run([[-2.32, yR, zR], [-2.32, yR, -0.35], [-2.32, 1.95, -0.35]], 0.045, MAT.insul);
    for (let x = XA + 0.5; x < XM; x += 0.7) g.add(at(box(0.04, 0.3, 0.3, MAT.steel), x, yR - 0.05, zR + 0.05)); // pipe hangers
  }
  g.add(at(box(0.06, 0.42, 1.5, MAT.rackOrange), XM, 0.89, ZF - 0.75), at(box(0.1, 0.1, 1.6, MAT.steel), XM, 1.12, ZF - 0.75)); // half-open roll-up dock door + coil housing
  // ---- cat 0: refrigeration ----
  const roofP = new THREE.Group(); roofP.position.set((XA + XM) / 2, H, 0); g.add(roofP);
  roofP.add(at(box(XM - XA + 0.1, 0.08, 2 * ZF + 0.1, MAT.roof), 0, 0.04, 0));
  for (const [w_, d_, x_, z_] of [[XM - XA + 0.1, 0.06, 0, ZF + 0.02], [XM - XA + 0.1, 0.06, 0, -ZF - 0.02], [0.06, 2 * ZF + 0.1, (XA - XM) / 2 - 0.02, 0]]) roofP.add(at(box(w_, 0.16, d_, MAT.steel), x_, 0.1, z_)); // parapet caps
  for (let k = 0; k < 4; k++) { // steel roof trusses under the deck: chords + web diagonals, lift off with the roof
    const tx = -1.5 + k * 1.0, tr = new THREE.Group(); tr.position.x = tx;
    tr.add(at(box(0.05, 0.05, 2 * ZF - 0.1, MAT.steel), 0, -0.04, 0), at(box(0.05, 0.05, 2 * ZF - 0.1, MAT.steel), 0, -0.34, 0));
    for (let i = 0; i < 8; i++) { const d = at(box(0.03, 0.42, 0.03, MAT.steel), 0, -0.19, -ZF + 0.25 + i * 0.47); d.rotation.x = (i % 2 ? 1 : -1) * 0.78; tr.add(d); }
    roofP.add(tr);
  }
  for (const [sx, sz] of [[-1.1, -0.6], [0.2, 0.6]]) roofP.add(at(box(0.5, 0.05, 0.9, MAT.glass), sx, 0.1, sz)); // skylights
  add(roofP, 0, [0, 2.0, 0]);
  [-2.35, -1.25].forEach((x, i) => {
    const { group: cd, fan } = makeCondenser(); fans.push(fan);
    cd.position.set(x, H + 0.08, -0.85); g.add(cd);
    add(cd, 0, [0, 2.8 + i * 0.15, -0.3], i === 0 ? { label: 'Evaporative condensers', anchor: [0, 1.22, 0] } : {});
  });
  const skid = new THREE.Group();
  skid.add(at(box(1.1, 0.08, 0.6, MAT.gunmetal), 0, 0.04, 0));
  skid.add(at(cyl(0.16, 0.42, MAT.iceBlue, 'x'), -0.3, 0.26, 0.05));            // motor
  skid.add(at(rbox(0.36, 0.3, 0.32, 0.04, MAT.aluDark), 0.12, 0.25, 0.05));       // screw compressor
  skid.add(at(cyl(0.13, 0.9, MAT.zinc, 'x'), 0.05, 0.62, -0.14));                 // NH3 receiver
  skid.add(at(cyl(0.025, H - 0.62, MAT.gunmetal), 0.4, 0.62 + (H - 0.62) / 2, -0.14)); // discharge riser to the condensers
  skid.position.set(-2.55, 0, -1.3); g.add(skid);
  add(skid, 0, [-1.4, 0.7, -1.0], { label: 'NH3 compressors', anchor: [0, 0.8, 0] });
  const evap = new THREE.Group();
  [-0.42, 0.42].forEach((x) => {
    evap.add(at(cyl(0.27, 1.5, MAT.stainless), x, 0.95, 0));
    evap.add(at(new THREE.Mesh(lathe([[0.27, 0], [0.24, 0.12], [0.14, 0.22], [0, 0.25]], 32), MAT.stainless), x, 1.7, 0));
    evap.add(at(cyl(0.09, 0.16, MAT.iceBlue), x, 2.02, 0), at(rbox(0.16, 0.1, 0.12, 0.02, MAT.aluDark), x + 0.13, 1.98, 0)); // cutter drive + gearbox
    for (const yb of [0.4, 1.0, 1.5]) evap.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.018, 8, 40).rotateX(PI / 2), MAT.stainless), x, yb, 0)); // shell bands
    for (const [fx, fz] of [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]]) evap.add(at(box(0.045, 1.95, 0.045, MAT.rackBlue), x + fx, 0.975, fz)); // blue support frame
    for (const yb of [0.25, 1.15, 1.9]) for (const [w_, d_, ox, oz] of [[0.7, 0.04, 0, -0.33], [0.7, 0.04, 0, 0.33], [0.04, 0.7, -0.33, 0], [0.04, 0.7, 0.33, 0]]) evap.add(at(box(w_, 0.04, d_, MAT.rackBlue), x + ox, yb, oz));
    for (let k = 0; k < 10; k++) { const a = (k / 10) * PI * 2; evap.add(at(cyl(0.022, 1.3, MAT.zinc), x + Math.cos(a) * 0.29, 0.95, Math.sin(a) * 0.29)); } // tube bundle
    evap.add(at(cyl(0.11, 0.2, MAT.aluDark), x, 0.12, 0));
  });
  { // service catwalk between the two machines, with handrails and a ladder
    evap.add(at(box(1.5, 0.03, 0.42, MAT.steel), 0, 1.62, 0.5));
    for (const zz of [0.3, 0.7]) evap.add(at(box(1.5, 0.025, 0.025, MAT.rackOrange), 0, 1.92, zz));
    for (const xx of [-0.72, 0, 0.72]) evap.add(at(box(0.025, 0.3, 0.025, MAT.rackOrange), xx, 1.77, 0.7));
    for (const xx of [-0.85, -0.65]) evap.add(at(box(0.025, 1.62, 0.025, MAT.steel), xx, 0.81, 0.7));
    for (let k = 0; k < 7; k++) evap.add(at(box(0.2, 0.02, 0.02, MAT.steel), -0.75, 0.15 + k * 0.22, 0.7));
  }
  evap.position.set(-1.9, 0, -0.35); g.add(evap);
  add(evap, 0, [0, 1.2, 0.9], { label: 'Tube-ice evaporators', anchor: [0.42, 2.0, 0] });
  // ---- cat 1: ice & bagging ----
  const frontP = at(box(XM - XA, H, 0.06, MAT.panel), (XA + XM) / 2, H / 2, ZF); g.add(frontP);
  add(frontP, 1, [0, -H / 2 + 0.03, H / 2 + 0.05], { rot: [PI / 2, 0, 0] }); // folds down flat like a dock wall
  const bin = new THREE.Group();
  const bw = 1.3, bd = 0.9, bh = 0.75;
  bin.add(at(box(bw, bh, 0.05, MAT.panel), 0, bh / 2, -bd / 2), at(box(bw, bh, 0.05, MAT.panel), 0, bh / 2, bd / 2), at(box(0.05, bh, bd, MAT.panel), -bw / 2, bh / 2, 0), at(box(0.05, bh, bd, MAT.panel), bw / 2, bh / 2, 0));
  const ice = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), MAT.ice, 260);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) { const x = (rnd() - 0.5) * (bw - 0.12), z = (rnd() - 0.5) * (bd - 0.12); const y = 0.42 + 0.22 * (1 - (x * x) / 0.5) * rnd(); q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)); m4.compose(V3([x, y, z]), q, V3([1, 1, 1])); ice.setMatrixAt(i, m4); }
  bin.add(ice);
  for (const dz of [-0.3, 0.25]) { // inclined cleated belt conveyors lifting ice from the bin to each bagger hopper
    const a_ = V3([0.5, 0.42, dz]), b_ = V3([1.0, 1.45, dz + (dz < 0 ? 0.0 : 0.25)]); const d_ = b_.clone().sub(a_), L_ = d_.length();
    const cv = new THREE.Group(); cv.position.copy(a_).add(b_).multiplyScalar(0.5); cv.quaternion.setFromUnitVectors(V3([0, 1, 0]), d_.clone().normalize());
    cv.add(at(box(0.18, L_, 0.03, MAT.black), 0, 0, 0));                                                     // belt
    for (const sx of [-0.1, 0.1]) cv.add(at(box(0.02, L_, 0.09, MAT.stainless), sx, 0, 0.03));               // trough walls
    for (let k = 0; k < Math.floor(L_ / 0.09); k++) cv.add(at(box(0.17, 0.012, 0.05, MAT.stainless), 0, -L_ / 2 + 0.05 + k * 0.09, 0.035)); // cleats
    bin.add(cv);
    bin.add(at(box(0.03, b_.y - 0.05, 0.03, MAT.steel), b_.x - 0.05, (b_.y - 0.05) / 2, b_.z - 0.06)); // support leg
  }
  bin.position.set(-1.95, 0, 0.95); g.add(bin);
  add(bin, 1, [-0.5, 0.35, 1.7], { label: 'Ice bin room', anchor: [0, 0.9, 0] });
  const belt = { x0: -1.2, x1: XM + 0.3 };
  [0.75, 1.3].forEach((z, li) => {
    const line = new THREE.Group();
    const len = belt.x1 - belt.x0;
    line.add(at(box(len, 0.05, 0.3, MAT.black), (belt.x0 + belt.x1) / 2, 0.52, 0));
    line.add(at(box(len, 0.06, 0.04, MAT.alu), (belt.x0 + belt.x1) / 2, 0.55, 0.17), at(box(len, 0.06, 0.04, MAT.alu), (belt.x0 + belt.x1) / 2, 0.55, -0.17));
    for (let k = 0; k < 4; k++) line.add(at(box(0.04, 0.5, 0.04, MAT.aluDark), belt.x0 + 0.1 + k * (len - 0.2) / 3, 0.25, 0));
    const bagger = new THREE.Group(); // form-fill-seal bagger with an infeed hopper
    for (const [lx, lz] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) bagger.add(at(box(0.03, 1.15, 0.03, MAT.stainless), lx, 0.575, lz)); // open frame
    bagger.add(at(rbox(0.46, 0.34, 0.44, 0.02, MAT.stainless), 0, 1.15, 0));                                     // dosing + jaw cabinet
    bagger.add(at(cyl(0.05, 0.42, MAT.stainless), 0, 0.82, 0), at(box(0.12, 0.04, 0.1, MAT.aluDark), 0, 0.62, 0)); // forming tube + sealing jaws
    bagger.add(at(new THREE.Mesh(lathe([[0.06, 0], [0.2, 0.22], [0.22, 0.24]], 24), MAT.stainless), 0, 1.32, 0));
    bagger.add(at(box(0.1, 0.06, 0.02, MAT.glass), 0.1, 1.2, 0.235), at(cyl(0.025, 0.02, MAT.accent, 'z'), -0.12, 1.2, 0.235)); // HMI + e-stop
    for (let k = 0; k < 12; k++) line.add(at(cyl(0.022, 0.3, MAT.alu, 'z'), belt.x0 + 0.1 + k * (len - 0.2) / 11, 0.49, 0)); // belt rollers
    bagger.add(at(box(0.3, 0.2, 0.02, MAT.iceBlue), 0, 1.0, 0.235));
    bagger.position.set(belt.x0 + 0.25, 0, 0); line.add(bagger);
    for (let k = 0; k < 4; k++) { const b = at(rbox(0.22, 0.09, 0.15, 0.04, MAT.bag), 0, 0.6, 0); line.add(b); bags.push({ m: b, k: (k + li * 0.5) / 4 }); }
    line.position.z = z - 0.1; g.add(line);
    add(line, 1, [0.2, 0.15 + li * 0.1, 1.9 + li * 0.9], li === 0 ? { label: 'Bagging lines', anchor: [belt.x0 + 0.25, 1.45, 0] } : {});
  });
  // ---- cat 2: cold storage ----
  const roofW = at(box(XB - XM + 0.1, 0.08, 2 * ZF + 0.1, MAT.panel), (XM + XB) / 2, HW + 0.04, 0); g.add(roofW);
  add(roofW, 2, [0, 2.1, 0]);
  const frontW = at(box(XB - XM, HW, 0.06, MAT.panel), (XM + XB) / 2, HW / 2, ZF); g.add(frontW);
  add(frontW, 2, [0, -HW / 2 + 0.03, HW / 2 + 0.05], { rot: [PI / 2, 0, 0] });
  const store = new THREE.Group();
  const pallet = (px, py, pz, layers = 4) => {
    const pal = new THREE.Group();
    pal.add(at(box(0.9, 0.04, 0.9, MAT.wood), 0, 0.12, 0)); for (const zz of [-0.38, 0, 0.38]) pal.add(at(box(0.9, 0.08, 0.1, MAT.wood), 0, 0.05, zz));
    for (let ly = 0; ly < layers; ly++) for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 3; iz++) {
      const b = at(rbox(0.27, 0.12, 0.27, 0.05, MAT.bag), -0.29 + ix * 0.29, 0.21 + ly * 0.125, -0.29 + iz * 0.29); b.rotation.y = (ly % 2) * PI / 2; pal.add(b);
    }
    pal.position.set(px, py, pz); store.add(pal);
  };
  // selective racking along the back wall: blue uprights, orange beams, two levels of bagged-ice pallets
  for (const ux of [0.85, 1.9, 2.95]) for (const uz of [-1.65, -0.65]) store.add(at(box(0.06, 1.6, 0.06, MAT.rackBlue), ux, 0.8, uz));
  for (const bx_ of [1.375, 2.425]) for (const by of [0.78, 1.5]) for (const bz of [-1.65, -0.65]) store.add(at(box(1.0, 0.07, 0.05, MAT.rackOrange), bx_, by, bz));
  for (const bx_ of [1.375, 2.425]) { pallet(bx_, 0, -1.15); pallet(bx_, 0.82, -1.15, 3); }
  pallet(1.45, 0, 0.65); pallet(2.75, 0, 0.95, 2);
  { // compact counterbalance forklift working the aisle
    const fk = new THREE.Group();
    fk.add(at(rbox(0.5, 0.3, 0.34, 0.05, MAT.yellow), 0, 0.27, 0), at(rbox(0.22, 0.26, 0.34, 0.05, MAT.steel), -0.24, 0.3, 0));
    for (const [wx, wz] of [[0.16, 0.18], [0.16, -0.18], [-0.18, 0.18], [-0.18, -0.18]]) fk.add(at(cyl(0.09, 0.07, MAT.rubber, 'z'), wx, 0.09, wz));
    for (const zz of [0.15, -0.15]) { fk.add(at(box(0.03, 0.75, 0.03, MAT.steel), -0.05, 0.75, zz), at(box(0.03, 0.03, 0.03, MAT.steel), 0.05, 1.1, zz)); fk.add(at(box(0.03, 0.8, 0.03, MAT.steel), 0.32, 0.4, zz)); fk.add(at(box(0.4, 0.025, 0.06, MAT.steel), 0.52, 0.05, zz)); }
    fk.add(at(box(0.4, 0.03, 0.34, MAT.steel), 0.08, 1.12, 0), at(rbox(0.16, 0.08, 0.2, 0.03, MAT.seat), -0.08, 0.47, 0));
    fk.position.set(1.95, 0, 0.45); fk.rotation.y = 0.35; store.add(fk);
  }
  g.add(store);
  add(store, 2, [0.6, 0.0, 1.5], { label: 'Cold storage warehouse', anchor: [1.85, 0.9, 0.35] });
  const coolers = new THREE.Group();
  [1.3, 2.4].forEach((x) => {
    coolers.add(at(rbox(0.7, 0.26, 0.38, 0.03, MAT.zinc), x, HW - 0.2, -1.45));
    for (const fx of [-0.17, 0.17]) { const f = at(cyl(0.1, 0.02, MAT.gunmetal, 'z'), x + fx, HW - 0.2, -1.25); coolers.add(f); }
  });
  g.add(coolers);
  add(coolers, 2, [0, 1.0, -0.6], { label: 'Unit coolers', anchor: [1.3, HW, -1.45] });
  const plc = new THREE.Group();
  plc.add(at(rbox(0.5, 0.7, 0.2, 0.02, MAT.aluDark), 0, 0, 0), at(box(0.22, 0.14, 0.01, MAT.lens), 0, 0.15, 0.105));
  for (let k = 0; k < 3; k++) plc.add(at(cyl(0.02, 0.01, k === 0 ? MAT.accent : MAT.gunmetal, 'z'), -0.12 + k * 0.12, -0.12, 0.105));
  plc.position.set(-0.2, 1.3, -ZF + 0.14); g.add(plc);
  add(plc, 2, [0.3, 0.6, -1.0], { label: 'Controls (PLC)', anchor: [0, 0.4, 0] });
  // ---- cold-storage details from real plants ----
  { // clear PVC strip curtain hanging in the dock opening between production and the cold room
    const pvc = new THREE.MeshPhysicalMaterial({ color: 0xcfe6f2, roughness: 0.15, transmission: 0.6, thickness: 0.05, transparent: true, opacity: 0.55, side: DS });
    for (let k = 0; k < 9; k++) { const st = at(box(0.012, 1.02, 0.155, pvc), XM + 0.05, 0.53, ZF - 1.42 + k * 0.165); st.rotation.x = (k % 3 - 1) * 0.02; g.add(st); }
  }
  // high-bay LED fixtures hung from each roof (they lift away with it)
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff3dc).multiplyScalar(2.2) });
  for (const [x, z] of [[-2.2, -0.6], [-1.0, -0.6], [-2.2, 0.8], [-1.0, 0.8], [0.0, 0.1]]) {
    roofP.add(at(cyl(0.004, 0.25, MAT.steel), x - (XA + XM) / 2, -0.12, z), at(new THREE.Mesh(lathe([[0.02, 0], [0.11, -0.06], [0.12, -0.07]], 24), MAT.steel), x - (XA + XM) / 2, -0.24, z), at(cyl(0.1, 0.01, led), x - (XA + XM) / 2, -0.31, z));
  }
  for (const [x, z] of [[1.4, 0.2], [2.5, 0.2]]) roofW.add(at(box(0.5, 0.03, 0.08, MAT.steel), x - (XM + XB) / 2, -0.06, z), at(box(0.46, 0.012, 0.06, led), x - (XM + XB) / 2, -0.08, z));
  // insulated-panel seams on the fixed interior walls (vertical joints every ~0.6)
  for (let x = XA + 0.6; x < XB; x += 0.6) { const hh = x < XM ? H : HW; g.add(at(box(0.006, hh - 0.02, 0.004, MAT.aluDark), x, hh / 2, -ZF + 0.034)); }
  for (let z = -ZF + 0.6; z < ZF; z += 0.6) { g.add(at(box(0.004, H - 0.02, 0.006, MAT.aluDark), XA + 0.034, H / 2, z)); g.add(at(box(0.004, HW - 0.02, 0.006, MAT.aluDark), XB - 0.034, HW / 2, z)); }
  // interior concrete curb where the fixed walls meet the floor (real plants: a raised cove base protects the panels)
  g.add(at(box(XB - XA, 0.1, 0.03, MAT.concrete), (XA + XB) / 2, 0.05, -ZF + 0.045));
  g.add(at(box(0.03, 0.1, 2 * ZF, MAT.concrete), XA + 0.045, 0.05, 0), at(box(0.03, 0.1, 2 * ZF, MAT.concrete), XB - 0.045, 0.05, 0));
  // ---- exterior: what you see before the teardown ----
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(3) });
  const wallPack = (parent, x, y, z) => { parent.add(at(box(0.12, 0.08, 0.06, MAT.steel), x, y, z), at(box(0.09, 0.02, 0.05, lamp), x, y - 0.045, z + 0.005)); };
  { // production front wall: personnel door with canopy, unbranded sign band, wall packs (all fold down with the wall)
    const fw = XM - XA;
    frontP.add(at(box(0.36, 0.8, 0.02, MAT.steel), -fw / 2 + 0.6, -H / 2 + 0.4, 0.04), at(box(0.5, 0.03, 0.22, MAT.steel), -fw / 2 + 0.6, -H / 2 + 0.88, 0.12));
    const sign = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#1d4f8c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textBaseline = 'middle'; const txt = 'PACKAGED ICE  ·  COLD STORAGE'; let fs = 34; do { c.font = `600 ${fs}px Arial`; fs--; } while (c.measureText(txt).width > w - 44 && fs > 10); c.fillText(txt, 22, h / 2 + 2); }, { srgb: true });
    frontP.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.225), new THREE.MeshPhysicalMaterial({ map: sign, roughness: 0.4, clearcoat: 0.5 })), 0.3, H / 2 - 0.3, 0.035));
    for (const x of [-1.2, 0.2, 1.5]) wallPack(frontP, x, H / 2 - 0.62, 0.05);
  }
  for (const x of [-0.8, 0.4]) wallPack(frontW, x, HW / 2 - 0.3, 0.05);
  { // exterior insulated-panel joints + a concrete curb at the wall base, as on real cold-storage plants
    const curb = MAT.concrete, jt = MAT.aluDark;
    const fw = XM - XA, ww = XB - XM, dx = -fw / 2 + 0.6;
    for (let x = -fw / 2 + 0.5; x < fw / 2 - 0.1; x += 0.5) if (Math.abs(x - dx) > 0.26) frontP.add(at(box(0.008, H - 0.2, 0.006, jt), x, 0.08, 0.033));
    frontP.add(at(box(dx - 0.2 + fw / 2, 0.16, 0.014, curb), (-fw / 2 + dx - 0.2) / 2, -H / 2 + 0.08, 0.037), at(box(fw / 2 - dx - 0.2, 0.16, 0.014, curb), (fw / 2 + dx + 0.2) / 2, -H / 2 + 0.08, 0.037));
    for (let x = -ww / 2 + 0.5; x < ww / 2 - 0.1; x += 0.5) frontW.add(at(box(0.008, HW - 0.2, 0.006, jt), x, 0.08, 0.033));
    frontW.add(at(box(ww, 0.16, 0.014, curb), 0, -HW / 2 + 0.08, 0.037));
    for (let z = -ZF + 0.5; z < ZF - 0.1; z += 0.5) g.add(at(box(0.006, H - 0.2, 0.008, jt), XA - 0.033, H / 2 + 0.08, z));
    g.add(at(box(0.014, 0.16, 2 * ZF, curb), XA - 0.037, 0.08, 0));
    roofW.add(at(box(XB - XM + 0.14, 0.12, 0.05, MAT.steel), 0, 0.06, ZF + 0.05), at(box(0.05, 0.12, 2 * ZF + 0.14, MAT.steel), (XB - XM) / 2 + 0.05, 0.06, 0)); // coping
  }
  { // loading dock on the cold-storage end: two insulated dock doors with seals + bumpers, an apron and a reefer truck backed in
    const dock = new THREE.Group(); dock.position.set(XB + 0.035, 0, 0); g.add(dock);
    for (const z of [-0.75, 0.6]) {
      dock.add(at(box(0.03, 1.05, 0.95, MAT.rackBlue), 0.0, 0.53, z), at(box(0.07, 1.15, 0.08, MAT.black), 0.03, 0.58, z - 0.52), at(box(0.07, 1.15, 0.08, MAT.black), 0.03, 0.58, z + 0.52), at(box(0.07, 0.08, 1.12, MAT.black), 0.03, 1.15, z));
      for (let k = 0; k < 7; k++) dock.add(at(box(0.035, 0.012, 0.93, MAT.steel), 0.005, 0.12 + k * 0.14, z)); // door ribs
      for (const dz of [-0.36, 0.36]) dock.add(at(box(0.09, 0.14, 0.12, MAT.rubber), 0.06, 0.2, z + dz)); // dock bumpers
      wallPack(dock, 0.04, 1.32, z); dock.children[dock.children.length - 2].rotation.y = PI / 2; dock.children[dock.children.length - 1].rotation.y = PI / 2;
    }
    dock.add(at(box(0.5, 0.04, 3.6, MAT.steel), 0.25, 1.42, 0)); // dock canopy
    g.add(at(box(2.3, 0.1, 3.9, MAT.concrete), XB + 1.15, -0.07, 0)); // truck apron
    const truck = new THREE.Group(); truck.position.set(XB + 0.12, 0, 0.6); g.add(truck);
    truck.add(at(rbox(1.25, 0.82, 0.8, 0.03, MAT.whiteFlat), 0.66, 0.68, 0));                     // insulated reefer box
    truck.add(at(rbox(0.22, 0.26, 0.6, 0.03, MAT.zinc), 0.62 + 0.0, 1.2, 0).translateX(0.0));     // nose-mounted refrigeration unit
    truck.add(at(box(0.02, 0.5, 0.6, MAT.rackBlue), 1.3, 0.72, 0));                                 // bulkhead band
    truck.add(at(rbox(0.5, 0.55, 0.78, 0.06, MAT.iceBlue), 1.55, 0.52, 0), at(box(0.02, 0.2, 0.6, MAT.glass), 1.81, 0.66, 0)); // cab + windshield
    truck.add(at(box(1.7, 0.1, 0.5, MAT.steel), 0.95, 0.24, 0));                                   // chassis rail
    for (const [wx, wz] of [[0.35, 0.36], [0.35, -0.36], [0.62, 0.36], [0.62, -0.36], [1.55, 0.36], [1.55, -0.36]]) truck.add(at(cyl(0.13, 0.1, MAT.rubber, 'z'), wx, 0.13, wz));
    for (const wz of [0.28, -0.28]) truck.add(at(box(0.02, 0.05, 0.08, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a1a).multiplyScalar(2) })), 0.03, 0.4, wz)); // tail lights
  }
  // rooftop: exhaust vents + access ladder on the side wall
  for (const [x, z] of [[-0.3, 0.9], [0.1, -0.2]]) roofP.add(at(cyl(0.07, 0.14, MAT.zinc), x - (XA + XM) / 2 + 0.0, 0.15, z));
  for (let k = 0; k < 9; k++) g.add(at(box(0.04, 0.02, 0.24, MAT.steel), XA - 0.05, 0.2 + k * 0.24, 0.9));
  for (const dz of [-0.12, 0.12]) g.add(at(box(0.03, H + 0.3, 0.03, MAT.steel), XA - 0.05, (H + 0.3) / 2, 0.9 + dz));
  g.position.set(-0.75, -1.1, 0);
  mergeStatic(g, parts.map((p) => p.obj), [...fans, ...bags.map((b) => b.m)]); // ~hundreds of small meshes -> one per material per part
  return { group: g, parts, fans, bags, belt };
}

// ============================================================
// OFF-THE-CLOCK island pieces
// ============================================================
function hash3(x, y, z) { let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z) { // smooth value noise
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf), L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
function fbm(x, y, z, oct = 4) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; }
let _granite = null;
function graniteMat() {
  if (_granite) return _granite;
  const map = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#8f877b'; c.fillRect(0, 0, w, h); const R = rng(5); /* weathered Bay Area granite: warm grey-tan, not white */
    for (let i = 0; i < 9000; i++) { const v = R(); c.fillStyle = v < 0.5 ? `rgba(40,38,36,${0.25 + R() * 0.4})` : v < 0.8 ? `rgba(230,226,218,${0.3 + R() * 0.4})` : `rgba(150,120,95,${0.3 + R() * 0.3})`; c.fillRect(R() * w, R() * h, 1 + R() * 2.5, 1 + R() * 2.5); }
    c.globalAlpha = 0.28; for (let i = 0; i < 40; i++) { c.strokeStyle = '#3d3a36'; c.lineWidth = 1 + R() * 2; c.beginPath(); let x = R() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (R() - 0.5) * 18; y += 8 + R() * 14; c.lineTo(x, y); } c.stroke(); } // water streaks
  }, { srgb: true, wrap: true });
  const bump = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); noise(c, w, h, 90, 13); }, { wrap: true });
  _granite = new THREE.MeshPhysicalMaterial({ color: 0xcfc4b4, map, bumpMap: bump, bumpScale: 2.5, roughness: 0.88, metalness: 0 });
  return _granite;
}
// granite crag with a bolted sport route: displaced block, crack system, coloured holds, bolt hangers, quickdraws and a rope
export function makeCrag(seed = 3) {
  const g = new THREE.Group(); const R = rng(seed);
  const W = 1.7, Hh = 1.9, D = 0.95;
  const geo = new THREE.BoxGeometry(W, Hh, D, 28, 32, 14); const pos = geo.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); const ty = (v.y + Hh / 2) / Hh;
    const taper = 1 - 0.28 * ty; v.x *= taper; v.z *= (1 - 0.35 * ty);
    if (v.z > 0) v.z += 0.12 * Math.sin(ty * 3.2) - 0.05;                    // slight overhang mid-height on the climbing face
    const n = fbm(v.x * 1.6 + 7, v.y * 1.6, v.z * 1.6, 5) - 0.5; const nn = v.clone().normalize();
    v.addScaledVector(nn, n * 0.42); v.y += (fbm(v.x * 2, 3, v.z * 2) - 0.5) * 0.25 * ty; if (ty > 0.97) v.y += (fbm(v.x * 3.1 + 2, 9, v.z * 3.1) - 0.55) * 0.5; // broken summit, not a sawn-off block
    if (v.y < -Hh / 2 + 0.02) v.y = -Hh / 2;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const rock = new THREE.Mesh(geo, graniteMat()); rock.position.y = Hh / 2; rock.castShadow = rock.receiveShadow = true; g.add(rock);
  rock.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(); const onFace = (x, y) => { ray.set(V3([x, y, 2]), V3([0, 0, -1])); const h = ray.intersectObject(rock)[0]; return h ? { p: h.point, n: h.face.normal.clone().transformDirection(rock.matrixWorld) } : null; };
  // natural edges: small granite flakes proud of the face, chalked where climbers grab them (outdoor crag, no plastic holds)
  const chalk = new THREE.MeshBasicMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.32, depthWrite: false });
  for (let i = 0; i < 22; i++) { const hit = onFace((R() - 0.5) * 0.9 + 0.1, 0.15 + R() * 1.55); if (!hit) continue;
    const flake = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04 + R() * 0.03, 0), graniteMat()); flake.scale.set(1.6, 0.45, 0.7);
    flake.position.copy(hit.p).addScaledVector(hit.n, 0.01); flake.lookAt(flake.position.clone().add(hit.n)); flake.rotateZ((R() - 0.5) * 0.5); g.add(flake);
    if (R() < 0.55) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.028 + R() * 0.015, 10), chalk); c.position.copy(hit.p).addScaledVector(hit.n, 0.05); c.position.y += 0.02; c.lookAt(c.position.clone().add(hit.n)); g.add(c); } }
  // bolt line with quickdraws, rope clipped through them up to the anchor
  const ropePts = []; const bolts = [];
  for (let k = 0; k < 6; k++) { const hit = onFace(0.12 + Math.sin(k * 1.3) * 0.08, 0.35 + k * 0.27); if (!hit) continue; bolts.push(hit);
    const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 14), MAT.alu); hanger.position.copy(hit.p).addScaledVector(hit.n, 0.01); hanger.lookAt(hanger.position.clone().add(hit.n)); g.add(hanger);
    const qd = at(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.006), new THREE.MeshPhysicalMaterial({ color: k % 2 ? 0xff5b1f : 0x2f7de1, roughness: 0.6 })), 0, 0, 0); qd.position.copy(hit.p).addScaledVector(hit.n, 0.03); qd.position.y -= 0.05; g.add(qd);
    ropePts.push(qd.position.clone().add(V3([0, -0.05, 0.01]))); }
  const cl = onFace(0.18, 1.32);
  if (cl) { // climber reaching for the next edge: helmet, orange shirt, harness, bent legs
    const C = new THREE.Group(); const skin = new THREE.MeshPhysicalMaterial({ color: 0xc89a7a, roughness: 0.7 }), shirt = new THREE.MeshPhysicalMaterial({ color: 0xff5b1f, roughness: 0.6 }), pants = new THREE.MeshPhysicalMaterial({ color: 0x2a2d33, roughness: 0.8 });
    const limb = (a_, b_, r, m) => { const A = V3(a_), B = V3(b_), d = B.clone().sub(A); const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 4, 8), m); c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(V3([0, 1, 0]), d.normalize()); c.castShadow = true; C.add(c); };
    limb([0, 0.0, 0], [0, 0.11, 0.0], 0.03, shirt);                                 // torso
    C.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), skin), 0, 0.16, 0.01), at(new THREE.Mesh(new THREE.SphereGeometry(0.031, 12, 8, 0, PI * 2, 0, PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xf7c531, roughness: 0.4, clearcoat: 0.8 })), 0, 0.165, 0.01));
    limb([-0.025, 0.1, 0], [-0.06, 0.2, -0.02], 0.012, skin); limb([0.025, 0.1, 0], [0.05, 0.16, -0.03], 0.012, skin);   // arms reaching up
    limb([-0.02, -0.02, 0], [-0.05, -0.08, 0.04], 0.016, pants); limb([-0.05, -0.08, 0.04], [-0.05, -0.14, -0.02], 0.014, pants);
    limb([0.02, -0.02, 0], [0.06, -0.05, 0.05], 0.016, pants); limb([0.06, -0.05, 0.05], [0.07, -0.11, -0.01], 0.014, pants);
    C.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16).rotateX(PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x2f7de1, roughness: 0.6 })), 0, -0.01, 0)); // harness
    C.position.copy(cl.p).addScaledVector(cl.n, 0.075); C.lookAt(C.position.clone().sub(cl.n)); C.rotateY(PI); C.rotation.x = 0; C.rotation.z = 0;
    C.position.y -= 0.02; g.add(C);
    while (ropePts.length && ropePts[ropePts.length - 1].y > C.position.y - 0.02) ropePts.pop();
    ropePts.push(C.position.clone().add(V3([0, -0.01, 0])));
  } else { const top = onFace(0.05, 1.82); if (top) ropePts.push(top.p.clone().addScaledVector(top.n, 0.03)); }
  ropePts.unshift(V3([0.35, 0.02, 0.75]), V3([0.2, 0.15, 0.62]));
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts), 120, 0.012, 6), new THREE.MeshPhysicalMaterial({ color: 0xd62f2f, roughness: 0.7 })); rope.castShadow = true; g.add(rope);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 24).rotateX(PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xd62f2f, roughness: 0.7 })); coil.position.set(0.42, 0.03, 0.82); coil.scale.y = 0.5; g.add(coil);
  // chalk tick marks near the start holds
  for (let i = 0; i < 5; i++) { const hit = onFace((R() - 0.5) * 0.5, 0.3 + R() * 0.5); if (!hit) continue; const c = new THREE.Mesh(new THREE.CircleGeometry(0.03 + R() * 0.02, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); c.position.copy(hit.p).addScaledVector(hit.n, 0.004); c.lookAt(c.position.clone().add(hit.n)); g.add(c); }
  return g;
}
// layered conifer: drooping, jagged needle tiers with a dark-inside / light-tip colour gradient
export function makeConifer(h = 1.6, seed = 1, tint = 0) {
  const g = new THREE.Group(); const R = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * h, 0.045 * h, h * 0.55, 10), new THREE.MeshPhysicalMaterial({ color: 0x5b3a26, roughness: 0.95 })); trunk.position.y = h * 0.27; trunk.castShadow = true; g.add(trunk); trunk.material.color.set(0x7a3f26); // redwood bark
  const tiers = 7 + Math.floor(R() * 3), geos = [];
  // vertex colours are linear: author in sRGB, convert, or the needles wash out to mint
  const dark = new THREE.Color().setHSL(0.41 + tint, 0.38, 0.075).convertSRGBToLinear(), light = new THREE.Color().setHSL(0.36 + tint, 0.3, 0.2).convertSRGBToLinear(); // redwood/fir: deep blue-green, not grass green
  for (let k = 0; k < tiers; k++) {
    const f = k / (tiers - 1); const r = (0.22 - 0.16 * f) * h * (0.9 + R() * 0.2), th = h * (0.2 - 0.06 * f); // redwood: narrow columnar crown
    const cg = new THREE.ConeGeometry(r, th, 11, 2, false); const p = cg.attributes.position; const col = [];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const rr = Math.hypot(p.getX(i), p.getZ(i));
      if (y < 0 && rr > 0.01) { const a = Math.atan2(p.getZ(i), p.getX(i)); const j = 1 + 0.28 * Math.sin(a * 5 + R() * 6) * (R() * 0.6 + 0.4); p.setX(i, p.getX(i) * j); p.setZ(i, p.getZ(i) * j); p.setY(i, y - 0.06 * h * R()); } // jagged, drooping skirt
      const t = Math.min(1, rr / r); const c = dark.clone().lerp(light, t * 0.85 + f * 0.15); col.push(c.r, c.g, c.b); }
    cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); cg.rotateY(R() * 6); cg.translate(0, h * (0.3 + 0.66 * f), 0); geos.push(cg.toNonIndexed ? cg.toNonIndexed() : cg);
  }
  const crown = new THREE.Mesh(mergeGeos(geos), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
  crown.castShadow = true; g.add(crown);
  return g;
}
function mergeGeos(list) { // minimal merge for non-indexed geometries with position/normal/color
  const n = list.reduce((a, gg) => a + gg.attributes.position.count, 0); const P_ = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const gg of list) { P_.set(gg.attributes.position.array, o * 3); C.set(gg.attributes.color.array, o * 3); o += gg.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P_, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3)); out.computeVertexNormals(); return out;
}
// hardtail trail bike: spoked wheels with knobby tyres, disc rotors, sloped frame, suspension fork, dropper, flat bars
export function makeMTB() {
  const bike = new THREE.Group(); const S_ = 0.42;
  const frameM = new THREE.MeshPhysicalMaterial({ color: 0xff5b1f, metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  const blk = new THREE.MeshPhysicalMaterial({ color: 0x141516, roughness: 0.5, metalness: 0.4 }), stanch = new THREE.MeshPhysicalMaterial({ color: 0xd4a548, metalness: 1, roughness: 0.25 });
  const tube = (a, b, r, m) => { const A = V3(a).multiplyScalar(S_), B = V3(b).multiplyScalar(S_); const d = B.clone().sub(A);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * S_, r * S_, d.length(), 12), m); c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(V3([0, 1, 0]), d.normalize()); c.castShadow = true; bike.add(c); };
  for (const x of [-0.56, 0.56]) {
    const W_ = new THREE.Group(); W_.position.set(x * S_, 0.36 * S_, 0); bike.add(W_);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.335 * S_, 0.05 * S_, 10, 48), MAT.rubber); W_.add(tyre);
    const knobs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03 * S_, 0.03 * S_, 0.07 * S_), MAT.rubber, 36); const m4 = new THREE.Matrix4();
    for (let k = 0; k < 36; k++) { const a = k / 36 * PI * 2; m4.makeRotationZ(a).setPosition(Math.cos(a) * 0.385 * S_, Math.sin(a) * 0.385 * S_, 0); knobs.setMatrixAt(k, m4); } W_.add(knobs);
    W_.add(new THREE.Mesh(new THREE.TorusGeometry(0.29 * S_, 0.012 * S_, 6, 40), blk)); // rim
    for (let k = 0; k < 16; k++) { const a = k / 16 * PI * 2; const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.0035 * S_, 0.0035 * S_, 0.28 * S_, 4), MAT.alu); sp.position.set(Math.cos(a) * 0.14 * S_, Math.sin(a) * 0.14 * S_, (k % 2 ? 0.02 : -0.02) * S_); sp.rotation.z = a - PI / 2; W_.add(sp); }
    W_.add(at(cyl(0.035 * S_, 0.12 * S_, MAT.alu, 'z'), 0, 0, 0)); const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * S_, 0.09 * S_, 0.004 * S_, 24).rotateX(PI / 2), MAT.alu); rotor.position.z = 0.055 * S_; W_.add(rotor);
  }
  const BB = [0, 0.33, 0], ST = [-0.13, 0.9, 0], HT = [0.36, 0.88, 0], HTb = [0.42, 0.7, 0], RA = [-0.56, 0.36, 0], FA = [0.56, 0.36, 0];
  tube(BB, ST, 0.032, frameM); tube(ST, HT, 0.03, frameM); tube(BB, HTb, 0.04, frameM); tube(HT, HTb, 0.042, frameM);
  for (const z of [0.05, -0.05]) { tube([0, 0.33, z * 0.4], [-0.56, 0.36, z], 0.018, frameM); tube([-0.12, 0.86, z * 0.3], [-0.56, 0.36, z], 0.016, frameM); tube([0.42, 0.66, z * 0.8], [0.52, 0.46, z], 0.024, stanch); tube([0.52, 0.46, z], [0.56, 0.36, z], 0.02, blk); }
  tube([-0.13, 0.9, 0], [-0.16, 1.0, 0], 0.017, blk); bike.add(at(rbox(0.26 * S_, 0.04 * S_, 0.1 * S_, 0.015, blk), -0.19 * S_, 1.03 * S_, 0));
  tube([0.36, 0.88, 0], [0.38, 0.96, 0], 0.02, blk); tube([0.38, 0.97, -0.36], [0.38, 0.97, 0.36], 0.013, blk);
  for (const z of [-0.33, 0.33]) tube([0.38, 0.97, z], [0.38, 0.97, z + (z > 0 ? 0.06 : -0.06)], 0.02, MAT.rubber);
  bike.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.07 * S_, 0.008 * S_, 6, 24), MAT.alu), 0, 0.33 * S_, 0.04 * S_)); // chainring
  return bike;
}
