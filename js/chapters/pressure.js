// Chapter 3: pressure and flow along the way, from the aorta to the vena cava. A cut-open strip
// shows each kind of vessel with its real wall-to-width ratio, blood speeding and slowing, a
// pressure chart lined up underneath, and true-proportion cross-sections.
// Sources:
//  - Vessel sizes (Burton, "Relation of structure to function of the tissues of the wall of blood
//    vessels", Physiol Rev 34:619, 1954; reproduced in most physiology texts): lumen diameter and
//    wall: aorta 25 mm / 2 mm, artery 4 mm / 1 mm, arteriole 30 µm / 20 µm, capillary 8 µm / 1 µm,
//    venule 20 µm / 2 µm, vein 5 mm / 0.5 mm, vena cava 30 mm / 1.5 mm.
//  - Total cross-sectional areas (Guyton & Hall, 14th ed., table 14-1): aorta 2.5 cm², small
//    arteries 20, arterioles 40, capillaries 2,500, venules 250, small veins 80, venae cavae 8.
//    Speed = flow ÷ area: about 33 cm/s in the aorta, about 0.3 mm/s in capillaries.
//  - Pressures (Guyton & Hall, fig. 14-2 and ch. 16): mean aortic pressure about 93–100 mmHg
//    (120/80 gives a mean of about 93), the biggest drop across the arterioles, capillaries about
//    35 mmHg at the arterial end falling to about 15 at the venous end (StatPearls "Physiology,
//    Capillary"), veins under 10, right atrium about 0–4.
//  - Poiseuille's law: resistance ∝ 1/r⁴ (Hagen 1839; Poiseuille 1840–46). Halving the radius
//    makes resistance 16 times bigger.
//  - Baroreflex (Guyton & Hall, ch. 18): on standing, about 500–700 mL of blood pools in the legs
//    and arterial pressure dips; carotid sinus and aortic arch baroreceptors fire less, and within
//    seconds the brainstem speeds the heart and narrows arterioles. Initial orthostatic dips of
//    about 20 mmHg that recover in under 30 s are normal (Wieling et al., Clin Sci 112:157, 2007).
import { THREE, M, clamp, lerp, smooth, latheX, canvasTexture } from '../kit.js';
import { tint, fitNarrow, compactReadout, inReel, board, rrect } from '../circ.js';

// [key, name, lumen Ø µm, wall µm, total area cm², base pressure drop mmHg, wall colour, lumen display radius]
const SEG = [
  ['aorta', 'Aorta', 25000, 2000, 2.5, 1, 0xe7c26a, 0.86],
  ['artery', 'Artery', 4000, 1000, 20, 7, 0xd8646f, 0.66],
  ['arteriole', 'Arteriole', 30, 20, 40, 50, 0xd9485c, 0.34],
  ['capillary', 'Capillary', 8, 1, 2500, 20, 0xf1c9d4, 0.2],
  ['venule', 'Venule', 20, 2, 250, 3, 0xb7a3de, 0.3],
  ['vein', 'Vein', 5000, 500, 80, 7, 0x7a90dc, 0.68],
  ['cava', 'Vena cava', 30000, 1500, 8, 3, 0x6576c8, 0.9],
];
const RA = 2, MAP0 = 93, PP = 40, SEGW = 2.4, X0 = -(SEG.length * SEGW) / 2;
const x0Of = (i) => X0 + i * SEGW;
// Wall thickness in display units: the true wall-to-lumen ratio, so an arteriole's wall is thicker
// than its hole is wide, and a capillary's is one thin cell.
const wallOf = (i) => SEG[i][7] * (SEG[i][3] / (SEG[i][2] / 2));
const Y = 9.0;

// Pressures along the chain for arteriole radius factor k. 'organ': the rest of the body holds the
// mean pressure at 93 mmHg (the baroreflex), so less flow gets through this bed. 'body': every
// arteriole changes and the heart keeps pumping the same, so the mean arterial pressure moves.
function solve(k, mode) {
  const R = SEG.map((s, i) => (i === 2 ? s[5] / k ** 4 : s[5]));
  const Rt = R.reduce((a, b) => a + b, 0), R0 = SEG.reduce((a, s) => a + s[5], 0);
  let Q, map;
  if (mode === 'organ') { map = MAP0; Q = (MAP0 - RA) / Rt; } else { Q = (MAP0 - RA) / R0; map = RA + Q * Rt; }
  const P = [map];
  R.forEach((r) => P.push(P.at(-1) - Q * r));
  return { P, Q: Q / ((MAP0 - RA) / R0), map, R, res: R[2] / SEG[2][5] };
}

function drawChart(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.88)'; rrect(g, 0, 0, w, h, 20); g.fill();
  const L = 47, Rr = 1353, top = 58, bot = h - 22, pMax = 140;
  const Yp = (p) => bot - (clamp(p, 0, pMax) / pMax) * (bot - top);
  const Xs = (u) => L + (u / SEG.length) * (Rr - L);   // u: 0..7 segment units, lined up with the strip
  g.font = '22px sans-serif';
  for (let p = 0; p <= pMax; p += 40) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Yp(p)); g.lineTo(Rr, Yp(p)); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(p, L + 6, Yp(p) - 6); }
  for (let i = 0; i <= SEG.length; i++) { g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.moveTo(Xs(i), top); g.lineTo(Xs(i), bot); g.stroke(); }
  // Pulse band: the swing between systolic and diastolic dies away through the arterioles.
  const amp = (u) => (u < 2 ? PP / 2 * (1 - 0.15 * u / 2) : u < 3 ? PP / 2 * 0.85 * (1 - smooth(u - 2)) : 0);
  const Pat = (u) => { const i = Math.min(SEG.length - 1, Math.floor(u)), f = u - i; return lerp(st.P[i], st.P[i + 1], f); };
  g.fillStyle = 'rgba(255,209,102,.22)'; g.beginPath();
  for (let u = 0; u <= 3; u += 0.05) g.lineTo(Xs(u), Yp(Pat(u) + amp(u) * 1.0));
  for (let u = 3; u >= 0; u -= 0.05) g.lineTo(Xs(u), Yp(Pat(u) - amp(u) * 1.0));
  g.fill();
  // Mean pressure line, coloured red → purple → blue.
  const grad = g.createLinearGradient(L, 0, Rr, 0);
  grad.addColorStop(0, '#ff4a5a'); grad.addColorStop(0.36, '#ff4a5a'); grad.addColorStop(0.5, '#c07cff'); grad.addColorStop(0.64, '#6f8cff'); grad.addColorStop(1, '#6f8cff');
  g.strokeStyle = grad; g.lineWidth = 6; g.beginPath();
  for (let u = 0; u <= SEG.length; u += 0.05) { const y = Yp(Pat(u) + amp(u) * st.wave); u ? g.lineTo(Xs(u), y) : g.moveTo(Xs(u), y); }
  g.stroke(); g.lineWidth = 1;
  // Numbers at the boundaries.
  g.font = 'bold 22px sans-serif'; g.fillStyle = '#ffffff';
  [0, 2, 3, 4, 7].forEach((i) => { const p = st.P[i]; const txt = i === 0 ? `${Math.round(p + PP * 2 / 3)}/${Math.round(p - PP / 3)}` : Math.round(p); g.fillText(txt, Math.min(Rr - 50, Xs(i) + (i ? 8 : 60)), Yp(p + (i === 0 ? PP / 2 : 0)) - 12); });
  g.fillStyle = '#e8eef8'; g.font = 'bold 28px sans-serif'; g.fillText('Blood pressure along the way (mmHg)', L, 38);
  g.fillStyle = 'rgba(255,209,102,.9)'; g.font = '21px sans-serif'; g.fillText('yellow: the swing of each beat', Rr - 300, 38);
}

function drawSections(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.88)'; rrect(g, 0, 0, w, h, 20); g.fill();
  g.fillStyle = '#e8eef8'; g.font = 'bold 26px sans-serif'; g.fillText('Cut across: wall and hole in true proportion (each drawn the same size)', 22, 36);
  const cw = w / SEG.length, R = Math.min(cw * 0.36, 66);
  SEG.forEach(([key, name, d, wall, , , col], i) => {
    const cx = cw * i + cw / 2, cy = 46 + R;
    const rin = R * (d / 2) / (d / 2 + wall), wallPx = R - rin;
    const c = '#' + col.toString(16).padStart(6, '0');
    // adventitia (outer fibrous coat), media (muscle or elastic), intima (endothelium)
    const adv = key === 'capillary' ? 0 : key === 'aorta' ? 0.25 : key === 'arteriole' ? 0.15 : key === 'cava' || key === 'vein' ? 0.5 : 0.3;
    g.fillStyle = '#d8c3a0'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(cx, cy, R - wallPx * adv, 0, 7); g.fill();
    if (key === 'aorta' || key === 'artery') {             // elastic sheets
      g.strokeStyle = 'rgba(255,240,180,.8)'; g.lineWidth = 1.5;
      for (let j = 1; j < (key === 'aorta' ? 6 : 3); j++) { g.beginPath(); g.arc(cx, cy, rin + (R - wallPx * adv - rin) * j / (key === 'aorta' ? 6 : 3), 0, 7); g.stroke(); }
    }
    g.fillStyle = '#f7eef0'; g.beginPath(); g.arc(cx, cy, rin + Math.max(1.5, wallPx * 0.08), 0, 7); g.fill();
    g.fillStyle = '#3a0a12'; g.beginPath(); g.arc(cx, cy, rin, 0, 7); g.fill();
    if (key === 'capillary') { g.fillStyle = '#d8323c'; g.beginPath(); g.ellipse(cx, cy, rin * 0.92, rin * 0.5, 0, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; g.font = 'bold 22px sans-serif';
    const tw = g.measureText(name).width; g.fillText(name, cx - tw / 2, cy + R + 28);
    g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '17px sans-serif';
    const s1 = d >= 1000 ? `hole ${d / 1000} mm` : `hole ${d} µm`, s2 = wall >= 100 ? `wall ${wall / 1000} mm` : `wall ${wall} µm`;
    [s1, s2].forEach((t, j) => { const ww = g.measureText(t).width; g.fillText(t, cx - ww / 2, cy + R + 50 + j * 20); });
  });
}

export default {
  id: 'pressure',
  short: 'Pressure and flow',
  title: 'From 120 over 80 to almost nothing',
  subtitle: 'Why pressure falls along the way, why tiny tubes matter most, and what the walls are like.',
  view: { pos: [0, 9.3, 18.8], target: [0, 8.3, 0] },
  learn: `<p>Blood flows because of a difference in <b>pressure</b>, from high to low. In the aorta it swings between about <b>120 and 80 mmHg</b> with each beat, a mean of about 93. By the far end of the <b>capillaries</b> it is about <b>15</b>, and it arrives back at the heart with almost none left.</p>
    <p>The biggest drop is in the <b>arterioles</b>, the smallest arteries. They have thick rings of <b>smooth muscle</b>, so they act as taps. <b>Poiseuille's law</b> says the resistance of a tube goes up with the <b>fourth power</b> of how much narrower it gets: squeeze an arteriole to half its width and it lets through only <b>one sixteenth</b> as much. By opening some taps and closing others, your body sends blood where it is needed.</p>
    <p>Blood also changes <b>speed</b>. The aorta is one tube of about 2.5 cm², but the capillaries together are about <b>1,000 times wider</b>, so blood slows from about <b>33 cm a second</b> to about <b>0.3 mm a second</b>, giving time to swap oxygen and food.</p>
    <p>The walls match the job. <b>Arteries</b> have thick, stretchy walls to take the pounding. <b>Capillaries</b> are one cell thick so things can pass through. <b>Veins</b> have thin, floppy walls and hold most of your blood at low pressure.</p>
    <p>Your body watches the pressure too. Stretch sensors called <b>baroreceptors</b> in the neck and aorta report to the brainstem (see BrainClear). If you stand up fast and pressure dips, within seconds your heart speeds up and arterioles tighten. Over hours and days the kidneys adjust it with a hormone called <b>renin</b> (see KidneyClear).</p>
    <p>A doctor's <b>cuff</b> reads the top and bottom of the swing in your arm's artery: 120/80 is the classic normal. HeartClear lets you work a cuff yourself.</p>
    <p class="tip"><b>Try it:</b> narrow the arterioles to 50% in one organ and watch the flow collapse. Switch to every arteriole and watch the blood pressure shoot up. Then press "Stand up fast".</p>`,
  terms: [
    { t: 'mmHg', d: 'Millimetres of mercury, the unit of blood pressure. 120 mmHg is about 16 kPa.' },
    { t: 'Arteriole', d: 'The smallest artery, with a thick muscle ring that acts like a tap on the blood supply.' },
    { t: 'Poiseuille’s law', d: 'Flow through a narrow tube depends on its radius to the fourth power, so small changes matter a lot.' },
    { t: 'Vasoconstriction', d: 'Blood vessels narrowing as their muscle tightens. Vasodilation is the opposite.' },
    { t: 'Resistance', d: 'How hard it is to push blood through a vessel. Narrow and long means more resistance.' },
    { t: 'Baroreceptor', d: 'A stretch sensor in the carotid artery and aorta that reports blood pressure to the brain.' },
  ],
  defaults: { k: 1, mode: 'organ', labels: true, standT: 99 },
  controls: [
    { key: 'k', type: 'range', label: 'Arteriole width', min: 0.5, max: 1.5, step: 0.01, ends: ['squeezed', 'opened wide'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'mode', type: 'seg', label: 'Which arterioles?', options: [{ v: 'organ', label: 'One organ' }, { v: 'body', label: 'Every one' }] },
    { key: 'go', type: 'buttons', label: 'Baroreflex', items: [{ label: 'Stand up fast', act: (s) => { s.standT = 0; } }, { label: 'Reset', act: (s) => { s.k = 1; s.standT = 99; } }] },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Where does blood pressure drop the most?', options: ['In the aorta', 'Across the arterioles', 'In the veins', 'In the heart'], answer: 1, why: 'Arterioles are narrow and muscular, so they hold back the most. That is what lets them control flow.' },
    { q: 'An arteriole narrows to half its radius. Its resistance becomes about…', options: ['2 times bigger', '4 times bigger', '16 times bigger', 'Half as big'], answer: 2, why: 'Poiseuille’s law: resistance goes with 1/r⁴, and 2⁴ = 16.' },
    { q: 'Why does blood move slowest in the capillaries?', options: ['They are uphill', 'Together they are about 1,000 times wider than the aorta', 'The heart stops pushing', 'Blood gets thicker there'], answer: 1, why: 'The same flow spread over a much bigger total cross-section means a much slower speed: good for exchange.' },
  ],
  reel: [
    { ms: 5600, caption: 'From 120 over 80 in the aorta, pressure falls to almost nothing by the time blood gets home.', set: { k: 1, mode: 'organ', labels: false, standT: 99 }, view: { pos: [0, 6.8, 15], target: [0, 5.6, 0] }, spin: 0 },
    { ms: 5400, caption: 'Squeeze an arteriole to half its width, and only a sixteenth as much blood gets through.', set: { mode: 'organ', labels: false, standT: 99 }, anim: { k: [1, 0.5] }, view: { pos: [-0.8, 8.9, 7.5], target: [-1.2, 8.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const strip = new THREE.Group(); strip.position.y = Y; root.add(strip);

    // ---- the strip: lumen and outer radius along x, blended at the joins
    const rin0 = (x, k) => {
      const u = (x - X0) / SEGW, i = clamp(Math.floor(u), 0, SEG.length - 1), f = u - i;
      const r = (j) => SEG[clamp(j, 0, SEG.length - 1)][7] * (j === 2 ? k : 1);
      if (f < 0.12 && i > 0) return lerp(r(i - 1), r(i), smooth(0.5 + f / 0.24));
      if (f > 0.88 && i < SEG.length - 1) return lerp(r(i), r(i + 1), smooth((f - 0.88) / 0.24));
      return r(i);
    };
    const rout0 = (x, k) => {
      const u = (x - X0) / SEGW, i = clamp(Math.floor(u), 0, SEG.length - 1), f = u - i;
      const r = (j) => { j = clamp(j, 0, SEG.length - 1); return SEG[j][7] + wallOf(j); };
      if (f < 0.12 && i > 0) return lerp(r(i - 1), r(i), smooth(0.5 + f / 0.24));
      if (f > 0.88 && i < SEG.length - 1) return lerp(r(i), r(i + 1), smooth((f - 0.88) / 0.24));
      return r(i);
    };
    const wallMat = SEG.map((s) => new THREE.MeshStandardMaterial({ color: s[6], roughness: 0.5, side: THREE.DoubleSide }));
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x5a1520, roughness: 0.6, side: THREE.DoubleSide });
    let meshes = [];
    const rebuild = (k) => {
      meshes.forEach((m) => { strip.remove(m); m.geometry.dispose(); }); meshes = [];
      SEG.forEach((s, i) => {
        const xa = x0Of(i), xb = xa + SEGW, N = 24, prIn = [], prOut = [];
        for (let j = 0; j <= N; j++) { const x = xa + (SEGW * j) / N; prIn.push([x, rin0(x, k)]); prOut.push([x, rout0(x, k)]); }
        const outer = latheX(prOut, wallMat[i], { seg: 40, phiStart: Math.PI / 2, phiLength: Math.PI });
        const inner = latheX(prIn, innerMat, { seg: 40, phiStart: Math.PI / 2, phiLength: Math.PI });
        // The cut faces (top and bottom) show the wall in section.
        const face = (sgn) => {
          const sh = new THREE.Shape();
          prOut.forEach(([x, r], j) => (j ? sh.lineTo(x, sgn * r) : sh.moveTo(x, sgn * r)));
          prIn.slice().reverse().forEach(([x, r]) => sh.lineTo(x, sgn * r));
          return new THREE.Mesh(new THREE.ShapeGeometry(sh), wallMat[i]);
        };
        meshes.push(outer, inner, face(1), face(-1));
      });
      meshes.forEach((m) => strip.add(m));
    };
    rebuild(1);
    // Valves in the vein: two flaps pointing towards the heart.
    const valveMat = new THREE.MeshStandardMaterial({ color: 0xc8d4ff, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    [0.35, 0.75].forEach((f) => {
      const x = x0Of(5) + SEGW * f, r = SEG[5][7];
      [1, -1].forEach((sg) => { const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.08, r * 0.9), valveMat); flap.position.set(x, sg * r * 0.5, -0.1); flap.rotation.z = sg * 0.6; strip.add(flap); });
    });

    // ---- blood cells moving: speed follows flow ÷ total area (log-scaled so all are visible)
    const N = 260, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), M.glow(0xffffff), N);
    dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dots.frustumCulled = false; strip.add(dots);
    const xs = Float32Array.from({ length: N }, (_, i) => X0 + (i / N) * SEG.length * SEGW);
    const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) - 0.5; };
    const jy = Float32Array.from({ length: N }, (_, i) => hash(i)), jz = Float32Array.from({ length: N }, (_, i) => hash(i + 500));
    const o = new THREE.Object3D(), cA = new THREE.Color(0xff3b4a), cB = new THREE.Color(0x4f7bff), cc = new THREE.Color();

    // ---- boards: pressure chart and cross-sections
    const st = { P: solve(1, 'organ').P, wave: 0 };
    const chart = canvasTexture(1400, 380, (g, w, h) => drawChart(g, w, h, st));
    const cb = board(chart, SEG.length * SEGW + 1.2, (SEG.length * SEGW + 1.2) * 380 / 1400);
    cb.position.set(0, 5.15, 0); root.add(cb);
    const secs = canvasTexture(1400, 320, drawSections);
    const sb = board(secs, SEG.length * SEGW + 1.2, (SEG.length * SEGW + 1.2) * 320 / 1400);
    sb.position.set(0, 1.35, 0.5); sb.rotation.x = -0.3; root.add(sb);

    const labs = SEG.map((s, i) => tint(stage.label(s[1], [x0Of(i) + SEGW / 2, Y + 1.35, 0], root), i < 3 ? 'red' : i === 3 ? 'purple' : 'blue'));
    const baroL = tint(stage.label('', [x0Of(5), Y + 2.1, 0], root), 'side');

    let sol = solve(1, 'organ'), lastK = 1, t = 0, beatPh = 0, hr = 70, kEff = 1, mapNow = MAP0, acc = 0;
    const fit = fitNarrow(stage, { pos: [0, 7.6, 24], target: [0, 6.6, 0] });
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        // Baroreflex after standing: pressure dips, receptors fire less, heart speeds, arterioles tighten.
        s.standT = Math.min(99, (s.standT ?? 99) + dt);
        const T = s.standT, dip = T < 40 ? -22 * (1 - Math.exp(-T / 0.6)) * Math.exp(-T / 2.2) : 0;
        const reflex = T < 40 ? smooth(clamp(T / 3, 0, 1)) * Math.exp(-Math.max(0, T - 12) / 8) : 0;
        hr = Math.round(70 + 22 * reflex);
        kEff = s.k * (1 - 0.06 * reflex);
        sol = solve(kEff, s.mode);
        const standing = T < 40;
        mapNow = sol.map + (standing ? dip + 20 * reflex * (1 - Math.exp(-T / 2.2)) * 0.9 : 0);
        if (standing) sol = { ...sol, P: sol.P.map((p, i) => (i < 3 ? p + (mapNow - sol.map) * (1 - i / 3) : p)) };
        if (Math.abs(kEff - lastK) > 0.004) { rebuild(kEff); lastK = kEff; }
        beatPh = (beatPh + dt * hr / 60) % 1;
        st.P = sol.P; st.wave = Math.cos(beatPh * Math.PI * 2) * 0.9;
        acc += dt; if (acc > 1 / 15) { acc = 0; chart.redraw(); }
        // Move the cells.
        for (let i = 0; i < N; i++) {
          const u = (xs[i] - X0) / SEGW, si = clamp(Math.floor(u), 0, SEG.length - 1);
          const area = SEG[si][4], vReal = (83 * sol.Q) / area;                   // cm/s: 83 mL/s ÷ area
          const v = 0.15 + 0.55 * Math.log10(1 + vReal * 30) * (si === 2 ? Math.min(1.3, sol.Q ** 0.35) : 1);
          const pulse = si < 3 ? 1 + 0.6 * Math.max(0, Math.cos(beatPh * Math.PI * 2)) : 1;
          xs[i] += v * pulse * dt * (si === 3 ? Math.max(0.05, sol.Q) : 1);
          if (xs[i] > X0 + SEG.length * SEGW) xs[i] = X0;
          const r = rin0(xs[i], kEff) * 0.8;
          o.position.set(xs[i], jy[i] * r * 2, jz[i] * r * 1.2 - 0.05); o.updateMatrix(); dots.setMatrixAt(i, o.matrix);
          const f = clamp((xs[i] - x0Of(3)) / SEGW, 0, 1);
          dots.setColorAt(i, cc.copy(cA).lerp(cB, f));
        }
        dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
        const narrow = fit();
        const on = s.labels && !inReel();
        labs.forEach((l) => { l.visible = on && !narrow; });
        baroL.visible = on && standing;
        baroL.element.innerHTML = T < 3 ? 'Pressure dips: baroreceptors fire less' : T < 20 ? 'Brainstem: heart faster, arterioles tighter' : 'Back to normal';
        sb.visible = !narrow;
      },
      readout: (s) => {
        const sys = Math.round(mapNow + PP * 2 / 3), dia = Math.round(mapNow - PP / 3);
        const flow = Math.round(sol.Q * 100);
        return `<div class="big">${sys}/${dia} mmHg in the arteries</div>
          <div class="row"><span>Flow through ${s.mode === 'organ' ? 'this organ' : 'the body'}</span><b>${flow}% of normal</b></div>
          <div class="row"><span>Arteriole width · resistance</span><b>${Math.round(kEff * 100)}% · ×${sol.res >= 10 ? Math.round(sol.res) : sol.res.toFixed(2)}</b></div>
          <div class="row"><span>Capillary pressure</span><b>${Math.round(sol.P[3])} → ${Math.round(sol.P[4])} mmHg</b></div>
          <div class="row"><span>Heart rate</span><b>${hr} per minute</b></div>
          <small>${s.standT < 40 ? 'Standing up: blood pools in the legs, pressure dips, and the baroreflex fixes it in seconds.' : s.mode === 'body' ? 'Narrow every arteriole and the heart must push harder: the pressure rises.' : 'Narrow one organ’s arterioles and the rest of the body keeps the pressure steady: less blood gets through.'}</small>`;
      },
    });
  },
};
