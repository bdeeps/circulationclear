// Chapter 5: what blood is, and how it plugs a leak. Two models:
//  1. A spun tube of blood (plasma on top, a thin buffy coat of white cells and platelets, red cells
//     at the bottom) and a magnified drop with red cells, white cells and platelets.
//  2. A cut small vessel: it narrows, platelets stick and pile into a plug, the clotting cascade runs
//     and fibrin threads knit the plug into a clot.
// Numbers:
//  - Haematocrit (packed red cell volume) about 40–45% on average; typical ranges about 41–50% in
//    men and 36–44% in women (lab ranges vary; MedlinePlus "Hematocrit test"). Living at high
//    altitude raises it (more EPO); anaemia lowers it. Plasma is about 55% of blood and about 92%
//    water, with proteins (albumin, globulins, fibrinogen), salts, sugar and hormones (Guyton & Hall,
//    14th ed., ch. 33).
//  - Counts per microlitre: red cells about 4.2–6.2 million, white cells about 4,500–11,000,
//    platelets about 150,000–450,000 (MedlinePlus "Complete blood count"; NHLBI "Thrombocytopenia").
//  - Red cells live about 120 days (Thiagarajan et al., "How do red blood cells die?", Front Physiol
//    12:655393, 2021); the marrow replaces about 2–3 million every second (25 trillion ÷ 120 days).
//    EPO from the kidneys speeds this up when oxygen is low (see KidneyClear).
//  - Clotting (Guyton & Hall ch. 37; Macfarlane, Nature 202:498, 1964; Davie & Ratnoff, Science
//    145:1310, 1964): vascular spasm, platelet plug, then a cascade in which each activated factor
//    switches on many molecules of the next, ending with thrombin turning fibrinogen into fibrin.
//    Tissue factor + factor VIIa starts it at a wound; factors XII, XI, IX and VIII amplify it.
//    A small cut usually stops bleeding within a few minutes (bleeding time about 2–9 minutes).
//    Haemophilia A is a lack of factor VIII.
import { THREE, M, clamp, lerp, smooth, canvasTexture } from '../kit.js';
import { tint, fitNarrow, compactReadout, inReel, board, rrect, rbcGeometry, rnd } from '../circ.js';

const PEOPLE = {
  man: { name: 'An adult man', hct: 45, rbc: 5.2 },
  woman: { name: 'An adult woman', hct: 40, rbc: 4.6 },
  altitude: { name: 'Weeks high in the mountains', hct: 52, rbc: 6.0 },
  anaemia: { name: 'Someone with anaemia', hct: 30, rbc: 3.4 },
};
const VIEWS = {
  blood: { pos: [-0.8, 7.4, 21], target: [-2.2, 6.3, 0] },
  clot: { pos: [38.8, 7.1, 21], target: [37.1, 5.4, 0] },
};
const CX = 40;              // x of the cut-vessel model

// The cascade, drawn as a waterfall. [label, x, y, which path, time it lights (s after the cut)]
const STEPS = [
  ['Tissue factor from the wound', 0.08, 0.2, 'ext', 2.0],
  ['VII → VIIa', 0.1, 0.36, 'ext', 2.6],
  ['XII → XIIa', 0.62, 0.2, 'int', 2.4],
  ['XI → XIa', 0.64, 0.33, 'int', 3.0],
  ['IX → IXa (+ VIII)', 0.66, 0.46, 'int', 3.6],
  ['X → Xa', 0.38, 0.58, 'common', 4.2],
  ['Prothrombin → thrombin', 0.34, 0.71, 'common', 5.0],
  ['Fibrinogen → fibrin threads', 0.3, 0.86, 'common', 5.8],
];
function drawCascade(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.9)'; rrect(g, 0, 0, w, h, 22); g.fill();
  g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('The clotting cascade', 26, 44);
  g.fillStyle = 'rgba(232,238,248,.6)'; g.font = '20px sans-serif'; g.fillText('each switched-on factor switches on many of the next', 26, 72);
  const pos = STEPS.map(([, x, y]) => [x * w + 10, y * h + 40]);
  const link = (a, b) => { g.beginPath(); g.moveTo(pos[a][0] + 60, pos[a][1] + 10); g.lineTo(pos[b][0] + 60, pos[b][1] - 22); g.stroke(); };
  g.lineWidth = 3;
  [[0, 1], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]].forEach(([a, b]) => { g.strokeStyle = st.lit[b] ? 'rgba(255,209,102,.8)' : 'rgba(255,255,255,.15)'; link(a, b); });
  STEPS.forEach(([label, , , path], i) => {
    const [x, y] = pos[i], on = st.lit[i], missing = st.haemo && i === 4;
    g.font = (on ? 'bold ' : '') + '22px sans-serif';
    const tw = g.measureText(label).width;
    g.fillStyle = missing ? 'rgba(255,90,106,.25)' : on ? (path === 'common' ? 'rgba(255,209,102,.95)' : 'rgba(142,240,255,.9)') : 'rgba(255,255,255,.08)';
    rrect(g, x - 10, y - 26, tw + 20, 38, 10); g.fill();
    g.fillStyle = on && !missing ? '#101218' : 'rgba(255,255,255,.75)'; g.fillText(label, x, y);
    if (missing) { g.fillStyle = '#ff8a8a'; g.font = 'bold 19px sans-serif'; g.fillText('VIII missing: haemophilia', x, y + 32); }
  });
  g.fillStyle = 'rgba(142,240,255,.9)'; g.font = '19px sans-serif'; g.fillText('starter (at the wound)', 26, h - 18);
  g.fillStyle = 'rgba(255,209,102,.95)'; g.fillText('amplifier → common path', w * 0.45, h - 18);
}

export default {
  id: 'blood',
  short: 'What blood is',
  title: 'What blood is, and how it plugs a leak',
  subtitle: 'Red cells, white cells, platelets and plasma, and the chain reaction that makes a clot.',
  view: VIEWS.blood,
  learn: `<p>Spin a tube of blood fast and it separates. About <b>55%</b> is <b>plasma</b>, a straw-coloured liquid that is mostly water, carrying salts, sugar, hormones and proteins such as <b>albumin</b>. Just under half is <b>red blood cells</b>. The share of red cells is the <b>haematocrit</b>, about <b>40–45%</b>: a bit higher in men, lower in women, higher again in people living high in the mountains.</p>
    <p>A drop the size of a pinhead (one microlitre) holds about <b>5 million red cells</b>, which carry oxygen on <b>haemoglobin</b>; about <b>5,000–10,000 white cells</b>, which fight germs; and about <b>150,000–450,000 platelets</b>, tiny cell pieces that help plug leaks. Red cells live about <b>120 days</b>, so your bone marrow makes about <b>2–3 million every second</b>. When oxygen is low, the kidneys send a hormone, <b>EPO</b>, to speed it up (see KidneyClear).</p>
    <p>Cut a small vessel and three things happen. The vessel <b>narrows</b>. <b>Platelets</b> stick to the torn edge and to each other, making a soft <b>plug</b>. Then the <b>clotting cascade</b> runs: a chain of proteins in the plasma, each switching on many copies of the next, until <b>thrombin</b> turns soluble <b>fibrinogen</b> into sticky <b>fibrin</b> threads that knit the plug into a firm <b>clot</b>. Because each step multiplies the last, a tiny trigger quickly makes a big clot.</p>
    <p>People with <b>haemophilia</b> lack one of the proteins, usually factor VIII, so their blood clots slowly.</p>
    <p class="tip"><b>Try it:</b> compare the tubes for a man, a woman and someone with anaemia. Then switch to the cut, press "Cut it", and try again with factor VIII missing.</p>`,
  terms: [
    { t: 'Plasma', d: 'The liquid part of blood, about 55% of it: water with proteins, salts, sugar and hormones.' },
    { t: 'Haematocrit', d: 'The share of blood made of red cells, about 40–45%.' },
    { t: 'Haemoglobin', d: 'The iron-containing protein in red cells that carries oxygen and makes blood red.' },
    { t: 'White blood cells', d: 'Cells that defend the body against germs. Only about one for every 500–1,000 red cells.' },
    { t: 'Platelets', d: 'Tiny fragments of cells that stick to damaged vessels and start a clot.' },
    { t: 'Fibrin', d: 'Sticky protein threads made from fibrinogen that bind a clot together.' },
    { t: 'Haemophilia', d: 'An inherited condition in which a clotting factor is missing, so bleeding lasts longer.' },
  ],
  defaults: { where: 'blood', who: 'man', haemo: false, cutT: -1, labels: true },
  controls: [
    { key: 'where', type: 'seg', label: 'Look at', options: [{ v: 'blood', label: 'A tube of blood' }, { v: 'clot', label: 'A cut' }] },
    { key: 'who', type: 'seg', label: 'Whose blood?', options: [{ v: 'man', label: 'Man' }, { v: 'woman', label: 'Woman' }, { v: 'altitude', label: 'Mountains' }, { v: 'anaemia', label: 'Anaemia' }], fmt: (v) => PEOPLE[v].name },
    { key: 'go', type: 'buttons', label: 'The cut', items: [{ label: 'Cut it', act: (s) => { s.where = 'clot'; s.cutT = 0; } }, { label: 'Heal', act: (s) => { s.cutT = -1; } }] },
    { key: 'haemo', type: 'toggle', label: 'Factor VIII missing (haemophilia)' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'About what share of your blood is red cells?', options: ['About 5%', 'About 40–45%', 'About 90%', 'About 55%'], answer: 1, why: 'That is the haematocrit. Plasma makes up most of the rest, about 55%.' },
    { q: 'Which part of blood starts plugging a cut?', options: ['Red cells', 'Platelets', 'Plasma water', 'Hormones'], answer: 1, why: 'Platelets stick to the torn wall and to each other within seconds, making a soft plug.' },
    { q: 'Why is clotting called a cascade?', options: ['It happens in a waterfall', 'Each activated protein switches on many of the next, so the signal grows fast', 'It only happens downhill', 'Because blood is liquid'], answer: 1, why: 'Like a waterfall that gets bigger as it falls, each step multiplies the one before, ending in fibrin threads.' },
  ],
  reel: [
    { ms: 5600, caption: 'Cut a vessel and platelets pile into a plug, then fibrin threads knit it into a clot.', set: { where: 'clot', haemo: false, labels: false, cutT: 0 }, view: { pos: [CX + 0.5, 9.6, 12.5], target: [CX, 8.8, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);

    // ================================================================ 1. the tube and the drop
    const tubeG = new THREE.Group(); tubeG.position.set(-3.6, 0.3, 0); root.add(tubeG);
    const TH = 8, TR = 0.95;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(TR + 0.08, TR + 0.08, TH + 0.6, 40, 1, true), M.clear(0xe6f6ff, 0.18));
    glass.position.y = TH / 2 + 0.3; tubeG.add(glass);
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(TR + 0.08, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.clear(0xe6f6ff, 0.18)); tubeG.add(bottom);
    const layer = (col, op = 1) => new THREE.Mesh(new THREE.CylinderGeometry(TR, TR, 1, 40), new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, transparent: op < 1, opacity: op }));
    const redL = layer(0x8e0f1c), buffy = layer(0xf4f1e8), plasma = layer(0xf2d27a, 0.85);
    const redCap = new THREE.Mesh(new THREE.SphereGeometry(TR, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), redL.material); tubeG.add(redCap);
    tubeG.add(redL, buffy, plasma);
    const tubeLabs = [tint(stage.label('Plasma', [2.1, 6, 0], tubeG), 'gold'), tint(stage.label('Buffy coat: white cells, platelets', [2.9, 3.6, 0], tubeG), ''), tint(stage.label('Red cells', [2.0, 1.5, 0], tubeG), 'red')];
    const hctL = tint(stage.label('', [0, TH + 1.1, 0], tubeG), 'gold');

    // The magnified drop: red cells (many), platelets (some), white cells (a few, not to ratio).
    const drop = new THREE.Group(); drop.position.set(3.0, 4.4, 0); root.add(drop);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(3.6, 40, 28), M.clear(0xf2d27a, 0.08)); drop.add(shell);
    const NRBC = 150, rbcGeo = rbcGeometry(0.62, 6, 14);
    const rbcM = new THREE.InstancedMesh(rbcGeo, new THREE.MeshStandardMaterial({ color: 0xd8323c, roughness: 0.35, emissive: 0x2a0006 }), NRBC);
    rbcM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drop.add(rbcM);
    const NPL = 16, plM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0xe8d8f0, roughness: 0.5 }), NPL);
    plM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drop.add(plM);
    const wbcs = [0, 1, 2].map((i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(i === 1 ? 0.5 : 0.62, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf2eef8, roughness: 0.6, transparent: true, opacity: 0.85 }));
      g.add(body);
      const nm = new THREE.MeshStandardMaterial({ color: 0x6a4cc0, roughness: 0.5 });
      if (i === 0) [[-0.2, 0.1], [0.15, 0.2], [0.18, -0.15]].forEach(([x, y]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), nm); l.position.set(x, y, 0.2); g.add(l); });
      else { const n = new THREE.Mesh(new THREE.SphereGeometry(i === 1 ? 0.38 : 0.36, 16, 12), nm); n.position.z = 0.12; if (i === 2) n.scale.set(1.2, 0.8, 1); g.add(n); }
      drop.add(g); return g;
    });
    const seeds = Array.from({ length: NRBC + NPL + 3 }, (_, i) => {
      const u = rnd(i * 3 + 1), v = rnd(i * 3 + 2), w = rnd(i * 3 + 3);
      const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1), r = 3.1 * Math.cbrt(w);
      return { p: new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)), a: rnd(i + 77) * 6, b: rnd(i + 99) * 6 };
    });
    const dropLabs = [
      tint(stage.label('Red cells: carry oxygen', [0, 4.1, 0], drop), 'red'),
      tint(stage.label('White cells: fight germs', [1.6, -3.9, 0], drop), 'purple'),
      tint(stage.label('Platelets: plug leaks', [-2.4, -3.2, 0], drop), ''),
    ];
    wbcs[0].position.set(1.5, -1.2, 1.4); wbcs[1].position.set(-1.4, 1.1, 1.6); wbcs[2].position.set(0.7, 1.5, -1.2);

    // ================================================================ 2. the cut vessel and the clot
    const cut = new THREE.Group(); cut.position.set(CX, 7.6, 0); root.add(cut);
    const VL = 12, VR = 1.4;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8646f, roughness: 0.5, side: THREE.DoubleSide });
    // Back half of the vessel (cut open towards you), with a tear in the top.
    const half = new THREE.Mesh(new THREE.CylinderGeometry(VR, VR, VL, 48, 1, true, Math.PI, Math.PI), wallMat); half.rotation.z = Math.PI / 2; cut.add(half);
    const topL = new THREE.Mesh(new THREE.BoxGeometry(VL / 2 - 0.6, 0.22, 1.2), wallMat); topL.position.set(-VL / 4 - 0.3, VR, 0); cut.add(topL);
    const topR = topL.clone(); topR.position.x = VL / 4 + 0.3; cut.add(topR);
    const tissue = new THREE.Mesh(new THREE.BoxGeometry(VL + 2, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xf0c0a8, roughness: 0.8, transparent: true, opacity: 0.2, depthWrite: false })); tissue.position.y = VR + 0.9; cut.add(tissue);
    const NB = 120, bdots = new THREE.InstancedMesh(rbcGeometry(0.34, 5, 12), new THREE.MeshStandardMaterial({ color: 0xd8323c, roughness: 0.4 }), NB);
    bdots.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bdots.frustumCulled = false; cut.add(bdots);
    const bx = Float32Array.from({ length: NB }, (_, i) => -VL / 2 + rnd(i + 300) * VL), by = Float32Array.from({ length: NB }, (_, i) => (rnd(i + 400) - 0.5) * 1.8), bz = Float32Array.from({ length: NB }, (_, i) => -rnd(i + 500) * 1.0);
    const leak = Float32Array.from({ length: NB }, () => 0);
    const NPP = 70, plug = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xeadcf2, roughness: 0.5 }), NPP);
    plug.instanceMatrix.setUsage(THREE.DynamicDrawUsage); plug.frustumCulled = false; cut.add(plug);
    const plugPos = Array.from({ length: NPP }, (_, i) => new THREE.Vector3((rnd(i + 600) - 0.5) * 1.4, VR - 0.25 + rnd(i + 700) * 0.9, (rnd(i + 800) - 0.5) * 0.9));
    const fibrinMat = new THREE.LineBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0 });
    const fpts = [];
    for (let i = 0; i < 70; i++) {
      const a = new THREE.Vector3((rnd(i + 1000) - 0.5) * 2.2, VR - 0.4 + rnd(i + 1100) * 1.3, (rnd(i + 1200) - 0.5) * 1.2);
      const b = a.clone().add(new THREE.Vector3((rnd(i + 1300) - 0.5) * 1.6, (rnd(i + 1400) - 0.5) * 0.9, (rnd(i + 1500) - 0.5) * 0.8));
      fpts.push(a, b);
    }
    const fibrin = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fpts), fibrinMat); cut.add(fibrin);
    const cst = { lit: STEPS.map(() => false), haemo: false };
    const cas = canvasTexture(900, 560, (g, w, h) => drawCascade(g, w, h, cst));
    const casB = board(cas, 9.6, 5.97); casB.position.set(-4.2, -4.55, 1.2); cut.add(casB);
    const cutLabs = [tint(stage.label('Torn wall', [0, VR + 2.2, 0], cut), 'red'), tint(stage.label('', [2.8, VR + 1.3, 0.5], cut), 'gold')];

    const o = new THREE.Object3D(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let where = null, t = 0, hct = 45, stage1 = 'Whole', bleeding = 0, acc = 0;
    const fit = fitNarrow(stage, { pos: [0, 6, 24], target: [0, 5, 0] });
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        if (s.where !== where) { where = s.where; if (!inReel()) stage.setView(VIEWS[where].pos, VIEWS[where].target, 0.9); }
        const narrow = fit(), on = s.labels && !inReel();
        // ---------------- tube
        const P = PEOPLE[s.who];
        hct = lerp(hct, P.hct, 1 - Math.exp(-dt * 4));
        const fill = TH * 0.92, hr = fill * hct / 100, hb = fill * 0.01, hp = fill - hr - hb;
        redL.scale.y = hr; redL.position.y = hr / 2;
        buffy.scale.y = hb; buffy.position.y = hr + hb / 2;
        plasma.scale.y = hp; plasma.position.y = hr + hb + hp / 2;
        tubeLabs[0].position.y = hr + hb + hp / 2; tubeLabs[1].position.y = hr + hb; tubeLabs[2].position.y = hr / 2;
        hctL.element.innerHTML = `<b>Haematocrit ${Math.round(hct)}%</b>`;
        // drop: red cells tumble slowly; fewer when anaemic
        const nShow = Math.round(NRBC * P.hct / 52);
        for (let i = 0; i < NRBC; i++) {
          const sd = seeds[i];
          o.position.copy(sd.p); o.position.y += Math.sin(t * 0.4 + sd.a) * 0.08;
          o.rotation.set(sd.a + t * 0.3, sd.b + t * 0.2, 0);
          o.scale.setScalar(i < nShow ? 1 : 0.0001); o.updateMatrix(); rbcM.setMatrixAt(i, o.matrix);
        }
        rbcM.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < NPL; i++) { const sd = seeds[NRBC + i]; o.position.copy(sd.p).multiplyScalar(0.9); o.rotation.set(sd.a + t * 0.5, sd.b, 0); o.scale.setScalar(1); o.updateMatrix(); plM.setMatrixAt(i, o.matrix); }
        plM.instanceMatrix.needsUpdate = true;
        wbcs.forEach((w, i) => { w.rotation.y = t * 0.3 + i; });
        // ---------------- the cut
        if (s.cutT >= 0) s.cutT += dt;
        const T = s.cutT, cutting = T >= 0;
        const slow = s.haemo ? 2.6 : 1;                         // the amplifier is weak without VIII
        cst.haemo = s.haemo;
        STEPS.forEach((st, i) => { const late = st[3] === 'common' ? slow : 1; cst.lit[i] = cutting && T >= st[4] * (st[3] === 'int' && s.haemo && i === 4 ? 99 : late); });
        const spasm = cutting ? smooth(clamp(T / 1.2, 0, 1)) * (1 - smooth(clamp((T - 14) / 4, 0, 1))) : 0;
        const plugK = cutting ? smooth(clamp((T - 0.8) / 3.5, 0, 1)) : 0;
        const fib = cutting ? smooth(clamp((T - 5.5 * slow) / (3 * slow), 0, 1)) : 0;
        const vs = 1 - 0.15 * spasm;
        half.scale.set(1, 1, 1); half.scale.x = vs; half.scale.z = vs;
        topL.position.y = topR.position.y = VR * vs;
        bleeding = cutting ? clamp(1 - plugK * 0.6 - fib * 0.4, 0, 1) : 0;
        for (let i = 0; i < NB; i++) {
          bx[i] += dt * (1.6 - 0.8 * spasm); if (bx[i] > VL / 2) { bx[i] -= VL; leak[i] = 0; }
          // Cells passing under the tear may escape upwards while it is open.
          if (cutting && Math.abs(bx[i]) < 0.5 && leak[i] === 0 && rnd(i + Math.floor(t * 3)) < bleeding * 0.5) leak[i] = 0.001;
          if (leak[i] > 0) leak[i] += dt * 1.6;
          const trapped = fib > 0.5 && leak[i] > 0 && leak[i] < 1.2;
          const yy = leak[i] > 0 ? VR * 0.3 + (trapped ? Math.min(leak[i], 0.9) : leak[i]) * 1.4 : by[i] * vs;
          if (leak[i] > 2.2) leak[i] = 0;
          o.position.set(leak[i] > 0 ? bx[i] * 0.2 + (rnd(i) - 0.5) * 0.6 : bx[i], yy, bz[i]);
          o.rotation.set(t + i, i, 0); o.scale.setScalar(1); o.updateMatrix(); bdots.setMatrixAt(i, o.matrix);
        }
        bdots.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < NPP; i++) { o.position.copy(plugPos[i]); o.scale.setScalar(i < plugK * NPP ? 1 : 0.0001); o.rotation.set(0, 0, 0); o.updateMatrix(); plug.setMatrixAt(i, o.matrix); }
        plug.instanceMatrix.needsUpdate = true;
        fibrinMat.opacity = fib * 0.95;
        fibrin.geometry.setDrawRange(0, Math.floor(fib * fpts.length / 2) * 2);
        stage1 = !cutting ? 'Whole' : T < 1.2 ? 'Bleeding: the vessel narrows' : T < 4.5 ? 'Platelets stick and pile into a plug' : fib < 0.95 ? (s.haemo ? 'Cascade running slowly: little fibrin yet' : 'Cascade: fibrin threads knit the plug') : 'Clot formed: bleeding stopped';
        cutLabs[1].element.innerHTML = `<b>${stage1}</b>`;
        acc += dt; if (acc > 0.2) { acc = 0; cas.redraw(); }
        // visibility and labels
        [...tubeLabs, hctL, ...dropLabs].forEach((l) => { l.visible = on && where === 'blood' && !narrow; });
        cutLabs.forEach((l) => { l.visible = on && where === 'clot'; });
        casB.visible = !narrow;
      },
      readout: (s) => {
        if (s.where === 'clot') {
          const T = s.cutT;
          return `<div class="big">${stage1}</div>
            <div class="row"><span>Bleeding now</span><b>${Math.round(bleeding * 100)}%</b></div>
            <div class="row"><span>Factor VIII</span><b>${s.haemo ? 'missing: slow clotting' : 'present'}</b></div>
            <div class="row"><span>In real life</span><b>a few minutes</b></div>
            <small>${T < 0 ? 'Press “Cut it” to tear the wall.' : 'Shown about 30× faster than life.'} Platelets make the first plug; fibrin makes it firm.</small>`;
        }
        const P = PEOPLE[s.who];
        return `<div class="big">${P.name}: ${Math.round(hct)}% red cells</div>
          <div class="row"><span>Plasma</span><b>${100 - Math.round(hct) - 1}%, mostly water</b></div>
          <div class="row"><span>Red cells per µL</span><b>about ${P.rbc.toFixed(1)} million</b></div>
          <div class="row"><span>White cells per µL</span><b>about 4,500–11,000</b></div>
          <div class="row"><span>Platelets per µL</span><b>about 150,000–450,000</b></div>
          <small>The drop is not to ratio: there is about one white cell for every 500–1,000 red cells.</small>`;
      },
    });
  },
};
