// Chapter 4: at the capillaries, and the way home. Two models in one chapter:
//  1. A capillary between tissue cells. Red cells squeeze through in single file; oxygen and glucose
//     diffuse out, carbon dioxide diffuses in; Starling forces push fluid out at the arterial end and
//     draw some back at the venous end; the rest leaves through a lymph vessel.
//  2. A leg vein beside the calf muscle, with one-way valves: the muscle pump.
// Starling forces (Starling, J Physiol 19:312, 1896; Guyton & Hall, 14th ed., ch. 16):
//   net outward pressure = (Pc − Pif) − (πp − πif)
//   capillary pressure Pc about 35 mmHg at the arterial end, about 15 at the venous end (StatPearls
//   "Physiology, Capillary"); interstitial fluid pressure Pif about −3; plasma colloid osmotic
//   pressure πp about 25–28 (we use 28, Guyton); interstitial colloid osmotic pressure πif about 8.
//   Lymph returns about 2–3 L a day (Guyton ch. 16). Lymph flow can rise many times over, so oedema
//   (swelling) appears only when the net outward push rises by more than about 17 mmHg, Guyton's
//   "safety factor against oedema". Modern work (the glycocalyx, Levick & Michel, Cardiovasc Res
//   87:198, 2010) finds little re-absorption at the venous end in most tissues; the classic
//   picture is shown with that caveat.
// Diffusion: arterial PO2 about 95 mmHg, tissue fluid about 40, inside cells about 23; CO2 about
// 46 in cells vs 40 in arterial blood (Guyton ch. 41). A capillary is about 5–10 µm wide and
// 0.5–1 mm long; blood crosses it in about 1–2 s.
// Muscle pump (Guyton ch. 15): standing still, venous pressure at the ankle is about 90 mmHg (the
// weight of blood from the heart down); walking, the calf pump and valves keep it below about
// 20–25 mmHg within a few steps; with failed valves it stays high, which leads to varicose veins
// and swollen ankles.
import { THREE, M, clamp, lerp, smooth, arrow, tube } from '../kit.js';
import { tint, fitNarrow, compactReadout, inReel, rbcGeometry, rnd } from '../circ.js';

const PIF = -3, PIIF = 8, PIP0 = 28;
const VIEWS = {
  cap: { pos: [-2.4, 12.0, 27.5], target: [-3.6, 10.4, 0] },
  vein: { pos: [34.2, 6.6, 17], target: [32.6, 5.6, 0] },
};
const VX = 36;                           // x of the leg-vein model

export default {
  id: 'exchange',
  short: 'At the capillaries',
  title: 'Swap at the capillaries, squeeze back home',
  subtitle: 'Where blood finally does its job, and how it climbs back up your legs.',
  view: VIEWS.cap,
  learn: `<p>Everything the heart does is for this moment. In a <b>capillary</b>, only one cell thick and just wide enough for one <b>red blood cell</b> at a time, blood slows to about 0.3 mm a second and swaps things with the cells around it.</p>
    <p><b>Oxygen</b> and <b>glucose</b> are more crowded in the blood than in the cells, so they <b>diffuse</b> out. <b>Carbon dioxide</b> is more crowded in the cells, so it diffuses in. Nothing pumps them: they just spread from crowded to less crowded.</p>
    <p>Water moves too, pushed and pulled by <b>Starling forces</b>. Blood pressure pushes fluid <b>out</b>, about <b>35 mmHg</b> at the start of the capillary. Proteins in the plasma, mainly <b>albumin</b>, pull water back <b>in</b> by osmosis, about <b>28 mmHg</b> (see OsmosisClear). At the start the push wins and fluid leaks out; by the end the pressure has dropped to about <b>15</b> and some is drawn back. What is left over, about <b>2–3 litres a day</b>, is collected by <b>lymph</b> vessels.</p>
    <p>If too much leaks, tissues swell: <b>oedema</b>. It happens when capillary pressure rises (as in heart failure) or when blood has too little protein (as in severe malnutrition or liver disease).</p>
    <p>Then blood has to get home. In your legs that means climbing more than a metre with very little pressure left. Veins have <b>one-way valves</b>, and every time your calf muscles squeeze, they milk blood upwards: the <b>muscle pump</b>. Stand still for long and blood pools in your feet; walk, and ankle vein pressure falls from about <b>90 to about 20 mmHg</b>.</p>
    <p class="tip"><b>Try it:</b> lower the plasma protein and watch the tissue swell. Then switch to the leg vein, press walk, and break the valves.</p>`,
  terms: [
    { t: 'Diffusion', d: 'Particles spreading from where they are crowded to where they are not, with no pump needed.' },
    { t: 'Starling forces', d: 'The push of blood pressure out of a capillary and the pull of plasma proteins back in.' },
    { t: 'Colloid osmotic pressure', d: 'The pull on water made by proteins that cannot leave the blood, about 25–28 mmHg.' },
    { t: 'Albumin', d: 'The most common protein in plasma, made by the liver. It holds water inside the blood vessels.' },
    { t: 'Oedema', d: 'Swelling from too much fluid in the tissues. American spelling: edema.' },
    { t: 'Muscle pump', d: 'Muscles squeezing veins as they work, pushing blood towards the heart past one-way valves.' },
  ],
  defaults: { where: 'cap', dPc: 0, protein: 1, walk: false, valves: true, labels: true },
  controls: [
    { key: 'where', type: 'seg', label: 'Look at', options: [{ v: 'cap', label: 'A capillary' }, { v: 'vein', label: 'A leg vein' }] },
    { key: 'dPc', type: 'range', label: 'Capillary pressure', min: -10, max: 25, step: 1, ends: ['lower', 'higher (as in heart failure)'], fmt: (v) => (v > 0 ? '+' : '') + v + ' mmHg' },
    { key: 'protein', type: 'range', label: 'Protein in the plasma', min: 0.3, max: 1.2, step: 0.01, ends: ['low', 'high'], fmt: (v) => Math.round(v * 100) + '% of normal' },
    { key: 'walk', type: 'toggle', label: 'Walk (leg vein)' },
    { key: 'valves', type: 'toggle', label: 'Healthy valves (leg vein)' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'What moves oxygen from the blood into your cells?', options: ['A pump in the capillary wall', 'Diffusion: from more crowded to less crowded', 'The lymph', 'Gravity'], answer: 1, why: 'There is more oxygen in the blood than in the cells, so it spreads out across the thin capillary wall by itself.' },
    { q: 'What pulls water back into a capillary?', options: ['Blood pressure', 'Proteins in the plasma, by osmosis', 'The heart', 'Valves'], answer: 1, why: 'Plasma proteins such as albumin cannot leave, so they draw water back in: about 28 mmHg of pull.' },
    { q: 'Why does walking lower the pressure in your ankle veins?', options: ['It makes the heart weaker', 'Calf muscles squeeze the veins and the valves stop blood falling back', 'It cools the blood', 'It doesn’t'], answer: 1, why: 'Each squeeze pushes blood up; the valves stop it sliding back. Standing still, ankle vein pressure is about 90 mmHg; walking, about 20.' },
  ],
  reel: [
    { ms: 5600, caption: 'In a capillary one cell wide, oxygen and food slip out and carbon dioxide slips in.', set: { where: 'cap', dPc: 0, protein: 1, labels: false }, view: { pos: [0.5, 8.4, 16], target: [0, 7.2, 0] }, spin: 0 },
    { ms: 5200, caption: 'Walking helps: calf muscles squeeze the veins, and one-way valves stop blood falling back.', set: { where: 'vein', walk: true, valves: true, labels: false }, view: { pos: [VX + 3.2, 6.0, 13.5], target: [VX, 5.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);

    // ================================================================ 1. the capillary (1 unit = 2 µm)
    const cap = new THREE.Group(); cap.position.y = 7.2; root.add(cap);
    const CL = 17, CR = 2.1;                                    // shortened length, 4.2 µm radius shown
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CL, 48, 1, true), M.clear(0xf3c2cf, 0.28));
    wall.rotation.z = Math.PI / 2; cap.add(wall);
    // Endothelial cell borders: a few rings and seams, one cell thick.
    const seam = new THREE.MeshBasicMaterial({ color: 0xf6d6de, transparent: true, opacity: 0.55 });
    for (let i = -3; i <= 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(CR, 0.03, 6, 48), seam); r.rotation.y = Math.PI / 2; r.position.x = i * 2.6 + 0.4; cap.add(r); }
    // Tissue cells above and below, and a lymph vessel.
    const cellMat = new THREE.MeshStandardMaterial({ color: 0xe8b8a0, roughness: 0.7, transparent: true, opacity: 0.75 });
    const nucMat = new THREE.MeshStandardMaterial({ color: 0x8a5fb0, roughness: 0.6 });
    const cells = [];
    for (let i = 0; i < 7; i++) for (const sy of [1, -1]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), cellMat);
      const home = new THREE.Vector3(-7.2 + i * 2.4 + (sy > 0 ? 0 : 1.1), sy * 4.7, -0.3 + rnd(i * 3 + sy) * 0.6);
      c.scale.set(1.05, 1.35, 1.0); c.position.copy(home); cap.add(c);
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10), nucMat); n.position.copy(home).add(new THREE.Vector3(0.1, sy * 0.25, 0.5)); cap.add(n);
      cells.push({ c, n, home });
    }
    const fluid = new THREE.Mesh(new THREE.BoxGeometry(CL + 1, 10.8, 2.6), new THREE.MeshBasicMaterial({ color: 0x6fc3ff, transparent: true, opacity: 0.05, depthWrite: false }));
    cap.add(fluid);
    const lymphMat = new THREE.MeshStandardMaterial({ color: 0x6ee7a8, roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false });
    const lymph = tube([[6.5, -2.9, 1.6], [4.5, -3.3, 1.8], [2.0, -3.1, 1.8]], 0.55, lymphMat, false, 30); cap.add(lymph);
    // Red cells in single file.
    const NR = 7, rbcs = [];
    const rbcMat = new THREE.MeshStandardMaterial({ color: 0xd8323c, roughness: 0.35, emissive: 0x330006 });
    for (let i = 0; i < NR; i++) { const m = new THREE.Mesh(rbcGeometry(3.3), rbcMat.clone()); m.rotation.z = Math.PI / 2; cap.add(m); rbcs.push({ m, x: -CL / 2 + (i / NR) * CL }); }
    // Molecules: O2 (red) and glucose (green) out, CO2 (grey) in, water (blue) out/in.
    const mk = (n, col, r) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 8, 6), M.glow(col), n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; cap.add(m); return m; };
    const NO = 60, NC = 40, NG = 24, NW = 60;
    const o2 = mk(NO, 0xff5a6a, 0.13), co2 = mk(NC, 0xc9ced8, 0.13), glu = mk(NG, 0x6ee7a8, 0.15), wat = mk(NW, 0x6fc3ff, 0.1);
    const seedMol = (n, k) => Array.from({ length: n }, (_, i) => ({ x: -CL / 2 + rnd(i * 7 + k) * CL, t: rnd(i * 13 + k), side: rnd(i * 5 + k) > 0.5 ? 1 : -1, z: (rnd(i * 17 + k) - 0.5) * 1.6 }));
    const mO = seedMol(NO, 1), mC = seedMol(NC, 2), mG = seedMol(NG, 3), mW = seedMol(NW, 4);
    // Starling arrows along the capillary: up and down, length ∝ net pressure.
    const NA = 5, arrows = [];
    for (let i = 0; i < NA; i++) for (const sy of [1, -1]) { const a = arrow(0x6fc3ff, 1, 0.35, 0.07); a.position.set(-CL / 2 + 1.5 + (i / (NA - 1)) * (CL - 3), 0, 1.2); cap.add(a); arrows.push({ a, i, sy }); }
    const capLabs = [
      tint(stage.label('Arterial end: 35 mmHg push', [-CL / 2 + 1.3, 2.9, 1.2], cap), 'red'),
      tint(stage.label('Venous end: 15 mmHg', [CL / 2 - 1.3, 2.9, 1.2], cap), 'blue'),
      tint(stage.label('Tissue cells', [0, 6.6, 0], cap), ''),
      tint(stage.label('Lymph vessel: takes the extra', [4.5, -4.3, 1.8], cap), 'good'),
      tint(stage.label('<span style="color:#ff8a8a">● O₂</span> &nbsp;<span style="color:#6ee7a8">● glucose</span> &nbsp;<span style="color:#c9ced8">● CO₂</span> &nbsp;<span style="color:#8fd3ff">● water</span>', [0, -6.6, 0], cap), ''),
    ];

    // ================================================================ 2. the leg vein and calf pump
    const leg = new THREE.Group(); leg.position.set(VX, 0.4, 0); root.add(leg);
    const VR = 0.55, VH = 10;
    const vein = new THREE.Mesh(new THREE.CylinderGeometry(VR, VR, VH, 40, 1, true), M.clear(0x7f9dff, 0.3));
    vein.position.y = VH / 2; leg.add(vein);
    const valveMat = new THREE.MeshBasicMaterial({ color: 0xeef2ff, side: THREE.DoubleSide });
    const VALVES = [2.2, 4.8, 7.4].map((y) => {
      const g = new THREE.Group(); g.position.y = y; leg.add(g);
      const flaps = [1, -1].map((sx) => {
        const piv = new THREE.Group(); piv.position.x = sx * VR * 0.96; g.add(piv);
        // A leaflet seen in section: a thin curved flap from the wall, free edge pointing up (towards
        // the heart). Open, it lies against the wall; closed, the two tips meet in the middle.
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(-sx * 0.02, 0.5, -sx * 0.05, 0.9); sh.quadraticCurveTo(-sx * 0.2, 0.45, -sx * 0.22, 0); sh.closePath();
        const leaf = new THREE.Mesh(new THREE.ShapeGeometry(sh), valveMat); leaf.position.z = 0.02; piv.add(leaf);
        const leaf2 = leaf.clone(); leaf2.position.z = -0.25; piv.add(leaf2);
        return { piv, sx };
      });
      return { g, flaps, open: 1 };
    });
    const muscleMat = new THREE.MeshStandardMaterial({ color: 0xb5504c, roughness: 0.6, transparent: true, opacity: 0.75 });
    const calf = [1, -1].map((sx) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), muscleMat); m.position.set(sx * 1.55, 3.6, -0.2); m.scale.set(0.9, 2.1, 0.9); leg.add(m); return m; });
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 10, 16), M.matte(0xefe6d6)); bone.position.set(3.1, 5, -0.9); leg.add(bone);
    const NB = 90, vdots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), M.glow(0x7f9dff), NB);
    vdots.instanceMatrix.setUsage(THREE.DynamicDrawUsage); vdots.frustumCulled = false; leg.add(vdots);
    const vy = Float32Array.from({ length: NB }, (_, i) => (i / NB) * VH), vj = Float32Array.from({ length: NB }, (_, i) => rnd(i + 900) - 0.5), vk = Float32Array.from({ length: NB }, (_, i) => rnd(i + 1900) - 0.5);
    const legLabs = [
      tint(stage.label('Calf muscle', [-2.4, 1.1, 0.5], leg), 'pink'),
      tint(stage.label('One-way valve', [1.9, 6.0, 0.4], leg), 'side'),
      tint(stage.label('Up to the heart ↑', [0, VH + 0.6, 0], leg), 'blue'),
      tint(stage.label('Shin bone', [3.1, 8.2, -0.9], leg), ''),
    ];

    const o = new THREE.Object3D(), p = new THREE.Vector3();
    let where = null, t = 0, ankle = 90, stepPh = 0, swell = 0;
    const cA = new THREE.Color(0xd8323c), cV = new THREE.Color(0x7a1f40), cc = new THREE.Color();
    let net = { a: 18, v: -2, mean: 8, pip: PIP0 };
    const fit = fitNarrow(stage, { pos: [0, 8.2, 26], target: [0, 7.2, 0] });

    const place = (m, i, x, y, z) => { o.position.set(x, y, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix); };
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        if (s.where !== where) {
          where = s.where;
          if (!inReel()) stage.setView(VIEWS[where].pos, VIEWS[where].target, 0.9);
        }
        const narrow = fit();
        const on = s.labels && !inReel();
        // ---------------- capillary
        const pip = PIP0 * s.protein, pa = 35 + s.dPc, pv = 15 + s.dPc;
        const netAt = (f) => (lerp(pa, pv, f) - PIF) - (pip - PIIF);
        net = { a: netAt(0), v: netAt(1), mean: netAt(0.5), pip };
        const swellT = clamp((net.mean - 8 - 17) / 15, 0, 1);               // past the safety factor
        swell = lerp(swell, swellT, 1 - Math.exp(-dt * 1.5));
        cells.forEach(({ c, n, home }) => { const k = 1 + swell * 0.55; c.position.set(home.x, home.y * k, home.z); n.position.set(home.x + 0.1, home.y * k + Math.sign(home.y) * 0.25, home.z + 0.5); });
        fluid.material.opacity = 0.025 + swell * 0.25; fluid.scale.y = 1 + swell * 0.5;
        const flowV = 1.3;
        rbcs.forEach((r, i) => {
          r.x += flowV * dt; if (r.x > CL / 2 + 1.7) r.x -= CL + 3.4;
          const f = clamp((r.x + CL / 2) / CL, 0, 1);
          r.m.position.set(r.x, Math.sin(t * 2 + i) * 0.1, 0);
          r.m.material.color.copy(cc.copy(cA).lerp(cV, f));
          r.m.scale.set(1, 1 - 0.12 * Math.sin(t * 3 + i), 1);
          r.m.visible = Math.abs(r.x) < CL / 2 + 1.5;
        });
        // O2 and glucose drift out; CO2 drifts in. Each molecule runs a 0→1 journey and restarts.
        const outMove = (arr, m, speed, rMax) => arr.forEach((q, i) => {
          q.t += dt * speed; if (q.t > 1) { q.t -= 1; q.x = -CL / 2 + Math.random() * CL; q.side = Math.random() > 0.5 ? 1 : -1; }
          const r = q.t * rMax;
          place(m, i, q.x + Math.sin(q.t * 9 + i) * 0.2, q.side * r * (1 + swell * 0.5), q.z);
        });
        outMove(mO, o2, 0.35, 5.2); outMove(mG, glu, 0.22, 5.0);
        mC.forEach((q, i) => { q.t += dt * 0.3; if (q.t > 1) { q.t -= 1; q.x = -CL / 2 + Math.random() * CL; q.side = Math.random() > 0.5 ? 1 : -1; } place(co2, i, q.x + Math.cos(q.t * 8 + i) * 0.2, q.side * (1 - q.t) * 5.2 * (1 + swell * 0.5), q.z); });
        // Water follows the Starling balance where it crosses.
        mW.forEach((q, i) => {
          const f = (q.x + CL / 2) / CL, n = netAt(f);
          q.t += dt * clamp(Math.abs(n) / 25, 0.05, 1.2) * 0.6; if (q.t > 1) { q.t -= 1; q.x = -CL / 2 + Math.random() * CL; }
          const r = n >= 0 ? CR * 0.6 + q.t * 2.6 : CR * 0.6 + (1 - q.t) * 2.6;
          place(wat, i, q.x, q.side * r, q.z * 0.8 + 0.4);
        });
        [o2, co2, glu, wat].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
        arrows.forEach(({ a, i, sy }) => {
          const n = netAt(i / (NA - 1)), L = clamp(Math.abs(n) / 12, 0, 2.6);
          a.set(L); a.visible = L > 0.1;
          const outward = n >= 0;
          a.rotation.z = (sy > 0) === outward ? 0 : Math.PI;
          a.position.y = outward ? sy * (CR + 0.1) : sy * (CR + 0.2 + L);
          a.children.forEach((c) => c.material.color.set(outward ? 0x6fc3ff : 0x6ee7a8));
        });
        capLabs[0].element.innerHTML = `Arterial end: ${Math.round(pa)} mmHg push`;
        capLabs[1].element.innerHTML = `Venous end: ${Math.round(pv)} mmHg`;
        capLabs.forEach((l, i) => { l.visible = on && where === 'cap' && !(narrow && i < 4); });
        // ---------------- leg vein and calf pump
        const walking = s.walk;
        stepPh = walking ? (stepPh + dt * 1.0) % 1 : 0;                   // about one calf squeeze a second
        const squeeze = walking ? Math.max(0, Math.sin(stepPh * Math.PI * 2)) : 0;
        calf.forEach((m, j) => { m.scale.set(0.9 + 0.3 * squeeze, 2.1 - 0.35 * squeeze, 0.9 + 0.2 * squeeze); m.position.x = (j ? -1 : 1) * (1.55 - 0.3 * squeeze); });
        vein.scale.set(1 - 0.45 * squeeze, 1, 1 - 0.45 * squeeze);
        const target = walking ? (s.valves ? 22 : 72) : 90;
        ankle = lerp(ankle, target, 1 - Math.exp(-dt / (target < ankle ? 2.5 : 8)));
        // Valve states: squeezing → valve below the calf shuts, the ones above open; relaxing → the
        // one below opens to refill, the ones above shut. Broken valves never quite shut.
        const relaxing = walking && squeeze < 0.05;
        VALVES.forEach((v, i) => {
          let want = walking ? (i === 0 ? (squeeze > 0.05 ? 0 : 1) : (relaxing ? 0 : 1)) : 0.35;
          if (!s.valves) want = Math.max(want, 0.75);
          v.open = lerp(v.open, want, 1 - Math.exp(-dt * 14));
          v.flaps.forEach(({ piv, sx }) => { piv.rotation.z = sx * (0.02 + 0.62 * (1 - v.open)); });
        });
        for (let i = 0; i < NB; i++) {
          let v = 0.12;                                                           // steady trickle from the capillaries
          if (walking) v = squeeze > 0.05 ? (vy[i] > 1.6 ? 3.0 * squeeze : 0.1) : (vy[i] < 2.4 ? 1.2 : 0.05);
          if (!s.valves && walking && squeeze < 0.05) v = -1.4;                    // falls back through leaky valves
          if (!s.valves && !walking) v = 0.02;
          vy[i] += v * dt;
          if (vy[i] > VH) vy[i] -= VH; if (vy[i] < 0) vy[i] += VH;
          const rr = VR * 0.75 * (1 - 0.45 * squeeze * (vy[i] > 1.6 && vy[i] < 5.6 ? 1 : 0));
          place(vdots, i, vj[i] * rr * 2, vy[i], vk[i] * rr * 2);
        }
        vdots.instanceMatrix.needsUpdate = true;
        legLabs.forEach((l) => { l.visible = on && where === 'vein' && !narrow; });
        cap.visible = where === 'cap' || !inReel();
        leg.visible = where === 'vein' || !inReel();
      },
      readout: (s) => {
        if (s.where === 'vein') {
          return `<div class="big">Ankle vein: ${Math.round(ankle)} mmHg</div>
            <div class="row"><span>Standing still</span><b>about 90 mmHg</b></div>
            <div class="row"><span>Walking, healthy valves</span><b>about 20–25 mmHg</b></div>
            <div class="row"><span>Valves</span><b>${s.valves ? 'working: one way only' : 'leaky: blood falls back'}</b></div>
            <small>${!s.valves ? 'With leaky valves the pressure stays high, veins stretch and bulge (varicose veins) and ankles swell.' : s.walk ? 'Each squeeze pushes blood up; the valve below shuts so it cannot fall back.' : 'Standing still, the whole column of blood from heart to foot presses on the ankle veins.'}</small>`;
        }
        const nA = Math.round(net.a), nV = Math.round(net.v), m = net.mean;
        const lymphL = clamp(2.5 * m / 8, 0.3, 40);
        return `<div class="big">${m - 8 > 17 ? 'Swelling: oedema' : 'Out at the start, back at the end'}</div>
          <div class="row"><span>Net push at the arterial end</span><b>${nA > 0 ? '+' : ''}${nA} mmHg ${nA >= 0 ? 'out' : 'in'}</b></div>
          <div class="row"><span>Net push at the venous end</span><b>${nV > 0 ? '+' : ''}${nV} mmHg ${nV >= 0 ? 'out' : 'in'}</b></div>
          <div class="row"><span>Protein pull (plasma)</span><b>${Math.round(net.pip)} mmHg</b></div>
          <div class="row"><span>Lymph must carry away</span><b>${m <= 25 ? `about ${lymphL.toFixed(1)} L a day` : 'more than it can'}</b></div>
          <small>Net push = (blood pressure − tissue pressure) − (plasma protein pull − tissue protein pull). O₂ falls from about 95 to 40 mmHg across the capillary.</small>`;
      },
    });
  },
};
