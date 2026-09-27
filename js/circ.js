// CirculationClear's shared models: a ghosted, clearly stylised human figure with the whole
// vascular tree inside it (aorta and its big branches, venae cavae and their tributaries, the
// pulmonary arteries and veins, the portal vein, capillary beds in each organ, and faint lymph
// vessels with a few nodes), plus the physiology numbers the chapters share.
//
// Orientation: we face the person (anterior view), as in an anatomy atlas, so their RIGHT is on
// YOUR LEFT. Axes: +x = the person's left, +y = up, +z = forwards (towards you). One model unit is
// 10 cm, so the figure is about 1.75 m tall with the feet on the floor (y = 0).
// Placement follows standard anatomy (Gray's Anatomy, 42nd ed.; NHLBI "How the Heart Works";
// Britannica "Human cardiovascular system"):
//  - the heart sits behind the breastbone, two thirds of it to the person's left;
//  - the aorta rises, arches back and to the left over the heart (giving off the brachiocephalic
//    trunk, left common carotid and left subclavian arteries) and runs down in front of the spine,
//    giving the coeliac, mesenteric and renal arteries, then splits into the iliac arteries at about
//    navel height (L4);
//  - the superior and inferior venae cavae lie to the person's RIGHT of the aorta and enter the
//    right atrium; the jugular veins run beside the carotids; the portal vein takes blood from the
//    gut to the liver before it returns through the hepatic veins;
//  - the pulmonary trunk leaves the right ventricle and splits into left and right pulmonary
//    arteries; four pulmonary veins return to the left atrium;
//  - the thoracic duct carries lymph up in front of the spine and empties into the veins where the
//    left jugular and subclavian veins meet.
// Vessel thicknesses are exaggerated so they can be seen; lengths and positions are to scale.
import { THREE, M, clamp, lerp, smooth } from './kit.js';

export const RED = 0xff3b4a, BLUE = 0x4f7bff, PURPLE = 0xb06cff, LYMPH = 0x6ee7a8, PORTAL = 0x7d6bff;

// ---------------------------------------------------------------- shared physiology numbers
// Guyton & Hall, Textbook of Medical Physiology, 14th ed. (2021), ch. 14, 17, 20, 41:
//  - blood volume about 5 L in an adult (7% of body weight); resting cardiac output about 5 L/min,
//    so one lap takes about a minute on average;
//  - where the blood sits (ch. 14): 84% in the systemic circulation (64% veins, 13% arteries,
//    7% arterioles and capillaries), 9% in the lungs, 7% in the heart;
//  - O2: arterial haemoglobin about 97–98% saturated, mixed venous about 75% at rest; the body uses
//    about 250 mL O2/min at rest; 1 g of haemoglobin carries 1.34 mL O2, about 15 g/dL in blood;
//  - resting blood flow to organs (table 17-1, total 5,000 mL/min): brain 700, heart 200,
//    kidneys 1,100, liver and gut 1,350, muscle 750, skin 300, bone 250, other 350.
// Heavy exercise (Chapman & Mitchell, "The pumping heart and circulation", Scientific American,
// May 1965, reproduced in most physiology texts): cardiac output about 25 L/min in a fit athlete
// with muscle about 22 L, heart 1.0, skin 0.6, brain 0.75, kidneys 0.25, gut 0.3, other 0.1.
export const REF = {
  bloodL: 5, coRest: 5, coMax: 25, sao2: 98, svo2Rest: 75, hb: 15, vo2Rest: 250, vo2Max: 4000,
  hrRest: 70, hrMax: 185,
  share: { heart: 0.07, lungs: 0.09, arteries: 0.13, beds: 0.07, veins: 0.64 },
};
// [key, name, rest mL/min, heavy exercise mL/min, colour]
export const ORGANS = [
  ['muscle', 'Muscles', 750, 22000, '#ff8a5c'],
  ['gut', 'Gut and liver', 1350, 300, '#e8b04a'],
  ['kidney', 'Kidneys', 1100, 250, '#ff9fc0'],
  ['brain', 'Brain', 700, 750, '#c9a7ff'],
  ['skin', 'Skin', 300, 600, '#ffd9b0'],
  ['heart', 'Heart muscle', 200, 1000, '#ff5b6b'],
  ['other', 'Bone and the rest', 600, 100, '#9aa3b5'],
];
export const organFlows = (k) => ORGANS.map(([key, name, a, b, col]) => ({ key, name, col, mL: lerp(a, b, smooth(k)) }));
export const cardiacOutput = (k) => organFlows(k).reduce((s, o) => s + o.mL, 0) / 1000;
export const heartRate = (k) => Math.round(lerp(REF.hrRest, REF.hrMax, k));
export const vo2 = (k) => lerp(REF.vo2Rest, REF.vo2Max, k);
// Fick's principle: venous O2 content = arterial content − VO2 / cardiac output.
export function mixedVenousSat(k) {
  const cap = 1.34 * REF.hb * 10;                    // mL O2 per litre when fully saturated (≈ 201)
  const ca = cap * REF.sao2 / 100;
  const cv = ca - vo2(k) / cardiacOutput(k);
  return clamp(cv / cap, 0.1, 0.98);
}
// Venous O2 saturation leaving each organ at rest, from the arteriovenous O2 differences in
// Ganong's Review of Medical Physiology (table "Resting blood flow and O2 consumption of various
// organs", after Wade & Bishop): kidney 1.4 mL/dL, brain 6.2, skin 1.0, resting muscle 6.0,
// splanchnic 3.4, heart 11.4, with arterial content about 19.7 mL/dL. Hard-working muscle can
// take nearly all of it: femoral venous saturation falls to about 10–20% at peak exercise.
export const VENOUS_SAT = { kidney: 0.91, brain: 0.67, skin: 0.93, muscle: 0.68, gut: 0.81, arm: 0.8, lungs: 0.98 };
export function organVenousSat(key, k) {
  if (key === 'muscle') return lerp(VENOUS_SAT.muscle, 0.18, smooth(k));
  if (key === 'arm') return lerp(VENOUS_SAT.arm, 0.55, smooth(k));
  if (key === 'gut') return lerp(VENOUS_SAT.gut, 0.55, smooth(k));      // less flow, same need: more taken
  if (key === 'kidney') return lerp(VENOUS_SAT.kidney, 0.75, smooth(k));
  return VENOUS_SAT[key] ?? 0.75;
}

// ---------------------------------------------------------------- colours and label helpers
const TINT = { red: '#ff8a8a', blue: '#9db4ff', side: '#8ef0ff', gold: '#ffd166', good: '#6ee7a8', purple: '#c9a7ff', pink: '#ff9fc0', lymph: '#6ee7a8' };
export function tint(l, cls) { const c = TINT[cls]; if (c) { l.element.style.borderColor = c; l.element.style.color = c; } return l; }
export function sideLabels(stage, parent, y, x, z = 1.2) {
  return [tint(stage.label("← Their right", [-x, y, z], parent), 'side'), tint(stage.label('Their left →', [x, y, z], parent), 'side')];
}
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage the readout covers the upper left: re-centre once, unless orbited.
export function fitNarrow(stage, view) {
  let done = false;
  return () => {
    const narrow = stage.host.clientWidth < 560;
    if (narrow && !done && !stage.moved && !inReel()) { stage.setView(view.pos, view.target, 0.01); done = true; }
    return narrow;
  };
}
// On phones keep only the readout's headline and two rows.
export function compactReadout(stage, api) {
  const full = api.readout;
  if (!full) return api;
  api.readout = (s) => {
    const html = full(s);
    if (stage.host.clientWidth >= 560 || !html) return html;
    let rows = 0;
    return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++rows <= 2 ? m : ''));
  };
  return api;
}
// A flat board carrying a canvas chart.
export function board(ct, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
}
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Blood colour from O2 saturation: textbook blue when it has given its oxygen away, red when full.
const cRed = new THREE.Color(RED), cBlue = new THREE.Color(BLUE);
export function satColor(sat, out = new THREE.Color()) {
  const k = clamp((sat - 0.7) / (0.98 - 0.7), 0, 1);
  out.copy(cBlue).lerp(cRed, k);
  if (sat < 0.7) out.multiplyScalar(0.45 + 0.55 * (sat / 0.7));
  return out;
}

// ---------------------------------------------------------------- geometry helpers
const V = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p));
// A polyline sampled by arc length, so things travel along it at a steady speed.
export function pathOf(points) {
  const Pt = points.map(V);
  const L = [0];
  for (let i = 1; i < Pt.length; i++) L.push(L[i - 1] + Pt[i].distanceTo(Pt[i - 1]));
  const total = Math.max(1e-6, L[L.length - 1]);
  return {
    points: Pt, total, lengths: L,
    uAt: (i) => L[i] / total,
    at(u, out = new THREE.Vector3()) {
      const d = clamp(u, 0, 1) * total;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
      const k = (d - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
      return out.copy(Pt[lo]).lerp(Pt[hi], k);
    },
  };
}
export const smoothPts = (pts, n = 60) => new THREE.CatmullRomCurve3(pts.map(V), false, 'centripetal').getPoints(n);
// A tube whose colour runs from c0 at the start to c1 at the end (vertex colours).
export function gradientTube(pts, r, c0, c1, opacity = 1, seg = 60) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V), false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, seg, r, 8, false);
  const n = g.attributes.position.count, col = new Float32Array(n * 3), a = new THREE.Color(c0), b = new THREE.Color(c1), c = new THREE.Color();
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= 8; j++) { c.copy(a).lerp(b, i / seg); const k = (i * 9 + j) * 3; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, emissive: 0x220011, emissiveIntensity: 0.3 }));
}
// A capsule between two points.
export function capsule(a, b, r, mat) {
  const A = V(a), B = V(b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
export function blob(r, pos, mat, seg = 32) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), mat);
  m.scale.set(...r); m.position.set(...pos);
  return m;
}
// A pseudo-random wiggle from a to b passing near c: one capillary of a bed.
export function wiggle(a, c, b, spread, seed, n = 7) {
  a = V(a); b = V(b); c = V(c);
  const pts = [a];
  for (let i = 1; i < n; i++) {
    const k = i / n, base = k < 0.5 ? a.clone().lerp(c, k * 2) : c.clone().lerp(b, (k - 0.5) * 2);
    const env = Math.sin(k * Math.PI);
    pts.push(base.add(new THREE.Vector3((rnd(i + seed * 7) - 0.5) * spread * env * 2, (rnd(i + 20 + seed * 7) - 0.5) * spread * env * 2, (rnd(i + 40 + seed * 7) - 0.5) * spread * env)));
  }
  pts.push(b);
  return pts;
}
// A red blood cell: a biconcave disc about 7.8 µm across, 2.5 µm thick at the rim and about 1 µm
// in the middle (Evans & Fung, Microvasc Res 4:335, 1972). `d` is its diameter in model units.
export function rbcGeometry(d = 1, N = 24, radial = 36) {
  const R = d / 2, pts = [];
  const h = (x) => { const r = clamp(x / R, 0, 1), r2 = r * r; return R * Math.sqrt(Math.max(0, 1 - r2)) * (0.0518 + 2.0026 * r2 - 1.1229 * r2 * r2) * 0.5; };
  for (let i = 0; i <= N; i++) { const x = R * Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(x, h(x) + 0.0001)); }
  for (let i = N; i >= 0; i--) { const x = R * Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(x, -h(x) - 0.0001)); }
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(0.0001, p.x), p.y)), radial);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- the vascular tree
// Each vessel: its type, a visual radius, its parent and the index of the parent's point where it
// branches off, and its centre line from the heart end outwards. Veins are also drawn from the
// heart end outwards; their blood flows the other way.
const T = {
  // --- arteries (oxygen-rich, away from the heart)
  aorta: { type: 'a', r: 0.13, pts: [[0.2, 12.9, 0.38], [0.12, 13.5, 0.32], [0.08, 14.0, 0.15], [0.3, 14.14, -0.05], [0.47, 14.0, -0.22], [0.47, 13.5, -0.45], [0.36, 12.5, -0.52], [0.26, 11.5, -0.48], [0.22, 10.95, -0.46], [0.12, 10.0, -0.36], [0.05, 9.3, -0.22]] },
  brachio: { type: 'a', r: 0.08, parent: 'aorta', at: 2, pts: [[0.08, 14.0, 0.15], [-0.35, 14.5, 0.16]] },
  rCarotid: { type: 'a', r: 0.06, parent: 'brachio', at: 1, pts: [[-0.35, 14.5, 0.16], [-0.36, 15.2, 0.22], [-0.42, 15.85, 0.26], [-0.3, 16.35, 0.12]] },
  rArmA: { type: 'a', r: 0.055, parent: 'brachio', at: 1, pts: [[-0.35, 14.5, 0.16], [-1.2, 14.55, 0.1], [-1.85, 14.25, 0.06], [-2.05, 13.0, 0.12], [-2.2, 11.8, 0.16], [-2.35, 10.5, 0.16], [-2.45, 9.35, 0.12]] },
  lCarotid: { type: 'a', r: 0.06, parent: 'aorta', at: 3, pts: [[0.3, 14.14, -0.05], [0.36, 15.2, 0.2], [0.42, 15.85, 0.26], [0.3, 16.35, 0.12]] },
  lArmA: { type: 'a', r: 0.055, parent: 'aorta', at: 4, pts: [[0.47, 14.0, -0.22], [1.2, 14.55, 0.08], [1.85, 14.25, 0.06], [2.05, 13.0, 0.12], [2.2, 11.8, 0.16], [2.35, 10.5, 0.16], [2.45, 9.35, 0.12]] },
  hepA: { type: 'a', r: 0.04, parent: 'aorta', at: 7, pts: [[0.26, 11.5, -0.48], [-0.2, 11.62, -0.05], [-0.45, 11.85, 0.1]] },
  gutA: { type: 'a', r: 0.055, parent: 'aorta', at: 7, pts: [[0.26, 11.5, -0.48], [0.3, 11.2, 0.0], [0.35, 10.75, 0.3]] },
  renLA: { type: 'a', r: 0.05, parent: 'aorta', at: 8, pts: [[0.22, 10.95, -0.46], [0.72, 10.9, -0.55]] },
  renRA: { type: 'a', r: 0.05, parent: 'aorta', at: 8, pts: [[0.22, 10.95, -0.46], [-0.72, 10.82, -0.56]] },
  lLegA: { type: 'a', r: 0.07, parent: 'aorta', at: 10, pts: [[0.05, 9.3, -0.22], [0.45, 9.0, 0.05], [0.72, 8.3, 0.22], [0.85, 6.5, 0.16], [0.95, 4.8, -0.05], [0.95, 2.8, -0.02], [0.96, 1.1, 0.05]] },
  rLegA: { type: 'a', r: 0.07, parent: 'aorta', at: 10, pts: [[0.05, 9.3, -0.22], [-0.4, 9.0, 0.05], [-0.7, 8.3, 0.22], [-0.85, 6.5, 0.16], [-0.95, 4.8, -0.05], [-0.95, 2.8, -0.02], [-0.96, 1.1, 0.05]] },
  // --- pulmonary arteries (oxygen-poor, but still AWAY from the heart)
  pTrunk: { type: 'pa', r: 0.11, pts: [[0.36, 12.8, 0.66], [0.46, 13.25, 0.5], [0.42, 13.45, 0.22]] },
  lPA: { type: 'pa', r: 0.08, parent: 'pTrunk', at: 2, pts: [[0.42, 13.45, 0.22], [0.8, 13.5, 0.02], [1.02, 13.4, -0.08]] },
  rPA: { type: 'pa', r: 0.08, parent: 'pTrunk', at: 2, pts: [[0.42, 13.45, 0.22], [0.0, 13.48, -0.02], [-0.6, 13.42, -0.1], [-0.98, 13.38, -0.1]] },
  // --- pulmonary veins (oxygen-rich, back TO the heart)
  lPV: { type: 'pv', r: 0.07, pts: [[0.3, 12.68, -0.05], [0.72, 12.82, -0.16], [1.02, 12.95, -0.16]] },
  rPV: { type: 'pv', r: 0.07, pts: [[0.1, 12.62, -0.05], [-0.4, 12.75, -0.16], [-0.98, 12.92, -0.16]] },
  // --- veins (oxygen-poor, back to the heart); drawn from the heart outwards
  svc: { type: 'v', r: 0.12, pts: [[-0.3, 12.9, 0.34], [-0.36, 13.6, 0.26], [-0.4, 14.1, 0.2]] },
  rBrV: { type: 'v', r: 0.09, parent: 'svc', at: 2, pts: [[-0.4, 14.1, 0.2], [-0.62, 14.48, 0.08]] },
  lBrV: { type: 'v', r: 0.09, parent: 'svc', at: 2, pts: [[-0.4, 14.1, 0.2], [0.15, 14.34, 0.28], [0.64, 14.48, 0.08]] },
  rJug: { type: 'v', r: 0.07, parent: 'rBrV', at: 1, pts: [[-0.62, 14.48, 0.08], [-0.64, 15.2, 0.08], [-0.6, 15.9, -0.02], [-0.34, 16.25, -0.24]] },
  lJug: { type: 'v', r: 0.07, parent: 'lBrV', at: 2, pts: [[0.64, 14.48, 0.08], [0.64, 15.2, 0.08], [0.6, 15.9, -0.02], [0.34, 16.25, -0.24]] },
  rArmV: { type: 'v', r: 0.06, parent: 'rBrV', at: 1, pts: [[-0.62, 14.48, 0.08], [-1.25, 14.42, -0.08], [-1.96, 14.2, -0.1], [-2.18, 13.0, -0.06], [-2.33, 11.8, -0.02], [-2.48, 10.5, -0.02], [-2.6, 9.35, -0.04]] },
  lArmV: { type: 'v', r: 0.06, parent: 'lBrV', at: 2, pts: [[0.64, 14.48, 0.08], [1.25, 14.42, -0.08], [1.96, 14.2, -0.1], [2.18, 13.0, -0.06], [2.33, 11.8, -0.02], [2.48, 10.5, -0.02], [2.6, 9.35, -0.04]] },
  ivc: { type: 'v', r: 0.13, pts: [[-0.28, 12.18, 0.22], [-0.36, 11.75, -0.2], [-0.34, 10.85, -0.36], [-0.28, 10.0, -0.36], [-0.2, 9.35, -0.26]] },
  hepV: { type: 'v', r: 0.07, parent: 'ivc', at: 1, pts: [[-0.36, 11.75, -0.2], [-0.62, 11.98, 0.02], [-0.85, 12.0, 0.1]] },
  renLV: { type: 'v', r: 0.055, parent: 'ivc', at: 2, pts: [[-0.34, 10.85, -0.36], [0.2, 10.78, -0.28], [0.72, 10.74, -0.5]] },
  renRV: { type: 'v', r: 0.055, parent: 'ivc', at: 2, pts: [[-0.34, 10.85, -0.36], [-0.72, 10.7, -0.52]] },
  lLegV: { type: 'v', r: 0.08, parent: 'ivc', at: 4, pts: [[-0.2, 9.35, -0.26], [0.32, 8.95, -0.05], [0.6, 8.3, 0.08], [0.78, 6.5, 0.0], [0.88, 4.8, -0.2], [0.9, 2.8, -0.16], [1.06, 1.1, -0.1]] },
  rLegV: { type: 'v', r: 0.08, parent: 'ivc', at: 4, pts: [[-0.2, 9.35, -0.26], [-0.66, 8.95, -0.05], [-0.84, 8.3, 0.08], [-0.94, 6.5, 0.0], [-1.0, 4.8, -0.2], [-1.0, 2.8, -0.16], [-1.08, 1.1, -0.1]] },
  // The great saphenous vein: the long vein just under the skin on the inside of the leg.
  lSaph: { type: 'v', r: 0.035, parent: 'lLegV', at: 1, pts: [[0.32, 8.95, -0.05], [0.45, 8.7, 0.3], [0.62, 6.5, 0.42], [0.66, 4.8, 0.3], [0.75, 2.8, 0.32], [0.8, 1.0, 0.36]] },
  // The portal vein: gut → liver (not straight to the heart).
  portal: { type: 'portal', r: 0.06, pts: [[0.05, 10.5, 0.2], [-0.25, 11.05, 0.12], [-0.5, 11.55, 0.14]] },
};
export const TREE = T;
// Organ positions (centres) and the capillary beds that join arteries to veins.
export const ORG = {
  brain: [0, 16.6, 0.02], lungL: [1.05, 13.15, -0.12], lungR: [-1.05, 13.15, -0.12], liver: [-0.62, 11.85, 0.12], gut: [0.1, 10.15, 0.38],
  kidL: [0.9, 10.85, -0.56], kidR: [-0.9, 10.75, -0.56], handL: [2.55, 8.75, 0.05], handR: [-2.55, 8.75, 0.05], legL: [1.02, 0.55, 0.22], legR: [-1.02, 0.55, 0.22],
};
const end = (n) => V(T[n].pts.at(-1));
export const BEDS = {
  brain: { a: ['rCarotid', 'lCarotid'], v: ['rJug', 'lJug'], c: ORG.brain, spread: 0.55, n: 6 },
  lungL: { a: ['lPA'], v: ['lPV'], c: ORG.lungL, spread: 0.55, n: 6, lung: true },
  lungR: { a: ['rPA'], v: ['rPV'], c: ORG.lungR, spread: 0.55, n: 6, lung: true },
  liver: { a: ['hepA'], v: ['hepV'], c: ORG.liver, spread: 0.45, n: 5, extra: 'portal' },
  gut: { a: ['gutA'], v: [], vEnd: () => V(T.portal.pts[0]), c: ORG.gut, spread: 0.6, n: 6 },
  kidL: { a: ['renLA'], v: ['renLV'], c: ORG.kidL, spread: 0.18, n: 3 },
  kidR: { a: ['renRA'], v: ['renRV'], c: ORG.kidR, spread: 0.18, n: 3 },
  handL: { a: ['lArmA'], v: ['lArmV'], c: ORG.handL, spread: 0.3, n: 4 },
  handR: { a: ['rArmA'], v: ['rArmV'], c: ORG.handR, spread: 0.3, n: 4 },
  legL: { a: ['lLegA'], v: ['lLegV', 'lSaph'], c: ORG.legL, spread: 0.3, n: 4 },
  legR: { a: ['rLegA'], v: ['rLegV'], c: ORG.legR, spread: 0.3, n: 4 },
};
// Points inside the heart: right atrium, right ventricle, left atrium, left ventricle.
export const HEART = { c: [0.25, 12.55, 0.35], ra: [-0.12, 12.58, 0.32], rv: [0.22, 12.36, 0.58], la: [0.22, 12.7, -0.02], lv: [0.5, 12.35, 0.3] };

// Centre line from the heart to the far end of vessel `name`.
export function lineTo(name) {
  const v = T[name];
  const own = v.pts.map(V);
  if (!v.parent) return own;
  return [...lineTo(v.parent).slice(0, pathIndex(v.parent, v.at) + 1), ...own.slice(1)];
}
function pathIndex(name, at) { const v = T[name]; return (v.parent ? pathIndex(v.parent, v.at) : 0) + at; }

// The lymph: vessels from the limbs and gut to the thoracic duct, which empties into the left
// subclavian vein; nodes cluster in the groin, armpits, neck and belly.
const LYMPH_LINES = [
  [[0.05, 10.3, -0.62], [0.1, 11.6, -0.66], [0.2, 13.0, -0.6], [0.35, 13.9, -0.4], [0.55, 14.35, -0.05], [0.64, 14.48, 0.08]],   // thoracic duct
  [[0.85, 0.9, 0.3], [0.8, 3.0, 0.3], [0.7, 5.5, 0.35], [0.55, 8.6, 0.35], [0.3, 9.4, 0.1], [0.05, 10.3, -0.62]],
  [[-0.85, 0.9, 0.3], [-0.8, 3.0, 0.3], [-0.7, 5.5, 0.35], [-0.55, 8.6, 0.35], [-0.3, 9.4, 0.1], [0.05, 10.3, -0.62]],
  [[2.5, 9.2, 0.25], [2.3, 11.0, 0.3], [2.05, 12.8, 0.25], [1.55, 13.7, 0.05], [0.9, 14.3, 0.05], [0.64, 14.48, 0.08]],
  [[-2.5, 9.2, 0.25], [-2.3, 11.0, 0.3], [-2.05, 12.8, 0.25], [-1.55, 13.7, 0.05], [-0.9, 14.3, 0.05], [-0.62, 14.48, 0.08]],
  [[0.1, 10.3, 0.45], [0.08, 10.3, -0.1], [0.05, 10.3, -0.62]],
];
const NODES = [[0.55, 8.75, 0.35], [-0.55, 8.75, 0.35], [1.55, 13.65, 0.05], [-1.55, 13.65, 0.05], [0.5, 15.0, 0.2], [-0.5, 15.0, 0.2], [0.15, 10.35, 0.2], [-0.05, 10.2, 0.15]];

// ---------------------------------------------------------------- the figure
// A calm, clearly stylised figure standing in a relaxed A-pose, built from capsules and lathes.
function makeFigure(mat) {
  const g = new THREE.Group();
  const head = blob([0.78, 1.0, 0.88], [0, 16.45, 0.05], mat); g.add(head);
  g.add(capsule([0, 14.9, -0.02], [0, 15.6, 0.0], 0.38, mat));
  const prof = [[15.1, 0.02], [15.0, 0.55], [14.75, 1.45], [14.35, 1.8], [13.6, 1.72], [12.4, 1.55], [11.3, 1.32], [10.4, 1.35], [9.6, 1.55], [9.0, 1.5], [8.55, 1.05], [8.4, 0.02]];
  const torsoG = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r, y)), 48);
  torsoG.scale(1, 1, 0.6); torsoG.computeVertexNormals();
  g.add(new THREE.Mesh(torsoG, mat));
  for (const sx of [1, -1]) {
    g.add(capsule([sx * 1.85, 14.35, 0], [sx * 2.2, 11.8, 0.05], 0.36, mat));
    g.add(capsule([sx * 2.2, 11.8, 0.05], [sx * 2.45, 9.45, 0.1], 0.29, mat));
    g.add(blob([0.24, 0.48, 0.13], [sx * 2.56, 8.72, 0.08], mat));
    g.add(capsule([sx * 0.78, 9.0, 0], [sx * 0.95, 4.8, 0], 0.6, mat));
    g.add(capsule([sx * 0.95, 4.8, 0], [sx * 0.97, 0.75, -0.05], 0.44, mat));
    g.add(blob([0.34, 0.2, 0.62], [sx * 1.0, 0.24, 0.35], mat));
  }
  return g;
}

// Build the whole body. Options: labels, flow (moving blood), lymph, beds.
export function makeBody(stage, opts = {}) {
  const o = { labels: true, flow: true, lymph: true, ...opts };
  const root = new THREE.Group();
  const G = {}; ['skin', 'organs', 'heart', 'art', 'vein', 'beds', 'lymph'].forEach((k) => { G[k] = new THREE.Group(); root.add(G[k]); });

  // ---- skin
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a47e, transparent: true, opacity: 0.12, roughness: 0.65, depthWrite: false, side: THREE.DoubleSide });
  G.skin.add(makeFigure(skinMat));

  // ---- organs, ghosted
  const om = (c, op = 0.2) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: op, roughness: 0.6, depthWrite: false });
  const organ = {};
  organ.brain = blob([0.68, 0.5, 0.78], ORG.brain, om(0xf2b8c6, 0.22));
  organ.lungL = blob([0.66, 1.1, 0.62], ORG.lungL, om(0xf2a7b6, 0.16));
  organ.lungR = blob([0.72, 1.12, 0.64], ORG.lungR, om(0xf2a7b6, 0.16));
  organ.liver = blob([0.98, 0.42, 0.62], ORG.liver, om(0x8a3a2e, 0.26)); organ.liver.rotation.z = -0.18;
  organ.gut = blob([0.95, 0.72, 0.42], ORG.gut, om(0xe8b07a, 0.18));
  organ.kidL = blob([0.24, 0.44, 0.2], ORG.kidL, om(0xa34a3c, 0.4));
  organ.kidR = blob([0.24, 0.44, 0.2], ORG.kidR, om(0xa34a3c, 0.4));
  Object.values(organ).forEach((m) => G.organs.add(m));

  // ---- the heart (highlighted; links to HeartClear)
  const heartMat = new THREE.MeshPhysicalMaterial({ color: 0xc23a48, roughness: 0.4, clearcoat: 0.6, emissive: 0x551018, emissiveIntensity: 0.6 });
  const heart = blob([0.42, 0.58, 0.38], HEART.c, heartMat, 40); heart.rotation.z = 0.7; heart.rotation.x = -0.3;
  G.heart.add(heart);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), new THREE.MeshBasicMaterial({ color: 0xff6b9a, transparent: true, opacity: 0.12, depthWrite: false }));
  halo.position.set(...HEART.c); G.heart.add(halo);

  // ---- vessels
  const vm = (c, op = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0, emissive: c, emissiveIntensity: 0.25, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
  const mats = { a: vm(RED), pa: vm(BLUE), pv: vm(RED), v: vm(BLUE), portal: vm(PORTAL) };
  const vesselMesh = {};
  const flowLines = [];
  for (const [name, v] of Object.entries(T)) {
    const pts = v.pts.map(V);
    const curvePts = pts.length > 2 ? smoothPts(pts, pts.length * 10) : pts;
    const curve = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, curvePts.length * 2), v.r, 10, false), mats[v.type]);
    vesselMesh[name] = mesh;
    const grp = v.type === 'a' || v.type === 'pa' ? G.art : G.vein;
    grp.add(mesh);
    // Round joints so branches look joined.
    const knob = new THREE.Mesh(new THREE.SphereGeometry(v.r, 12, 8), mats[v.type]); knob.position.copy(pts[0]); grp.add(knob);
    flowLines.push({ name, grp, type: v.type, path: pathOf(curvePts), out: v.type === 'a' || v.type === 'pa' || v.type === 'portal' });
  }

  // ---- capillary beds: fine tubes that shade from red to blue (or blue to red in the lungs)
  const bedPaths = [];
  let seed = 1;
  for (const [key, b] of Object.entries(BEDS)) {
    const aEnds = b.a.map(end), vEnds = b.v.length ? b.v.map(end) : [b.vEnd()];
    if (b.extra) aEnds.push(end(b.extra));
    for (let i = 0; i < b.n; i++) {
      const a = aEnds[i % aEnds.length], v = vEnds[i % vEnds.length];
      const pts = smoothPts(wiggle(a, b.c, v, b.spread, seed++), 40);
      const [c0, c1] = b.lung ? [BLUE, RED] : [RED, BLUE];
      const t = gradientTube(pts, 0.018, c0, c1, 0.85, 40);
      G.beds.add(t);
      bedPaths.push({ key, path: pathOf(pts), lung: !!b.lung });
    }
  }

  // ---- lymph (faint)
  if (o.lymph) {
    const lm = new THREE.MeshBasicMaterial({ color: LYMPH, transparent: true, opacity: 0.35, depthWrite: false });
    LYMPH_LINES.forEach((l) => { const c = new THREE.CatmullRomCurve3(l.map(V), false, 'centripetal'); G.lymph.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.022, 6, false), lm)); });
    const nm = new THREE.MeshBasicMaterial({ color: LYMPH, transparent: true, opacity: 0.55, depthWrite: false });
    NODES.forEach((p) => { const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), nm); n.position.set(...p); n.scale.set(1, 0.7, 0.7); G.lymph.add(n); });
  }

  // ---- moving blood: dots along every vessel and bed
  const flow = { t: 0, speed: 1 };
  const dotGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const streams = [];
  if (o.flow) {
    const add = (grp, path, color, out, n, speed) => {
      const m = new THREE.InstancedMesh(dotGeo, M.glow(color), n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
      grp.add(m); streams.push({ m, path, out, n, speed, off: rnd(streams.length) });
    };
    const dotCol = { a: 0xff7a7a, pa: 0x8aa4ff, pv: 0xff7a7a, v: 0x8aa4ff, portal: 0xa08cff };
    flowLines.forEach((f) => add(f.grp, f.path, dotCol[f.type], f.out, Math.max(3, Math.round(f.path.total * 3.2)), f.type === 'a' || f.type === 'pa' ? 1.6 : 0.8));
    bedPaths.forEach((b) => add(G.beds, b.path, 0xd08cff, true, 3, 0.35));
  }
  const _p = new THREE.Vector3(), _o = new THREE.Object3D();
  flow.step = (dt, speed = 1) => {
    flow.t += dt * speed;
    streams.forEach((st) => {
      for (let i = 0; i < st.n; i++) {
        let u = (i / st.n + st.off + (flow.t * st.speed) / st.path.total) % 1;
        if (!st.out) u = 1 - u;
        st.path.at(u, _p); _o.position.copy(_p); _o.updateMatrix(); st.m.setMatrixAt(i, _o.matrix);
      }
      st.m.instanceMatrix.needsUpdate = true;
    });
  };
  flow.visible = (on) => streams.forEach((st) => { st.m.visible = on; });

  // ---- labels
  const labels = [], minor = [];
  const L = (html, pos, parent, cls = '', main = false) => { const l = tint(stage.label(html, pos, parent), cls); labels.push(l); if (!main) minor.push(l); return l; };
  if (o.labels) {
    L('Heart: see HeartClear', [1.9, 12.0, 0.9], G.heart, 'pink', true);
    L('Aorta', [1.45, 11.0, -0.4], G.art, 'red', true);
    L('Carotid artery', [1.55, 15.35, 0.2], G.art, 'red');
    L('Pulmonary artery: to lungs', [2.2, 14.75, 0.3], G.art, 'blue', true);
    L('Femoral artery', [2.1, 6.4, 0.2], G.art, 'red');
    L('Superior vena cava', [-2.3, 13.75, 0.3], G.vein, 'blue', true);
    L('Inferior vena cava', [-2.2, 10.4, -0.3], G.vein, 'blue', true);
    L('Jugular vein', [-1.55, 15.35, 0.1], G.vein, 'blue');
    L('Pulmonary vein: from lungs', [-2.7, 12.5, -0.1], G.vein, 'red');
    L('Portal vein: gut to liver', [-2.5, 11.3, 0.2], G.vein, 'purple');
    L('Femoral vein', [-2.0, 6.4, 0.1], G.vein, 'blue');
    L('Capillary beds', [2.0, 16.9, 0], G.beds, 'purple', true);
    L('Lymph vessels and nodes', [2.0, 8.6, 0.4], G.lymph, 'lymph');
  }

  const api = {
    root, G, organ, heart, halo, vesselMesh, mats, skinMat, flow, labels, minor, bedPaths, flowLines,
    setXray(k) {
      skinMat.opacity = lerp(0.5, 0.1, k);
      Object.values(mats).forEach((m) => { m.emissiveIntensity = lerp(0.05, 0.3, k); });
    },
    setExplode(k) {
      const e = smooth(k);
      G.art.position.set(-5.2 * e, 0, 0);
      G.vein.position.set(5.2 * e, 0, 0);
      G.lymph.position.set(0, 0, -1.8 * e);
    },
    showLabels(on, narrow = false) { labels.forEach((l) => { l.visible = on && !narrow; }); },
  };
  api.setExplode(0); api.setXray(1);
  return api;
}
