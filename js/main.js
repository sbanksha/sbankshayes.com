import * as THREE from 'three';
import Lenis from 'lenis';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeStatic, MAT, initMaterials, stylize, miniaturize, miniOf, upgradePlane, upgradeTrain, upgradeLock, makeDome, makeLock, makeIcePlant, makeCondenser, makeCrag, makeConifer, makeMTB, makePlane, buildTrack, supportsFor, makeTrain, placeTrain } from './models.js?v=20261118p';

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const range = (x, a, b) => clamp((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t) => 1 - Math.pow(1 - t, 3);
const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const BG = 0x0a0b0c;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// launch switch: publish.sh builds the public site with this chapter removed (HAS_A false) until it's announced
const HAS_A = false;

const loadbar = document.getElementById('loadbar');
const setLoad = (v) => (loadbar.style.width = Math.round(v * 100) + '%');
setLoad(0.1);

// ---------- renderer / scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// phones: lighter start (lower pixel ratio, 2x MSAA, smaller shadows, half-res bloom, no ambient occlusion)
const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const DPR = Math.min(devicePixelRatio, PHONE ? 1.3 : 1.5);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PHONE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.setClearColor(BG, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 45, 150);
const BGC = new THREE.Color(BG); scene.background = BGC;
const pmrem = new THREE.PMREMGenerator(renderer);
// custom studio: large softboxes + strip lights, so metals and gloss plastics get crisp product-shot highlights
function studioEnv() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: 0x07080a, side: THREE.BackSide })));
  const panel = (w, h, k, color, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(16, 10, 5.5, 0xfff3e6, [-6, 14, 10]);   // key softbox, top front left
  panel(2.2, 18, 7, 0xffffff, [16, 2, 4]);      // right strip
  panel(2.2, 18, 4, 0xdfe8ff, [-16, 1, -2]);    // left strip, cool
  panel(14, 3, 5, 0xbcd0ff, [0, 6, -16]);       // rim bar behind
  panel(30, 30, 0.25, 0x4a3a30, [0, -14, 0]);   // warm floor bounce
  panel(6, 6, 2.5, 0xffe2c8, [8, -3, 12]);      // low fill card
  const tex = pmrem.fromScene(s, 0.035).texture; return tex;
}
scene.environment = studioEnv();
// real photographed light (CC0, Poly Haven): a photo studio for the products, a night sky for the outdoor scenes
const ENV = { studio: scene.environment, night: null, nightBg: null };
const rgbe = new RGBELoader();
const loadHDR = (url) => new Promise((res) => rgbe.load(url, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; res(t); }, undefined, () => res(null)));
// outdoor scenes (airfield, full RailBlazer layout) only exist if their chapters are in the page; skip their heavy assets otherwise
const OUTDOOR = !!(document.getElementById('hiller') || document.getElementById('railblazer'));
const hdrReady = Promise.all([loadHDR('assets/studio_small_09_512.hdr'), OUTDOOR ? loadHDR('assets/kloppenheim_02_1k.hdr') : null]).then(([st, nt]) => {
  if (st) ENV.studio = pmrem.fromEquirectangular(st).texture;
  if (nt) { ENV.night = pmrem.fromEquirectangular(nt).texture; ENV.nightBg = nt; }
});
const texL = new THREE.TextureLoader();
const tex = (url, rep, srgb) => { if (!OUTDOOR) return null; const t = texL.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 800);
camera.position.set(0, 0, 12);
// post: MSAA half-float target -> subtle bloom on lights and hot specular -> tone map + sRGB
const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: PHONE ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth / 2, innerHeight / 2); gtao.blendIntensity = 0.85; composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight).multiplyScalar(0.5), 0.3, 0.35, 2.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const key = new THREE.DirectionalLight(0xfff0de, 2.0);
key.position.set(6, 9, 8); key.castShadow = true;
key.shadow.mapSize.set(PHONE ? 1024 : 2048, PHONE ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
scene.add(key, key.target);
const rimL = new THREE.DirectionalLight(0xa9bdff, 1.0); rimL.position.set(-8, 5, -8); scene.add(rimL);
const warm = new THREE.DirectionalLight(0xff8a50, 0.55); warm.position.set(9, -4, 3); scene.add(warm);
scene.add(new THREE.HemisphereLight(0x8a96a8, 0x0a0b0c, 0.25));

initMaterials();
Object.values(MAT).forEach((m) => { if (m && m.isMeshPhysicalMaterial && m !== MAT.smoke && m.envMapIntensity === 1) m.envMapIntensity = 0.9; });
setLoad(0.25);

// ---------- state ----------
const S = { w: innerWidth, h: innerHeight, visW: 1, visH: 1, mobile: false, mx: 0, my: 0, tmx: 0, tmy: 0, scroll: 0, t: 0, intro: 0 };
function computeVis() {
  S.w = innerWidth; S.h = innerHeight; S.mobile = S.w < 860;
  S.visH = 2 * 12 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); S.visW = S.visH * camera.aspect;
}
computeVis();
if (!REDUCED) addEventListener('pointermove', (e) => { S.tmx = (e.clientX / S.w) * 2 - 1; S.tmy = (e.clientY / S.h) * 2 - 1; }); // no pointer parallax under reduced motion (WCAG 2.3.3)

const labelsEl = document.getElementById('labels');
function makeLabel(text, cls = '') {
  const d = document.createElement('div'); d.className = 'lbl ' + cls;
  d.innerHTML = `<i class="d"></i><i class="l"></i><span>${text}</span>`; labelsEl.appendChild(d); return d;
}
const _v = new THREE.Vector3(), _c = new THREE.Vector3();
function toScreen(v) { _v.copy(v).project(camera); return [(_v.x * 0.5 + 0.5) * S.w, (-_v.y * 0.5 + 0.5) * S.h, _v.z]; }
// Teardown labels: place a whole set at once so labels on the same side never overlap; colliding ones slide down
// just enough to clear (a 26px row), keeping the leader dot close to its part.
function placeLabelSet(items, centerX) {
  const live = [];
  for (const it of items) {
    if (it.op < 0.01) { placeLabel(it.el, null, 0); continue; }
    const [x, y, z] = toScreen(it.world); if (z > 1) { placeLabel(it.el, null, 0); continue; }
    let left = x < centerX; const w = it.el._w || (it.el._w = it.el.offsetWidth || 160);
    if (!left && x + w > innerWidth - 16) left = true; else if (left && x - w < (S.safeL || 16)) left = false; // never clipped by the viewport edge
    live.push({ ...it, x, y: Math.max(y, 92), left }); // never under the fixed nav band
  }
  // one 26px row per label wherever their boxes would overlap horizontally (either side), top to bottom
  live.forEach((l) => { const w = l.el._w || 160; l.a = l.left ? l.x - w : l.x; l.b = l.left ? l.x : l.x + w; });
  live.sort((a, b) => a.y - b.y);
  for (let i = 1; i < live.length; i++) for (let j = 0; j < i; j++) {
    const A = live[j], B = live[i]; if (B.a < A.b && A.a < B.b && B.y - A.y < 26) B.y = A.y + 26;
  }
  for (const l of live) {
    l.el.classList.toggle('left', l.left);
    l.el.style.transform = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) translate(${l.left ? '-100%' : '0'},-50%)`;
    l.el.style.opacity = l.op.toFixed(3); l.el._o = l.op;
  }
}
function placeLabel(el, world, op, centerX) {
  if (op < 0.01) { if (el._o !== 0) { el.style.opacity = 0; el._o = 0; } return; }
  const [x, y, z] = toScreen(world);
  if (z > 1) { el.style.opacity = 0; el._o = 0; return; }
  const left = centerX !== undefined ? x < centerX : false;
  el.classList.toggle('left', left);
  el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(${left ? '-100%' : '0'},-50%)`;
  el.style.opacity = op.toFixed(3); el._o = op;
}
function panelFx(list, p) {
  for (const it of list) {
    const [a, b] = it.r; const i = range(p, a - 0.03, a + 0.02), o = 1 - range(p, b - 0.02, b + 0.03);
    const v = Math.min(i, o); const dy = (1 - i) * 28 - (1 - o) * 28;
    if (Math.abs(v - (it._v ?? -1)) > 0.001) { it.n.style.opacity = v.toFixed(3); it.n.style.setProperty('--dy', dy.toFixed(1) + 'px'); it.n.style.visibility = v > 0 ? 'visible' : 'hidden'; it._v = v; }
  }
}

// ============================================================
// HERO
// ============================================================
const hero = { group: new THREE.Group(), page: new THREE.Group(), trainS: 0 };
scene.add(hero.group); hero.group.add(hero.page);
 const hDome = makeDome(), hLock = makeLock(), hPlane = makePlane();
const hCond = makeCondenser(); hero.page.add(hCond.group); // Arctic Glacier: a rooftop condenser sitting on the B
hero.page.add(hDome.group, hLock.group); hero.group.add(hPlane.group);
[hLock].forEach((m) => stylize(m.group, { opacity: 0.38 })); stylize(hPlane.group, { color: 0x2a2d31, opacity: 0.35 });
// hero lock = installed in the N's stem: only the exterior collar, keyed cylinder and bolt read; the rest sits "inside the door"
hLock.parts.forEach((pt) => { if (!['Exterior rose', 'Keyed cylinder', 'Bolt'].includes(pt.label)) pt.obj.visible = false; });
hLock.parts.find((pt) => pt.label === 'Bolt').obj.children.slice(0, 3).forEach((c) => (c.visible = false));
const hCoaster = new THREE.Group(); hero.page.add(hCoaster);
let hTrack = null, hTrain = null, letters = null;

async function buildLetters() {
  try { await document.fonts.load('900 200px "Big Shoulders Display"'); } catch (e) {}
  const word = 'BANKS', fs = 1100, pad = 30;
  const c = document.createElement('canvas'); const ctx = c.getContext('2d', { willReadFrequently: true });
  const font = `900 ${fs}px "Big Shoulders Display", "Arial Narrow", sans-serif`; ctx.font = font;
  const spacing = fs * 0.012;
  const adv = [...word].map((ch) => ctx.measureText(ch).width);
  const m = ctx.measureText(word); const asc = m.actualBoundingBoxAscent, desc = Math.max(0, m.actualBoundingBoxDescent);
  const total = adv.reduce((a, b) => a + b, 0) + spacing * (word.length - 1);
  c.width = Math.ceil(total + pad * 2); c.height = Math.ceil(asc + desc + pad * 2);
  ctx.font = font;
  // pass 1: solid glyphs for measuring the real letterforms
  ctx.fillStyle = '#fff'; let x = pad; const box = [];
  for (let i = 0; i < word.length; i++) { ctx.fillText(word[i], x, pad + asc); box.push({ l: x, r: x + adv[i], t: pad, b: pad + asc }); x += adv[i] + spacing; }
  const A = ctx.getImageData(0, 0, c.width, c.height).data; const W0 = c.width;
  const on = (px, py) => A[((py | 0) * W0 + (px | 0)) * 4 + 3] > 128;
  const runs = (fixed, from, to, vertical) => { const out = []; let st = null, prev = null; const dir = to > from ? 1 : -1;
    from = Math.round(from); to = Math.round(to); for (let v = from; dir > 0 ? v < to : v > to; v += dir) { const o = vertical ? on(fixed, v) : on(v, fixed); if (prev !== null && o !== prev) { if (!o) st = v; else if (st !== null) { out.push([st, v]); st = null; } } prev = o; } return out; };
  const capH = asc;
  const N = (px, py) => [(px - c.width / 2) / c.height, (c.height / 2 - py) / c.height]; // -> letter-height units
  const F = {};
  { const bx = box[0], col = bx.l + (bx.r - bx.l) * 0.56; const r = runs(col, bx.t, bx.b, true).filter(([a, b]) => b - a > 8);
    const u = r[0], l = r[r.length - 1]; const yu = (u[0] + u[1]) / 2, yl = (l[0] + l[1]) / 2;
    const w = (yy) => { const h = runs(yy, bx.l, bx.r, false).filter(([a, b]) => a < col && b > col)[0] || [col - 40, col + 40]; return h; };
    const hu = w(yu), hl = w(yl);
    F.B = { up: N((hu[0] + hu[1]) / 2, yu), lo: N((hl[0] + hl[1]) / 2, yl), cw: Math.min(hu[1] - hu[0], hl[1] - hl[0]) / c.height }; }
  { const bx = box[1], col = (bx.l + bx.r) / 2; let yb = bx.b - 1; while (yb > bx.t && !on(col, yb)) yb--;
    const yy = yb + capH * 0.06; const h = runs(yy, bx.l, bx.r, false).filter(([a, b]) => a <= col && b >= col)[0] || [col - 50, col + 50];
    F.A = { ceil: N(col, yb + 1), cw: (h[1] - h[0]) / c.height, ch: (bx.b - yb) / c.height }; }
  { const bx = box[2], yy = bx.t + capH * 0.6; const r = runs(yy, bx.l - 2, bx.r + 2, false);
    let x0 = bx.l; while (x0 < bx.r && !on(x0, yy)) x0++; let x1 = x0; while (x1 < bx.r && on(x1, yy)) x1++; let x2 = x1; while (x2 < bx.r && !on(x2, yy)) x2++;
    F.N = { stem: N((x0 + x1) / 2, yy), sw: (x1 - x0) / c.height, edge: N(x1, yy)[0], diag: N(x2, yy)[0] }; }
  { const bx = box[3], yy = bx.t + capH * 0.5; let xj = bx.r - 1; while (xj > bx.l && !on(xj, yy)) xj--;
    let ya = yy; while (ya > bx.t && !on(xj + (bx.r - xj) * 0.4, ya)) ya--; let yb = yy; while (yb < bx.b && !on(xj + (bx.r - xj) * 0.4, yb)) yb++;
    let k0 = Math.round(bx.l); while (k0 < bx.r && !on(k0, yy)) k0++; let k1 = k0; while (k1 < bx.r && on(k1, yy)) k1++;
    F.K = { v: N(xj + (bx.r - xj) * 0.35, yy), oh: (yb - ya) / c.height, stem: N((k0 + Math.min(k1, k0 + (bx.r - bx.l) * 0.3)) / 2, yy), l: N(bx.l, yy)[0] }; }
  { const bx = box[0], xc = bx.l + (bx.r - bx.l) * 0.36; let yt = bx.t; while (yt < bx.b && !on(xc, yt)) yt++; F.Btop = N(xc, yt); }
  { const bx = box[4]; F.S = { top: N((bx.l + bx.r) / 2, bx.t), c: N((bx.l + bx.r) / 2, (bx.t + bx.b) / 2), l: N(bx.l, bx.t)[0], r: N(bx.r, bx.t)[0] }; }
  // pass 2: the painted letters
  ctx.clearRect(0, 0, c.width, c.height);
  const gr = ctx.createLinearGradient(0, pad, 0, pad + asc + desc);
  gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.5, '#efe9dc'); gr.addColorStop(0.82, '#7a756b'); gr.addColorStop(1, '#202122');
  ctx.fillStyle = gr; x = pad;
  for (let i = 0; i < word.length; i++) { ctx.fillText(word[i], x, pad + asc); x += adv[i] + spacing; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true;
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, alphaToCoverage: true, fog: false });
  mat.color.setScalar(2.1);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  letters = { mesh, cw: c.width, ch: c.height, F };
  hero.page.add(mesh);
  // coaster: a vertical loop threaded through both counters of the B, wrapped around its middle bar
  const CU = 12; const { up, lo } = F.B; const cx = (up[0] + lo[0]) / 2, ym = (up[1] + lo[1]) / 2, ry = (up[1] - lo[1]) / 2 * 1.04, rz = ry * 1.9;
  const pts = []; for (let k = 0; k < 28; k++) { const t = (k / 28) * Math.PI * 2; pts.push(new THREE.Vector3((cx + 0.7 * rz * Math.sin(t)) * CU, (ym + ry * Math.cos(t)) * CU, rz * Math.sin(t) * CU)); }
  hTrack = buildTrack(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), { closed: true, samples: 500 });
  hTrain = makeTrain(5, { riders: true }); stylize(hTrain.group, { color: 0x111214, opacity: 0.5 }); hCoaster.add(hTrack.mesh, hTrain.group); hCoaster.userData.CU = CU;
}

function layoutHero() {
  if (!letters) return;
  const ar = letters.cw / letters.ch;
  const W = Math.min(S.visW * (S.mobile ? 0.96 : 0.92), S.visH * 0.74 * ar), H = W / ar;
  const yc = S.mobile ? S.visH * 0.06 : -S.visH * 0.035;
  letters.mesh.scale.set(W, H, 1); letters.mesh.position.set(0, yc, 0);
  hero.L = { W, H, yc };
  const F = letters.F, P = (n) => [n[0] * H, yc + n[1] * H];
  // dome: ceiling-mounted under the A's crossbar, hanging inside the counter
  const [ax, ay] = P(F.A.ceil); const ds = Math.min((F.A.cw * H * 1.25) / 2.52, (F.A.ch * H * 0.85) / 1.72);
  // lock: mounted on the face of the N's left stem (back plate flush, nothing cut by the letter); bolt throws toward the diagonal
  const [nx, ny] = P(F.N.stem); const ls = (F.N.sw * H * 1.02) / 1.43; const D = -0.53;
  const stemHalfL = (F.N.sw * H * 0.5) / ls, gapL = ((F.N.diag - F.N.edge) * H) / ls;
  hero.lockBolt = { base: stemHalfL * 0.92 - 0.525, throw: gapL * 0.9 };
  
  // plane: skims the top of the S, far wing tucked behind the letter
  const [sx, sy] = P(F.S.top), [scx, scy] = P(F.S.c);
  hero.planeOrbit = { cx: scx, cy: scy + 0.2 * H, rx: (F.S.r - F.S.l) * H * 0.5 + 0.07 * H, rz: 0.3 * H };
  hero.base = {
    dome: { p: [ax, ay - 0.53 * ds, 0.08 * H], r: [0.1, -0.35, 0], s: ds },
    lock: { p: [nx, ny, -D * ls], r: [0.1, Math.PI / 2 - 0.4, 0], s: ls },
    
    plane: { s: H / 13 },
    cond: { p: [P(F.Btop)[0], P(F.Btop)[1] - 0.012 * H, 0], r: [0.3, 0.55, 0], s: (0.135 * H) / 0.95 },
  };
  hCoaster.position.set(0, yc, 0); hCoaster.scale.setScalar(H / hCoaster.userData.CU);
}

function applyBase(obj, b, extra = {}) {
  obj.position.set(b.p[0] + (extra.x || 0), b.p[1] + (extra.y || 0), b.p[2] + (extra.z || 0));
  obj.rotation.set(b.r[0] + (extra.rx || 0), b.r[1] + (extra.ry || 0), b.r[2] + (extra.rz || 0));
  obj.scale.setScalar(b.s * (extra.s || 1));
}
const lockLed = (mats, on) => mats.forEach((m) => m.material.color.setRGB(lerp(0.05, 1.2, on), lerp(0.05, 3.2, on), lerp(0.05, 1.6, on)));

function updateHero(dt) {
  const h = S.scroll / S.h; const vis = h < 1.4 && !!letters; hero.group.visible = vis;
  if (!HAS_A) { // camera hand-off: the dome is pulled down out of the A and becomes the first chapter's camera
    const vk = chapters[0]; const kE = vk && vk.len ? vk.top + 0.04 * (vk.len - S.h) : S.h * 1.2;
    hero.domeK = io(range(S.scroll, S.h * 0.06, kE)); }
  if (!vis) return;
  const B = hero.base, L = hero.L; const e = io(range(h, 0, 0.8)), intro = outExpo(S.intro);
  hero.group.rotation.y = S.mx * 0.05; hero.group.rotation.x = S.my * 0.025;
  hero.page.position.y = h * S.visH - (1 - intro) * L.H * 0.12;
  const pageY = hero.page.position.y;
  
  // plane: flies laps around the S, banked into the turn, then climbs away on scroll
  hero.planeT = (hero.planeT || 0) + dt * (0.42 + h * 0.5) * (REDUCED ? 0.3 : 1);
  { const o = hero.planeOrbit, th = hero.planeT + 1.2, c = Math.cos(th), sn = Math.sin(th), k = e;
    const x = o.cx + o.rx * c + k * S.visW * 0.5, z = o.rz * sn, y = o.cy + pageY + Math.sin(th * 2) * 0.012 * L.H + k * k * S.visH * 0.8;
    const dx = -o.rx * sn, dz = o.rz * c; const yaw = Math.atan2(-dz, dx);
    hPlane.group.position.set(x, y, z); hPlane.group.scale.setScalar(B.plane.s * lerp(0.9, 1, intro));
    hPlane.group.quaternion.setFromEuler(new THREE.Euler(lerp(0.42, 0.1, k), yaw, 0.06 + k * 0.3, 'YXZ'));
    hPlane.prop.rotation.x += dt * 40; MAT.blur.opacity = 0.09; hPlane.setFlaps(0); hPlane.setElevator(10 * io(range(h, 0, 0.25))); }
  // dome: CD63 aim is fixed at install; on scroll the motorized zoom racks in and IR wakes up
  applyBase(hDome.group, B.dome, { s: lerp(0.92, 1, intro) });
  if (!HAS_A) { const k = hero.domeK || 0;
    if (k > 0) { // lerp from its spot under the A to the chapter camera's pose, sagging downward on the way
      hero.page.updateMatrixWorld(true);
      const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3(), p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), s1 = new THREE.Vector3();
      hDome.group.matrixWorld.decompose(p0, q0, s0); cDome.group.matrixWorld.decompose(p1, q1, s1);
      const arc = Math.sin(Math.PI * k); const pw = p0.lerp(p1, k); pw.y -= arc * S.visH * 0.22;
      const mw = new THREE.Matrix4().compose(pw, q0.slerp(q1, k), s0.lerp(s1, k));
      new THREE.Matrix4().copy(hero.page.matrixWorld).invert().multiply(mw).decompose(hDome.group.position, hDome.group.quaternion, hDome.group.scale);
    }
    hDome.group.visible = k < 0.999; }
  hDome.zoom.position.z = 0.09 * io(range(h, 0.02, 0.3)) + 0.012 * Math.sin(S.t * 0.8); miniOf(MAT.irLed).emissiveIntensity = (0.9 + 1.1 * (0.5 + 0.5 * Math.sin(S.t * 1.8))) + 1.0 * io(range(h, 0.05, 0.3));
  lockLed([hDome.led], (S.t % 2.2) < 0.14 ? 1 : 0.12);
  // lock: bolt shoots out of the N's stem across the counter
  const lk = io(range(h, 0.02, 0.26));
  applyBase(hLock.group, B.lock, { s: lerp(0.92, 1, intro) });
  hLock.bolt.position.z = hero.lockBolt.base + hero.lockBolt.throw * lk;
  // condenser: sits on the B like a rooftop unit, fan always turning
  applyBase(hCond.group, B.cond, { s: lerp(0.92, 1, intro) });
  hCond.fan.rotation.y += dt * (3 + h * 8) * (REDUCED ? 0.3 : 1);
  // coaster: train runs the loop through the B, faster as you scroll
  hero.trainS += dt * (1.6 + h * 10) * (REDUCED ? 0.2 : 1);
  if (hTrain) placeTrain(hTrain, hTrack, hero.trainS);
}

// ============================================================
// TEARDOWN CHAPTERS
// ============================================================
const chapters = [];
function teardown(id, model, opt) {
  const el = document.getElementById(id);
  const anchor = new THREE.Group(), yawG = new THREE.Group(); anchor.add(yawG); yawG.add(model.group); scene.add(anchor);
  const parts = model.parts.map((p) => ({ ...p, bp: p.obj.position.clone(), br: p.obj.rotation.clone() }));
  const labels = parts.filter((p) => p.label).map((p) => ({ p, el: makeLabel(p.label) }));
  const panels = [...el.querySelectorAll('[data-range]')].map((n) => ({ n, r: n.dataset.range.split(',').map(Number) }));
  const cats = [...el.querySelectorAll('[data-cat]')];
  // studio shadow catcher: products sit over a soft cast shadow, like a product shot
  model.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#999'); g.addColorStop(0.65, '#2a2a2a'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.7, metalness: 0, alphaMap: floorTex, transparent: true, depthWrite: false, envMapIntensity: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -opt.h * 0.5; floor.scale.set(opt.w * 1.5, opt.w * 1.0, 1); floor.receiveShadow = true; anchor.add(floor);
  const catcher = floor;
  const ch = { id, el, kind: 'td', anchor, yawG, model, parts, labels, panels, cats, opt, e: [0, 0, 0], catcher };
  chapters.push(ch); return ch;
}

// One motion language for every product: rises in from below (ease-out), leaves out the top about twice as fast
// (ease-in), per the motion-token research: same curve family everywhere, exits shorter than entrances.
const SLIDE = { en: [-0.22, 0.06], ex: [0.9, 1.04], inD: 1.0, outD: 1.2 };
const easeInC = (t) => t * t;
// en0: a tall product can start its rise a beat later so it never shares the frame with the one still leaving
const slideIn = (p, en0 = SLIDE.en[0]) => -(1 - out(range(p, en0, SLIDE.en[1]))) * S.visH * SLIDE.inD;
const slideOut = (p) => easeInC(range(p, SLIDE.ex[0], SLIDE.ex[1]));
const slideY = (p, en0) => slideIn(p, en0) + slideOut(p) * S.visH * SLIDE.outD;
function updateTeardown(ch, p, dt) {
  const vis = p > -0.35 && p < SLIDE.ex[1] + 0.02; ch.anchor.visible = vis; // gone once it has left the frame (also skips its shadow pass)
  panelFx(ch.panels, p);
  if (!vis) { ch.labels.forEach((l) => placeLabel(l.el, null, 0)); return; }
  const o = ch.opt; const re = io(range(p, 0.84, 0.92));
  const e = [range(p, 0.27, 0.41), range(p, 0.43, 0.57), range(p, 0.59, 0.73)].map((v) => Math.min(io(v), 1 - re)); ch.e = e;
  for (const pt of ch.parts) {
    const k = e[pt.cat]; pt.obj.position.copy(pt.bp).addScaledVector(pt.off, k);
    if (pt.rot) pt.obj.rotation.set(pt.br.x + pt.rot.x * k, pt.br.y + pt.rot.y * k, pt.br.z + pt.rot.z * k);
  }
  const desk = !S.mobile; const ex = (e[0] + e[1] + e[2]) / 3;
  const s = o.fit * (desk ? 1 : o.fitM || 1) * Math.min((S.visW * (desk ? 0.5 : 0.92)) / o.w, (S.visH * (desk ? 0.74 : 0.46)) / o.h);
  ch.anchor.scale.setScalar(s);
  ch.anchor.position.set(desk ? S.visW * 0.13 : 0, desk ? 0 : S.visH * 0.17, 0);
  ch.anchor.position.y += (o.yShift || 0) * ex * s;
  ch.anchor.rotation.set(o.tilt + S.my * 0.04, 0, 0);
  ch.yawG.rotation.y = lerp(o.yaw[0], o.yaw[1], clamp(p, -0.2, 1.1)) + S.mx * 0.14;
  const enter = range(p, o.enter[0], o.enter[1]), exit = range(p, 0.93, 1.1);
  o.motion(ch, p, enter, exit, e, dt);
  ch.catcher.material.opacity = 1 - io(range(p, SLIDE.ex[0], SLIDE.ex[0] + 0.06)); // the floor shadow leaves with its product, not after it
  // categories in the source list
  let live = -1; e.forEach((v, i) => { if (v > 0.02 && p < 0.74) live = i; });
  ch.cats.forEach((c) => { const i = +c.dataset.cat; c.classList.toggle('on', e[i] > 0.45 || p > 0.74); c.classList.toggle('live', i === live); });
  // labels
  ch.anchor.updateMatrixWorld(true);
  const cx = toScreen(_c.setFromMatrixPosition(ch.anchor.matrixWorld))[0];
  placeLabelSet(ch.labels.map((l) => ({ el: l.el, world: l.p.obj.localToWorld(new THREE.Vector3().copy(l.p.anchor)), op: range(e[l.p.cat], 0.6, 0.95) * (1 - range(p, 0.8, 0.84)) })), cx);
}



const zoomLbl = makeLabel('Motorized zoom · 2.25×');
const specLabel = (el, obj, anc, op) => { obj.updateMatrixWorld(true); placeLabel(el, obj.localToWorld(_c.set(...anc)), op, -1); };
const cDome = makeDome();
teardown('verkada', cDome, {
  w: 4.6, h: 7.6, fit: 1, tilt: 0.16, yaw: [-0.6, 0.6], yShift: -0.34, enter: [-0.2, 0.05],
  motion(ch, p, en, ex, e, dt) {
    const a = ch.anchor;
    if (HAS_A) a.position.y += slideY(p);
    else { a.position.y += slideOut(p) * S.visH * SLIDE.outD; if ((hero.domeK ?? 1) < 0.999 && p <= 0.12) a.visible = false; } // the hero dome lands here
    // install-time 3-axis gimbal (pan 360, tilt 65) demonstrated during the intro, then the motorized zoom racks in
    // a dome's aim is fixed at install; what actually moves is the motorized zoom, so that's what animates
    cDome.gimbal.rotation.set(0.62, 0, 0);
    cDome.zoom.position.z = 0.09 * io(range(p, 0.04, 0.16)) * (1 - io(range(p, 0.2, 0.26)));
    miniOf(MAT.irLed).emissiveIntensity = (0.9 + 1.1 * (0.5 + 0.5 * Math.sin(S.t * 1.8))) + 1.2 * range(p, 0.06, 0.12) * (1 - range(p, 0.22, 0.27));
    cDome.zoom.position.z += 0.012 * Math.sin(S.t * 0.8);
    specLabel(zoomLbl, cDome.zoom, [0.22, 0, 0.66], range(p, 0.05, 0.08) * (1 - range(p, 0.2, 0.23)));
    lockLed([cDome.led], (S.t % 2.2) < 0.14 ? 1 : 0.12);
  },
});

const cLock = makeLock(); stylize(cLock.group, { color: 0x2a2018, opacity: 0.35 });
teardown('level', cLock, {
  w: 8.6, h: 6.6, fit: 0.86, fitM: 0.86, tilt: 0.28, yaw: [0.62, 1.05], yShift: -0.2, enter: [-0.2, 0.05],
  motion(ch, p, en, ex, e, dt) {
    const a = ch.anchor; a.position.y += slideY(p);
    const lk = Math.max(io(range(p, 0.0, 0.08)) * (1 - range(p, 0.2, 0.26)), io(range(p, 0.92, 0.98)));
    cLock.bolt.position.z = 0.98 + cLock.throw * lk; cLock.turn.rotation.x = cLock.turn.rotation.x * 0 + lk * Math.PI / 2; lockLed(cLock.leds, lk);
    cLock.strike.visible = e[0] > 0.01; cLock.strike.scale.setScalar(Math.max(0.001, e[0]));
  },
});

const cIce = makeIcePlant();
teardown('arctic', cIce, {
  w: 9.4, h: 6.8, fit: 0.92, tilt: 0.5, yaw: [-0.55, 0.35], yShift: -0.25, enter: [-0.2, 0.05],
  motion(ch, p, en, ex, e, dt) {
    const a = ch.anchor; a.position.y += slideY(p, -0.15); // tallest model: rise starts after the lock has cleared
    // passive: condenser fans turn, bags ride the bagging lines into cold storage
    cIce.fans.forEach((f, i) => (f.rotation.y += dt * (4 + i)));
    const { x0, x1 } = cIce.belt;
    cIce.bags.forEach((b) => { const f = (b.k + S.t * 0.08) % 1; b.m.position.x = lerp(x0 + 0.5, x1, f); b.m.visible = f < 0.97; });
  },
});

// ============================================================
// HILLER: AIRFIELD
// ============================================================
const air = { group: new THREE.Group(), plane: makePlane() }; stylize(air.plane.group, { color: 0x2a2d31, opacity: 0.4 });
scene.add(air.group);
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: 0x141b17, roughness: 1, envMapIntensity: 0.02 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; air.group.add(ground);
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(220, 10.4), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, map: tex('assets/asphalt_02_diff_1k.jpg', [44, 2], true), normalMap: tex('assets/asphalt_02_nor_gl_1k.jpg', [44, 2]), roughnessMap: tex('assets/asphalt_02_rough_1k.jpg', [44, 2]), envMapIntensity: 0.6 }));
  runway.rotation.x = -Math.PI / 2; runway.position.set(40, 0.01, 0); runway.receiveShadow = true; air.group.add(runway);
  const dashM = new THREE.MeshBasicMaterial({ color: 0x5c5952 });
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 0.22), dashM, 50); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 50; i++) { m4.compose(new THREE.Vector3(-60 + i * 6.2, 0.02, 0), q, new THREE.Vector3(1, 1, 1)); dashes.setMatrixAt(i, m4); }
  air.group.add(dashes);
  const keys = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.2, 0.42), dashM, 12);
  for (let i = 0; i < 12; i++) { const z = -2.5 + (i % 6) * 1.0 + (i < 6 ? 0 : 0); if (i >= 6) continue; m4.compose(new THREE.Vector3(-27, 0.02, (i < 3 ? -4.2 : 1.6) + (i % 3) * 0.9), q, new THREE.Vector3(1, 1, 1)); keys.setMatrixAt(i, m4); }
  keys.count = 6; air.group.add(keys);
  const lightG = new THREE.SphereGeometry(0.028, 10, 8);
  const edge = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a8).multiplyScalar(2.2) }), 140);
  for (let i = 0; i < 70; i++) for (let s = 0; s < 2; s++) { m4.makeTranslation(-62 + i * 3.2, 0.1, s ? 5.5 : -5.5); edge.setMatrixAt(i * 2 + s, m4); }
  air.group.add(edge);
  const thr = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4dff9a).multiplyScalar(3) }), 8);
  for (let i = 0; i < 8; i++) { m4.makeTranslation(-29.5, 0.1, -4.9 + i * 1.4); thr.setMatrixAt(i, m4); } air.group.add(thr);
  const far = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fa6ff).multiplyScalar(1.6) }), 220);
  const R = (() => { let s = 9; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 220; i++) { const x = -80 + R() * 260, z = -90 + R() * 75; m4.makeTranslation(x, 0.08, z < -8 ? z : -8 - R() * 30); far.setMatrixAt(i, m4); }
  air.group.add(far);
  air.plane.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  air.group.add(air.plane.group);
}
const arrow = (color) => {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true });
  const g = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 12), m); shaft.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 20), m); g.add(shaft, head);
  g.userData = { shaft, head, m }; g.setLen = (L) => { shaft.scale.y = Math.max(0.01, L); shaft.position.y = L / 2; head.position.y = L + 0.1; }; return g;
};
const forces = {
  lift: { a: arrow(0xff5b1f), at: [0.35, 0.3, 0], r: [0, 0, 0], label: makeLabel('Lift', 'force hot') },
  weight: { a: arrow(0xe7e2d7), at: [0.3, -0.3, 0], r: [0, 0, Math.PI], label: makeLabel('Weight', 'force') },
  thrust: { a: arrow(0xe7e2d7), at: [1.85, 0, 0], r: [0, 0, -Math.PI / 2], label: makeLabel('Thrust', 'force') },
  drag: { a: arrow(0xe7e2d7), at: [-1.85, 0.05, 0], r: [0, 0, Math.PI / 2], label: makeLabel('Drag', 'force') },
};
Object.entries(forces).forEach(([k, f]) => { f.a.position.set(...air.plane.anchors[k]); f.a.rotation.set(...f.r); air.plane.group.add(f.a); });
const airCh = { id: 'hiller', el: document.getElementById('hiller'), kind: 'air' };
if (airCh.el) { airCh.panels = [...airCh.el.querySelectorAll('[data-range]')].map((n) => ({ n, r: n.dataset.range.split(',').map(Number) })); chapters.push(airCh); }
const camAir = { p: new THREE.Vector3(-20, 6, 14), t: new THREE.Vector3(-14, 1, 0), init: false };

// Studio presentation (same vibe as the products): the Cessna is already in cruise, rises in from the bottom,
// floats with the prop turning and small control corrections, then climbs out the top.
const planeAnchor = new THREE.Group(), planeYaw = new THREE.Group(); planeAnchor.add(planeYaw); scene.add(planeAnchor);
planeYaw.add(air.plane.group); air.group.visible = false;
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#999'); g.addColorStop(0.65, '#2a2a2a'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.7, alphaMap: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, envMapIntensity: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.scale.set(7.5, 5, 1); floor.receiveShadow = true; planeAnchor.add(floor);
}
function updateAir(ch, p, dt) {
  panelFx(ch.panels, p);
  air.group.visible = false;
  const vis = p > -0.35 && p < 1.15; planeAnchor.visible = vis;
  if (!vis) { Object.values(forces).forEach((f) => placeLabel(f.label, null, 0)); return null; }
  const pl = air.plane, desk = !S.mobile;
  const s = Math.min((S.visW * (desk ? 0.5 : 0.9)) / 4.8, (S.visH * (desk ? 0.62 : 0.4)) / 2.4);
  planeAnchor.scale.setScalar(s);
  const enter = out(range(p, -0.25, 0.05)), exit = io(range(p, 0.93, 1.1));
  planeAnchor.position.set(desk ? S.visW * 0.14 : 0, (desk ? 0 : S.visH * 0.17) - (1 - enter) * S.visH * 1.0 + exit * S.visH * 1.15, 0);
  planeAnchor.rotation.set(0.16 + S.my * 0.04, 0, 0);
  planeYaw.rotation.y = lerp(-0.75, 0.55, clamp(p, -0.2, 1.1)) + S.mx * 0.14;
  // cruise: gentle bob, bank and pitch, with matching small control inputs
  const t = S.t;
  pl.group.position.set(1.5, Math.sin(t * 0.9) * 0.06, 0);
  pl.group.rotation.set(0.07 * Math.sin(t * 0.45), 0, 0.04 * Math.sin(t * 0.6) + exit * 0.35);
  pl.setFlaps(0); pl.setElevator(3 * Math.sin(t * 0.6 + 0.8) + exit * 10); pl.setRudder(2.5 * Math.sin(t * 0.45 + 1.2));
  pl.beacon.material.color.setRGB(((t % 1.2) < 0.1 ? 6 : 0.2), 0.05, 0.03);
  pl.prop.rotation.x += dt * 60; MAT.blur.opacity = 0.12;
  // the four forces in balance, as in steady cruise
  const fv = range(p, 0.06, 0.14) * (1 - range(p, 0.86, 0.94));
  const len = { lift: 1.25, weight: 1.25, thrust: 1.0, drag: 1.0 };
  pl.group.updateMatrixWorld(true);
  for (const [k, f] of Object.entries(forces)) {
    f.a.setLen(len[k]); f.a.userData.m.opacity = fv; f.a.visible = fv > 0.01;
    const tip = _c.set(0, len[k] + 0.35, 0); f.a.localToWorld(tip);
    placeLabel(f.label, tip, fv);
  }
  return null;
}

// ============================================================
// RAILBLAZER
// ============================================================
const rb = { group: new THREE.Group() }; scene.add(rb.group);
// RailBlazer, ride order: station -> 106 ft chain lift -> 180 deg left at the crest -> 90 deg drop into the rock tunnel ->
// dive loop -> right-turning airtime hill + left drop -> upward helix (right) -> corkscrew -> zero-g roll ->
// low overbank across the station roof -> final overbank -> brakes -> right turn into the station. 1 unit ~ 1.2 m.
// 4th value = rider roll vs WORLD up in degrees (0 upright, + leans right, 180 inverted). Points on vertical track are ignored.
const CTL = [
  [-45, 1.5, 0, 0], [-40, 1.5, 0, 0], [-34, 1.5, 0, 0], [-28, 1.5, 0, 0], [-22, 1.6, 0, 0],
  [-17, 2.6, 0, 0], [-12, 7.2, 0, 0], [-4, 15.2, 0, 0], [4, 23.2, 0, 0], [8.5, 27, 0, 0],
  [11.5, 28.4, -0.6, -25], [14.6, 28.6, -3, -45], [16, 28.4, -6, -50], [14.8, 28.1, -9, -45], [11.8, 27.7, -10.6, -20],
  [8.6, 26.6, -11, 0], [6.6, 23.5, -11, 0], [6.0, 17, -11, 0], [5.9, 10, -11, 0], [5.4, 4.5, -11, 0], [3.4, 2.0, -11, 0], [-0.5, 1.8, -11, 0],
  [-5, 3.6, -11.5, -30], [-9.5, 8.5, -12.5, -90], [-12.8, 13.8, -14, -150], [-15.2, 16.8, -15.5, -180], [-17.4, 16.2, -17, -180], [-19, 13, -18.5, -180],
  [-19, 8, -20, 0], [-16.5, 3.6, -21.5, 0], [-12, 2.2, -22.3, 0], [-6, 2.6, -22.6, 0],
  [0, 7, -22.6, 0], [5, 12.5, -22.4, 0], [10, 12.8, -22, 0], [15, 8, -21.5, 20],
  [20, 4, -20, 45], [24.5, 3, -16.5, 55], [26.6, 3.6, -12, 55],
  [27, 5, -8, 60], [25.2, 6.5, -3.8, 62], [21, 8, -2, 62], [16.8, 9.5, -3.8, 62], [15, 11, -8, 60], [16.8, 12.3, -12.2, 50], [21, 13, -14, 25],
  [26, 12, -15.5, -20], [30, 8.5, -18.5, -45], [32, 4.5, -23, -40],
  [32, 5.5, -28, -20], [30, 9, -32, -90], [26, 10.5, -34, -180], [21, 9.5, -34, -270], [16, 7.5, -33, -360],
  [10, 8.5, -32, -360], [4, 9.5, -31.5, -450], [-2, 9.5, -31, -540], [-8, 8.3, -30, -630], [-13, 6.8, -29, -720],
  [-18, 6, -27, -760], [-22, 6.5, -23, -810], [-27, 8, -15, -830], [-29, 8.5, -6, -830], [-28.5, 8, 2, -800],
  [-30, 6.5, 9, -680], [-36, 5, 13, -650], [-44, 4, 13, -640], [-51, 3, 10, -660],
  [-55, 2.2, 4, -680], [-53, 1.6, -0.8, -700], [-49.5, 1.5, -0.1, -720], [-47, 1.5, 0, -720]];
const rbCurve = new THREE.CatmullRomCurve3(CTL.map((c) => new THREE.Vector3(c[0], c[1], c[2])), false, 'centripetal');
const rbKeys = (() => { const n = CTL.length - 1, D = 40, L = rbCurve.getLengths(n * D), tot = L[L.length - 1]; return CTL.map((c, k) => ({ u: L[k * D] / tot, deg: c[3] })); })();
const rbTrack = buildTrack(rbCurve, { samples: 1600, rollKeys: rbKeys });
rb.group.add(rbTrack.mesh, supportsFor(rbTrack, { every: 14 }));
{ // rock work at the drop tunnel + redwoods around the layout
  const rockM = new THREE.MeshStandardMaterial({ color: 0x8a6c52, roughness: 0.95, flatShading: true, envMapIntensity: 0.2 });
  const R = (() => { let s = 31; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const rocks = [];
  for (let i = 0; i < 26; i++) { const g = new THREE.DodecahedronGeometry(1, 0); const x = 2 + R() * 6 - 3, z = -11 + (R() < 0.5 ? -1 : 1) * (1.6 + R() * 2.2); g.scale(1.2 + R() * 1.8, 1 + R() * 2.4, 1 + R() * 1.6); g.rotateY(R() * 3); g.translate(x, 0.6 + R() * 1.5, z); rocks.push(g); }
  for (let i = 0; i < 9; i++) { const g = new THREE.DodecahedronGeometry(1, 0); g.scale(1.6, 1.2, 1.6); g.translate(1.2 + i * 0.6 - 2.4, 4.2 + R() * 0.6, -11 + (R() - 0.5) * 0.6); rocks.push(g); }
  const rm = new THREE.Mesh(mergeGeometries(rocks), rockM); rm.castShadow = rm.receiveShadow = true; rb.group.add(rm);
  const trunks = [], crowns = [];
  const near = (x, z) => { for (let i = 0; i < rbTrack.N; i += 6) { const p = rbTrack.P[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < 36) return true; } return false; };
  for (let i = 0; i < 260 && trunks.length < 70; i++) { const x = -75 + R() * 130, z = -60 + R() * 85; if (near(x, z) || (z > -4 && z < 4 && x < -18)) continue;
    const h = 9 + R() * 7; const t = new THREE.CylinderGeometry(0.25, 0.55, h * 0.45, 8); t.translate(x, h * 0.225, z); trunks.push(t);
    const tiers = 5, base = 1.6 + R() * 1.2;
    for (let k = 0; k < tiers; k++) { const f = k / tiers; const c = new THREE.ConeGeometry(base * (1 - f * 0.72), h * 0.32, 14, 1, true); const pos = c.attributes.position;
      for (let v = 0; v < pos.count; v++) { const y = pos.getY(v); if (y < 0) pos.setX(v, pos.getX(v) * (1 + Math.sin(v * 7.1) * 0.08)); }
      c.translate(x, h * (0.32 + f * 0.6), z); crowns.push(c); } }
  const tm = new THREE.Mesh(mergeGeometries(trunks), new THREE.MeshStandardMaterial({ color: 0x4a2c1d, roughness: 0.9, envMapIntensity: 0.2 }));
  const cm = new THREE.Mesh(mergeGeometries(crowns), new THREE.MeshStandardMaterial({ color: 0x1c3324, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.3 }));
  tm.castShadow = cm.castShadow = true; rb.group.add(tm, cm);
}
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: 0x5a5a52, map: tex('assets/forest_leaves_02_diffuse_1k.jpg', [140, 140], true), normalMap: tex('assets/forest_leaves_02_nor_gl_1k.jpg', [140, 140]), roughnessMap: tex('assets/forest_leaves_02_rough_1k.jpg', [140, 140]), envMapIntensity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; rb.group.add(ground);
  
  // station
  const st = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.8, envMapIntensity: 0.2 })); st.position.set(-34, 0.9, 0); st.receiveShadow = true; st.castShadow = true; rb.group.add(st);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.08, 4), MAT.gunmetal); roof.position.set(-34, 4.2, 0); roof.castShadow = true; rb.group.add(roof);
  [[-39.5, 1.6], [-28.5, 1.6], [-39.5, -1.6], [-28.5, -1.6]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.3, 10), MAT.support); c.position.set(x, 2.55, z); rb.group.add(c); });
}
const rbTrain = makeTrain(8, { riders: true }); stylize(rbTrain.group, { color: 0x111214, opacity: 0.5 }); rb.group.add(rbTrain.group);
// physics-paced timeline: time(s)
const rbTime = (() => {
  const N = 1200, L = rbTrack.length, len0 = 8 * rbTrain.spacing; const s0 = len0 + 1, s1 = L - 2;
  let crest = 0, yc = -1; for (let i = 0; i < rbTrack.N; i++) if (rbTrack.P[i].y > yc) { yc = rbTrack.P[i].y; crest = (i / (rbTrack.N - 1)) * L; }
  const S_ = [], T_ = []; let t = 0;
  for (let i = 0; i <= N; i++) {
    const s = s0 + (s1 - s0) * (i / N); S_.push(s); T_.push(t);
    const y = rbTrack.sample(s - 3).p.y; let v;
    if (s < crest) v = 5.5; else v = (3 + 0.42 * Math.sqrt(2 * 8 * Math.max(0, yc - y))) * (1 - 0.15 * ((s - crest) / (s1 - crest)));
    if (s > s1 - 12) v = Math.min(v, lerp(6, 1.5, (s - (s1 - 12)) / 12));
    t += ((s1 - s0) / N) / Math.max(0.5, v);
  }
  const Tm = t; return (q) => { const tt = q * Tm; let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T_[m] < tt) lo = m; else hi = m; } const f = (tt - T_[lo]) / Math.max(1e-6, T_[hi] - T_[lo]); return lerp(S_[lo], S_[hi], clamp(f)); };
})();
const rbCh = { id: 'railblazer', el: document.getElementById('outside') || document.getElementById('railblazer'), kind: 'rb' };
rbCh.panels = [...rbCh.el.querySelectorAll('[data-range]')].map((n) => ({ n, r: n.dataset.range.split(',').map(Number) }));
chapters.push(rbCh);
const camRb = { p: new THREE.Vector3(), t: new THREE.Vector3(), init: false };
// Studio spotlight (same vibe as the products): a three-car RailBlazer train parked on a short, gently curving
// piece of single rail with two supports, rising in from the bottom and leaving out the top.
const rbAnchor = new THREE.Group(), rbYaw = new THREE.Group(); rbAnchor.add(rbYaw); scene.add(rbAnchor); rbAnchor.visible = false;
const spot = (() => {
  const pts = [[-3.4, 0.0, 0.55], [-1.7, 0.0, 0.12], [0, 0.0, 0], [1.7, 0.0, 0.12], [3.4, 0.0, 0.55]].map((v) => new THREE.Vector3(...v));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const track = buildTrack(curve, { samples: 300 });
  rbYaw.add(track.mesh);
  [-2.2, 2.2].forEach((x) => { // round steel columns from the floor up to the rail
    const z = curve.getPoint(0.5 + x / 6.8).z;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.33, 20), MAT.gunmetal); c.position.set(x, -0.935, z); c.castShadow = true; rbYaw.add(c);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), MAT.gunmetal); cap.position.set(x, -0.25, z); rbYaw.add(cap);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 24), MAT.gunmetal); foot.position.set(x, -1.58, z); rbYaw.add(foot);
  });
  const train = makeTrain(3, { riders: true }); rbYaw.add(train.group);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#999'); g.addColorStop(0.65, '#2a2a2a'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.7, alphaMap: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, envMapIntensity: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.scale.set(8, 5, 1); floor.receiveShadow = true; rbAnchor.add(floor);
  // ---- "Off the clock" diorama: a floating island with conifers, a dirt trail + mountain bike, a climbing
  // boulder, the coaster overhead and the Cessna circling above ----
  const R = (() => { let q = 11; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
  const top = -1.0;
  let creekTex = null;
  { // island: mottled meadow over a soil band and stratified rock underside
    // shallower, lighter base so the scene, not the rock, reads first
    const ig = new THREE.CylinderGeometry(3.7, 2.6, 0.8, 64, 8); const pos = ig.attributes.position; const col = [];
    const soil = new THREE.Color(0x6a4c36).convertSRGBToLinear(), rockA = new THREE.Color(0x8d857a).convertSRGBToLinear(), rockB = new THREE.Color(0x6a6259).convertSRGBToLinear();
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); let x = pos.getX(i), z = pos.getZ(i) * 0.72;
      if (y < 0.39) { const n = Math.sin(x * 3.1 + z * 2.3) * 0.5 + Math.sin(x * 7.7 - y * 5.1) * 0.25; x *= 1 + n * 0.06; z *= 1 + n * 0.06; pos.setY(i, y - (0.4 - y) * (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(x * 2.1 + z * 1.7)))); }
      pos.setX(i, x); pos.setZ(i, z);
      const c = y > 0.3 ? soil : rockA.clone().lerp(rockB, 0.5 + 0.5 * Math.sin(y * 18 + x)); col.push(c.r, c.g, c.b); }
    ig.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ig.computeVertexNormals();
    const rock = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.35 }));
    rock.position.y = top - 0.4; rock.castShadow = rock.receiveShadow = true; rbYaw.add(rock);
    const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d'); gx.fillStyle = '#2e4a2a'; gx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 7000; i++) { const v = R(); gx.fillStyle = v < 0.4 ? 'rgba(70,104,52,0.5)' : v < 0.75 ? 'rgba(28,46,26,0.5)' : 'rgba(120,118,70,0.35)'; gx.fillRect(R() * 512, R() * 512, 2 + R() * 6, 2 + R() * 6); }
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(3, 3);
    const grass = new THREE.Mesh(new THREE.CircleGeometry(3.7, 64), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95, envMapIntensity: 0.35 }));
    grass.rotation.x = -Math.PI / 2; grass.scale.y = 0.72; grass.position.y = top + 0.004; grass.receiveShadow = true; rbYaw.add(grass);
    // creek: winds from behind the coaster to the left edge, clear of the trail and the track column
    const creekC = new THREE.CatmullRomCurve3([[0.5, -1.05], [-0.4, -0.75], [-1.3, 0.0], [-2.2, 0.68], [-3.0, 0.9], [-3.55, 1.0]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const nearCreek = (x, z, d) => { for (let i = 0; i <= 60; i++) { const p = creekC.getPoint(i / 60); if ((p.x - x) ** 2 + (p.z - z) ** 2 < d * d) return true; } return false; };
    { const bed = new THREE.TubeGeometry(creekC, 140, 0.21, 8); bed.scale(1, 0.03, 1);
      const bm = new THREE.Mesh(bed, new THREE.MeshStandardMaterial({ color: 0x3b3128, roughness: 1 })); bm.position.y = top + 0.006; rbYaw.add(bm);
      const rc = document.createElement('canvas'); rc.width = rc.height = 128; const rx = rc.getContext('2d'); rx.fillStyle = '#8080ff'; rx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { rx.strokeStyle = `rgba(${110 + R() * 40},${110 + R() * 40},255,0.6)`; rx.lineWidth = 1 + R() * 2; rx.beginPath(); const y = R() * 128; rx.moveTo(0, y); rx.bezierCurveTo(40, y + (R() - 0.5) * 20, 90, y + (R() - 0.5) * 20, 128, y); rx.stroke(); }
      const ripple = new THREE.CanvasTexture(rc); ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping; ripple.repeat.set(10, 1);
      const wg = new THREE.TubeGeometry(creekC, 140, 0.15, 8); wg.scale(1, 0.03, 1);
      const water = new THREE.Mesh(wg, new THREE.MeshPhysicalMaterial({ color: 0x163b47, roughness: 0.22, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.18, normalMap: ripple, normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 0.22 }));
      water.position.y = top + 0.012; rbYaw.add(water); creekTex = ripple;
      const bank = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x4f4b45, roughness: 0.95, flatShading: true }), 34); const m4b = new THREE.Matrix4(), qb = new THREE.Quaternion(), sb = new THREE.Vector3();
      for (let i = 0; i < 34; i++) { const u = R(), p = creekC.getPoint(u), t = creekC.getTangent(u); const side = R() < 0.5 ? 1 : -1; const off = 0.15 + R() * 0.12;
        qb.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)); const r_ = 0.018 + R() * 0.03; sb.set(r_ * 1.3, r_ * 0.7, r_);
        m4b.compose(new THREE.Vector3(p.x - t.z * off * side, top + 0.012, p.z + t.x * off * side), qb, sb); bank.setMatrixAt(i, m4b); }
      bank.castShadow = true; rbYaw.add(bank); }
    // grass tufts: fewer, darker, varied (per-instance colour), kept off the trail and the creek
    const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.11, 4).translate(0, 0.055, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 240);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), tc = new THREE.Color(); let n = 0;
    while (n < 240) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 3.4, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.72;
      if (z > 1.0 && z < 2.1 && Math.abs(z - (1.55 + 0.45 * Math.sin(((x + 3.2) / 6) * 7.5))) < 0.28) continue; if (nearCreek(x, z, 0.3)) continue;
      qq.setFromEuler(new THREE.Euler((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4)); sc.setScalar(0.55 + R() * 0.7); m4.compose(new THREE.Vector3(x, top, z), qq, sc); tuft.setMatrixAt(n, m4);
      tc.setHSL(0.24 + R() * 0.06, 0.35, 0.16 + R() * 0.09).convertSRGBToLinear(); tuft.setColorAt(n, tc); n++; }
    rbYaw.add(tuft);
    const stones = []; for (let i = 0; i < 30; i++) { const sg = new THREE.DodecahedronGeometry(0.04 + R() * 0.07, 0); sg.scale(1, 0.6, 1); const a = R() * Math.PI * 2, rr = 0.8 + R() * 2.6; sg.translate(Math.cos(a) * rr, top + 0.02, Math.sin(a) * rr * 0.72); stones.push(sg); }
    const st = new THREE.Mesh(mergeGeometries(stones), new THREE.MeshStandardMaterial({ color: 0x67625a, roughness: 0.95, flatShading: true })); st.castShadow = true; rbYaw.add(st);
  }
  { // redwood-ish conifers clustered along the back and left edge
    const spots = [[-3.0, -1.2, 1.9], [-2.4, -1.85, 2.3], [-1.6, -2.15, 1.7], [-0.6, -2.3, 2.5], [0.5, -2.35, 2.0], [1.4, -2.15, 2.4], [2.3, -1.75, 1.8], [-3.15, 0.15, 1.5], [-2.7, -0.6, 2.1], [3.05, -0.9, 1.6], [-1.1, -1.6, 1.4], [1.0, -1.55, 1.3], [-2.0, -1.2, 1.2], [0.0, -1.8, 1.1]];
    spots.forEach(([x, z, h], i) => { const t = makeConifer(h * 1.05, 31 + i * 7, (i % 3) * 0.012); t.position.set(x, top, z); t.rotation.y = i; rbYaw.add(t); });
  }
  { // dirt singletrack winding across the front, with a darker worn centre line
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(-3.2 + 6.0 * u, 0, 1.55 + 0.45 * Math.sin(u * 7.5))); }
    const c = new THREE.CatmullRomCurve3(pts);
    for (const [w, col, dy] of [[0.17, 0x7a5b3c, 0.012], [0.07, 0x5e4430, 0.016]]) { const tg = new THREE.TubeGeometry(c, 160, w, 8); tg.scale(1, 0.04, 1);
      const trail = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: col, roughness: 1 })); trail.position.y = top + dy; trail.receiveShadow = true; rbYaw.add(trail); }
  }
  const crag = makeCrag(); crag.position.set(2.4, top - 0.05, 1.2); crag.rotation.y = -0.3; rbYaw.add(crag);
  const bike = makeMTB(); bike.position.set(1.25, top, 2.0); bike.rotation.set(0, -0.5, 0.2); rbYaw.add(bike);
  const planeHold = new THREE.Group(); planeHold.scale.setScalar(0.42); rbAnchor.add(planeHold);
  if (!airCh.el) { scene.remove(air.group); planeAnchor.visible = false; planeHold.add(air.plane.group); Object.values(forces).forEach((f) => { f.a.visible = false; placeLabel(f.label, null, 0); }); }
  return { track, train, planeHold, creekTex, floor };
})();
function updateRb(ch, p, dt) {
  panelFx(ch.panels, p);
  if (!PAGE_COASTER) {
    rb.group.visible = false;
    const vis = p > -0.35 && p < SLIDE.ex[1] + 0.02; rbAnchor.visible = vis; if (!vis) return null;
    const desk = !S.mobile;
    const sc = Math.min((S.visW * (desk ? 0.52 : 0.94)) / 7.6, (S.visH * (desk ? 0.66 : 0.42)) / 4.4);
    rbAnchor.scale.setScalar(sc);
    rbAnchor.position.set(desk ? S.visW * 0.14 : 0, (desk ? -0.1 : S.visH * 0.17) + slideY(p), 0);
    spot.floor.material.opacity = 1 - io(range(p, SLIDE.ex[0], SLIDE.ex[0] + 0.06));
    rbAnchor.rotation.set(0.2 + S.my * 0.04, 0, 0);
    rbYaw.rotation.y = lerp(-0.85, 0.45, clamp(p, -0.2, 1.1)) + S.mx * 0.14;
    // passive: the train creeps a touch forward and back on its brakes, like it's waiting in the station
    const T = spot.track, mid = T.length / 2 + spot.train.spacing;
    placeTrain(spot.train, T, mid + 0.06 * Math.sin(S.t * 0.7));
    if (spot.creekTex) spot.creekTex.offset.x -= dt * 0.12; // water drifts downstream
    // the Cessna circles the island, banked into the turn, prop turning
    const pl = air.plane, hold = spot.planeHold;
    pl.group.position.set(0, 0, 0); pl.group.rotation.set(0, 0, 0);
    const ang = S.t * 0.32, rad = 3.3;
    hold.position.set(Math.cos(ang) * rad, 1.9 + 0.12 * Math.sin(S.t * 0.9), Math.sin(ang) * rad * 0.62 - 0.3);
    hold.rotation.order = 'YXZ'; hold.rotation.set(0.5 + 0.05 * Math.sin(S.t * 0.7), -ang - Math.PI / 2, 0.06); // nose along the orbit; +roll drops the inside (right) wing toward the island, nose a touch up
    pl.prop.rotation.x += dt * 60; MAT.blur.opacity = 0.12; pl.setFlaps(0);
    return null;
  }
  rbAnchor.visible = false;
  const vis = p > -0.16 && p < 1.2; rb.group.visible = vis; if (!vis) { camRb.init = false; return null; }
  const q = range(p, 0.04, 0.97); const s = rbTime(q);
  placeTrain(rbTrain, rbTrack, s);
  const f = rbTrain.cars[1].position;
  const desk = !S.mobile;
  const pos = new THREE.Vector3(f.x - (desk ? 12 : 6), Math.max(20, f.y * 0.55 + 15), f.z + (desk ? 32 : 38));
  const ent = 1 - out(range(p, -0.16, 0.06)); pos.y += ent * 14; pos.x -= ent * 10;
  const tgt = new THREE.Vector3(f.x + (desk ? -5.5 : 0), f.y - 1.5, f.z);
  if (!camRb.init) { camRb.p.lerp(pos, 1 - Math.exp(-9 * dt)); camRb.t.lerp(tgt, 1 - Math.exp(-11 * dt)); camRb.init = true; }
  camRb.p.lerp(pos, 1 - Math.exp(-9 * dt)); camRb.t.lerp(tgt, 1 - Math.exp(-11 * dt));
  return { pos: camRb.p, target: camRb.t, focus: f };
}

// ============================================================
// PAGE COASTER (experiment): one RailBlazer track runs down the whole page behind the content, the train keeps
// pace with your scroll, then the track levels into a display run where the products sit for the Great America section.
// ============================================================
const PAGE_COASTER = false, SIDE_DESCENT = false; // false = Great America is a studio spotlight
const pageCo = { group: new THREE.Group(), track: null, train: null, K: 0.45, built: '' };
pageCo.group.scale.setScalar(pageCo.K); scene.add(pageCo.group);
function buildPageCoaster() {
  if (!PAGE_COASTER) return;
  const andu = chapters[0], rbc = chapters.find((c) => c.id === 'railblazer');
  if (!andu || !rbc || !andu.len) return;
  const key = [S.w, S.h, andu.top, rbc.top].join('|'); if (pageCo.built === key) return; pageCo.built = key;
  if (pageCo.track) { pageCo.group.remove(pageCo.track.mesh); pageCo.track.mesh.geometry.dispose(); }
  const nar = S.mobile || S.w < 900;
  pageCo.K = nar ? 0.18 : 0.32; pageCo.group.scale.setScalar(pageCo.K); pageCo.nar = nar;
  const K = pageCo.K, W = S.visW, Hh = S.visH, yw = (Y) => (-Y / S.h) * Hh;
  // the ride hugs the right gutter so it never crosses the products; narrow screens get a tighter, flatter line
  // the descent sits deep in the scene (small, behind the products) and only swoops forward for the finale
  const xR = W * (nar ? 0.47 : 0.44), amp = W * (nar ? 0.01 : 0.02), zc = nar ? -4 : -6, za = nar ? 0.6 : 1.0;
  const dz = (z) => (12 - z) / 12; // keeps a deep point at the same screen x
  const Ys = andu.top - 0.55 * S.h, Ye = rbc.top, xd = S.mobile ? 0 : W * 0.14;
  const pts = [];
  let j = 0;
  // the side-of-page descent is off: the coaster only appears for the Great America finale, dropping in from the top right
  pts.push(new THREE.Vector3(0.62 * W * dz(-2.5), yw(Ye - 1.25 * S.h), -2.5), new THREE.Vector3(0.5 * W * dz(-2.5), yw(Ye - 0.95 * S.h), -2.5));
  for (let Y = Ys; SIDE_DESCENT && Y < Ye - 1.0 * S.h; Y += 0.32 * S.h, j++) {
    const z = zc - za * Math.cos(j * 0.8);
    pts.push(new THREE.Vector3((xR - amp * (1 + Math.sin(j * 1.1))) * dz(z), yw(Y), z));
  }
  pageCo.iApproach = pts.length - 1;
  // approach: drop below the display height, then swoop up and level out heading left across the product position
  const yd = yw(Ye);
  // display run: level out, a heartline roll, then a flat finish long enough that the whole train ends upright on screen
  // the roll gets all the width the finish doesn't need, so it reads big next to the small train
  const tw = 6 * 0.96 * K, xE = nar ? xd - 0.38 * W : -0.17 * W, xR1 = xE + tw + 0.15;
  const rl = Math.max(nar ? 1.0 : 1.8, 0.43 * W * dz(1) - 0.35 - xR1), xR0 = xR1 + rl;
  // RailBlazer-style zero-g (heartline) roll: riders' chests follow a smooth rise; the rail corkscrews around them,
  // so at the crest they hang upside down under the rail.
  const hW = 0.85 * K, A = Math.min(rl * 0.12, nar ? 0.2 : 0.4), ga = (f) => 2 * Math.PI * (f - 0.5 * Math.sin(2 * Math.PI * f) / (2 * Math.PI));
  const fOf = (x) => clamp((x - xR0) / (xR1 - xR0));
  pts.push(new THREE.Vector3((xR - 0.02 * W) * dz(-2.5), yw(Ye - 0.55 * S.h), -2.5));
  pts.push(new THREE.Vector3(xR0 + 1.6, yd - 1.3, 0.2));
  pts.push(new THREE.Vector3(xR0 + 0.8, yd - 0.12, 0.8));
  pageCo.iDisplay = pts.length;
  const iR0 = pts.length;
  const _t = new THREE.Vector3(), _n = new THREE.Vector3();
  for (let k = 0; k <= 28; k++) {
    const f = k / 28, H = new THREE.Vector3(xR0 + (xR1 - xR0) * f, yd + A * Math.sin(Math.PI * f), 1.0);
    _t.set(xR1 - xR0, A * Math.PI * Math.cos(Math.PI * f), 0).normalize();
    _n.set(0, 1, 0).addScaledVector(_t, -_t.y).normalize().applyAxisAngle(_t, ga(f));
    pts.push(H.addScaledVector(_n, -hW));
  }
  const iR1 = pts.length - 1;
  pts.push(new THREE.Vector3((xR1 + xE) / 2, yd, 1.0), new THREE.Vector3(xE, yd, 1.0), new THREE.Vector3(xE - 0.4, yd, 1.0));
  const curve = new THREE.CatmullRomCurve3(pts.map((v) => v.clone().divideScalar(K)), false, 'centripetal');
  const n = pts.length - 1, D = 40, L = curve.getLengths(n * D), tot = L[L.length - 1];
  pageCo.uApproach = L[pageCo.iApproach * D] / tot; pageCo.uDisplay = L[pageCo.iDisplay * D] / tot;
  const uR0 = L[iR0 * D] / tot, uR1 = L[iR1 * D] / tot;
  pageCo.sEnd = L[(pts.length - 2) * D];  // train front stops at xE
  const wob = (u) => 0.35 * Math.sin(u * 40) * (1 - io(range(u, pageCo.uApproach - 0.03, pageCo.uApproach)));
  pageCo.track = buildTrack(curve, { samples: Math.max(1200, Math.round(tot * 5)), bank: (u) => (u < pageCo.uApproach ? wob(u) : 0),
    upSpan: { u0: uR0, u1: uR1, deg: (p) => THREE.MathUtils.radToDeg(ga(fOf(p.x * K))) } });
  pageCo.group.add(pageCo.track.mesh);
  if (!pageCo.train) { pageCo.train = makeTrain(6, { riders: true }); pageCo.group.add(pageCo.train.group); if (pageCo.rbCar) upgradeTrain(pageCo.train, pageCo.rbCar); }
  pageCo.trainLen = 6 * pageCo.train.spacing;
}
function updatePageCoaster(dt) {
  const rbc = chapters.find((c) => c.id === 'railblazer'), andu = chapters[0];
  if (!PAGE_COASTER || !rbc || !pageCo.track) { pageCo.group.visible = false; return; }
  const pRB = rbc.p ?? -9, Hh = S.visH, K = pageCo.K, T = pageCo.track;
  const exit = io(range(pRB, 0.93, 1.1));
  pageCo.group.visible = S.scroll > (SIDE_DESCENT ? andu.top - 1.3 * S.h : rbc.top - 1.0 * S.h) && pRB < 1.12;
  if (!pageCo.group.visible) return;
  pageCo.group.position.y = (Math.min(S.scroll, rbc.top) / S.h) * Hh + exit * Hh * 1.15;
  const sA = pageCo.uApproach * T.length, sD = pageCo.uDisplay * T.length, sEnd = pageCo.sEnd ?? T.length - 0.3;
  let s;
  if (S.scroll < rbc.top - 0.5 * S.h) {
    // ride down the page: keep the train front at ~1/4 from the top of the screen
    const target = ((pageCo.nar ? 0.12 : 0.22) * Hh - pageCo.group.position.y) / K; let lo = 0, hi = Math.round(pageCo.uApproach * (T.N - 1));
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.P[m].y > target) lo = m; else hi = m; }
    s = Math.max(pageCo.trainLen, (lo / (T.N - 1)) * T.length);
  } else if (pRB < 0.02) {
    const f = io(range(S.scroll, rbc.top - 0.5 * S.h, rbc.top + 0.02 * (rbc.len - S.h)));
    const s0 = Math.min(sA, Math.max(pageCo.trainLen, sA)); s = lerp(s0, sD + pageCo.trainLen, f);
  } else s = lerp(sD + pageCo.trainLen, sEnd, io(range(pRB, 0.02, 0.9)));
  pageCo.sm = pageCo.sm == null ? s : damp(pageCo.sm, s, 10, dt);
  placeTrain(pageCo.train, T, pageCo.sm);
}

// ============================================================
// LOOP
// ============================================================
const railItems = [...document.querySelectorAll('.rail li')], railFill = document.getElementById('railfill'), railEl = document.querySelector('.rail');
const contactEl = document.getElementById('contact');
function metrics() { chapters.forEach((c) => { c.top = c.el.offsetTop; c.len = c.el.offsetHeight; }); }
const prog = (c) => (S.scroll - c.top) / Math.max(1, c.len - S.h);

const QUAL = { lvl: PHONE ? 1 : 0, ema: 1 / 60, slow: 0, fast: 0, upAt: -99, noUp: false };
function applyQuality() {
  const pr = QUAL.lvl >= 2 ? 1 : DPR;
  if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); composer.setPixelRatio(pr); onResize(); }
  document.documentElement.dataset.quality = QUAL.lvl;
}
function onResize() {
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); gtao.setSize(innerWidth / 2, innerHeight / 2); bloom.resolution.set(innerWidth, innerHeight).multiplyScalar(0.5); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  computeVis(); layoutHero(); metrics(); buildPageCoaster(); measureSafe();
}
// phones fire resize every time the address bar slides in or out while scrolling; rebuilding the render targets then
// stalls the scroll. Ignore height-only changes there (the fixed canvas just stretches a few pixels); rotate still resizes.
let lastW = innerWidth, lastH = innerHeight;
addEventListener('resize', () => {
  if (PHONE && innerWidth === lastW && Math.abs(innerHeight - lastH) < 0.25 * lastH) return;
  lastW = innerWidth; lastH = innerHeight; onResize();
});
// left edge part labels may reach: the text column's right edge on desktop layouts (labels never sit on the copy), else the screen edge
function measureSafe() { const pn = document.querySelector('.panel'); S.safeL = (!S.mobile && pn) ? pn.offsetLeft + pn.offsetWidth + 16 : 16; }
measureSafe();

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const lenis = new Lenis({ lerp: REDUCED ? 1 : 0.085, wheelMultiplier: 0.95, smoothWheel: !REDUCED });
window.__lenis = lenis;
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const t = document.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault(); lenis.scrollTo(t.id === 'hero' ? 0 : t.offsetTop + innerHeight * 0.05, REDUCED ? { immediate: true } : { duration: 2.2 }); if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); })); // keyboard/screen-reader focus follows the jump

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const dtm = dt * (REDUCED ? 0.25 : 1); S.t += dtm; // reduced motion: passive animation (props, fans, orbits, water, blinks) runs at a quarter speed
  lenis.raf(now); S.scroll = lenis.scroll ?? scrollY;
  S.mx = damp(S.mx, S.tmx, 3, dt); S.my = damp(S.my, S.tmy, 3, dt);
  if (S.started) S.intro = Math.min(1, S.intro + dt / 1.8);
  updateHero(dt);
  placeLabel(zoomLbl, null, 0);
  let cam = null;
  for (const c of chapters) {
    const p = prog(c); c.p = p;
    if (c.kind === 'td') updateTeardown(c, p, dtm);
    else if (c.kind === 'air') cam = updateAir(c, p, dt) || cam;
    else if (c.kind === 'rb') cam = updateRb(c, p, dtm) || cam;
  }
  updatePageCoaster(dt);
  // adaptive quality: if frames run slow (~<45fps) for a while, drop ambient occlusion, then render at 1x pixel
  // ratio; climb back once frames are comfortably fast again. Keeps scroll smooth on weaker laptops and phones.
  if (S.t > 4 && document.visibilityState === 'visible') QUAL.ema = QUAL.ema * 0.94 + dt * 0.06; // ignore load-time stutter
  if (QUAL.ema > 1 / 50) { QUAL.slow += dt; QUAL.fast = 0; } else if (QUAL.ema < 1 / 57) { QUAL.fast += dt; QUAL.slow = 0; } else { QUAL.slow = QUAL.fast = 0; }
  if (QUAL.slow > 1 && QUAL.lvl < 2) { if (S.t - QUAL.upAt < 10) QUAL.noUp = true; QUAL.lvl++; QUAL.slow = 0; applyQuality(); } // stepping up made it slow -> stay down
  if (QUAL.fast > 6 && QUAL.lvl > 0 && !QUAL.noUp) { QUAL.lvl--; QUAL.fast = 0; QUAL.upAt = S.t; applyQuality(); }
  const outdoor = !!cam; gtao.enabled = !outdoor && QUAL.lvl === 0;
  scene.environment = outdoor && ENV.night ? ENV.night : ENV.studio;
  if (outdoor && ENV.nightBg) { scene.background = ENV.nightBg; scene.backgroundIntensity = 0.07; scene.backgroundBlurriness = 0.2; scene.fog.color.set(0x0e1420); scene.fog.near = 70; scene.fog.far = 260; }
  else { scene.background = BGC; scene.fog.color.set(BG); scene.fog.near = 45; scene.fog.far = 150; }
  if (cam) { camera.position.copy(cam.pos); camera.lookAt(cam.target); key.target.position.copy(cam.focus); key.position.copy(cam.focus).add(_v.set(8, 16, 10)); }
  else { camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0); key.target.position.set(0, -1, 0); key.position.set(4, 14, 7); }
  // progress rail
  const first = chapters[0], lastC = chapters[chapters.length - 1];
  const tot = range(S.scroll, first.top - S.h * 0.5, lastC.top + lastC.len - S.h);
  railFill.style.height = (tot * 100).toFixed(2) + '%';
  railEl.classList.toggle('on', S.scroll > S.h * 0.6 && S.scroll < contactEl.offsetTop - S.h * 0.4);
  railItems.forEach((li) => { const c = chapters.find((x) => x.id === li.dataset.for); li.classList.toggle('on', c && c.p > -0.1 && c.p < 1.05); });
  const blink = (S.t % 1.6) < 0.08 ? 6 : 0.15;
  
  composer.render();
  requestAnimationFrame(frame);
}

(async function start() {
  const t0 = performance.now();
  const gl = new GLTFLoader(); const draco = new DRACOLoader(); draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/gltf/'); gl.setDRACOLoader(draco);
  let got = 0; const bump = () => setLoad(0.25 + 0.6 * (++got / 6));   // smooth progress: letters + lighting + four models
  const ASSET_V = '20261118p'; // bump with the ?v= in index.html when models change
  const loadGLB = (u) => new Promise((res) => gl.load(u + '?v=' + ASSET_V, (g) => { bump(); res(g.scene); }, undefined, (e) => { console.warn('GLB failed', u, e); bump(); res(null); }));
  const [, , g3, cessna, rbCar, lockPro] = await Promise.all([buildLetters().then(bump), hdrReady.then(bump), Promise.resolve(null),loadGLB('assets/cessna152.glb'), loadGLB('assets/railblazer_car.glb'), loadGLB('assets/level_lock_pro.glb')]); setLoad(0.9);
  if (lockPro) { upgradeLock(cLock, lockPro); const hl = upgradeLock(hLock, lockPro); if (hl.faceplate) hl.faceplate.visible = false; }
  if (rbCar) { upgradeTrain(rbTrain, rbCar); if (hTrain) upgradeTrain(hTrain, rbCar); pageCo.rbCar = rbCar; upgradeTrain(spot.train, rbCar); if (pageCo.train) upgradeTrain(pageCo.train, rbCar); }
  [hTrain, spot.train].forEach((t) => t && t.cars.forEach((c) => mergeStatic(c, [], []))); // each car moves as one unit: bake its static meshes per material
  
  if (cessna) { upgradePlane(air.plane, cessna); upgradePlane(hPlane, cessna); }
  onResize();
  // warm up shaders with everything visible
  [hero.group, air.group, rb.group, ...chapters.filter((c) => c.anchor).map((c) => c.anchor)].forEach((g) => (g.visible = true));
  { // compile every chapter's shaders up front (three only compiles what's visible), so no scene stalls on first appearance
    const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    renderer.compile(scene, camera);
    const seen = new Set(); scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k in m) { const t = m[k]; if (t && t.isTexture && !seen.has(t)) { seen.add(t); renderer.initTexture(t); } } }); // upload textures now, not on first draw
    hidden.forEach((o) => (o.visible = false));
  }
  setLoad(1); window.__loadMs = performance.now() - t0;
  requestAnimationFrame((t) => { last = t; frame(t); });
  const reveal = () => { if (S.started) return; document.documentElement.classList.remove('no-3d'); document.getElementById('loader').classList.add('done'); document.body.classList.add('ready'); S.started = true; };
  requestAnimationFrame(() => requestAnimationFrame(reveal)); setTimeout(reveal, 600);
})();
