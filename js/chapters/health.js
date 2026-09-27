// Chapter 6: when the circulation goes wrong, and how to look after it. A ghosted body shows where
// each problem happens; an inset shows what it looks like up close. Always "see a doctor": no
// diagnosis or dosing advice.
// Sources:
//  - WHO, "Global report on hypertension" (19 Sept 2023): about 1 in 3 adults worldwide; cases
//    doubled from about 650 million (1990) to 1.3 billion (2019); nearly half don't know; about 1 in
//    5 have it controlled. NCD-RisC, Lancet 398:957 (2021): 648 million → 1.28 billion, ages 30–79.
//  - India: NFHS-5 (2019–21) national fact sheet: raised blood pressure (≥140/90 or on medicine) in
//    24.0% of men and 21.3% of women aged 15+, so about 1 in 4 adults; WHO India country profile
//    (2023): about 188 million adults aged 30–79 (31%). ICMR-INDIAB-17 (Lancet Diabetes Endocrinol,
//    2023): 35.5% of adults 20+.
//  - Hypertension threshold 140/90 mmHg (WHO; Indian guidelines); normal below 120/80 (AHA).
//  - Coronary narrowing: resting flow is kept up by downstream arterioles until the diameter is
//    narrowed by about 85–90%, and flow on exercise starts to be limited at about 50–70% (Gould &
//    Lipscomb, Am J Cardiol 33:87, 1974). The narrowed segment on its own passes flow ∝ r⁴.
//  - Heart attack and stroke warning signs: NHLBI "Heart attack"; FAST (face, arm, speech, time),
//    NHS/WHO. India emergency numbers: 112 (all emergencies) and 108 (ambulance, most states).
//  - Anaemia, NFHS-5 (2019–21): 57.0% of women 15–49, 67.1% of children 6–59 months, 25.0% of men
//    15–49 (capillary blood; not directly comparable with venous surveys).
//  - Blood donation in India (NBTC, "Guidelines for blood donor selection and blood donor referral",
//    2017): age 18–65, weight at least 45 kg (350 mL) or 55 kg (450 mL), haemoglobin at least 12.5
//    g/dL, at least 3 months between whole-blood donations for men and 4 months for women. India
//    collected about 14.6 million units in 2024 (Khobragade et al., Asian J Transfus Sci, 2026,
//    MoHFW authors). The body replaces the plasma within about a day and the red cells within about
//    4–6 weeks (American Red Cross).
//  - Cardiovascular disease causes about 19 million deaths a year worldwide (GBD 2023, JACC 2025).
import { THREE, M, clamp, lerp, smooth, tube } from '../kit.js';
import { makeBody, tint, fitNarrow, compactReadout, inReel, rbcGeometry, rnd, TREE, HEART, ORG, smoothPts } from '../circ.js';

const COND = {
  bp: { label: 'High BP', title: 'High blood pressure' },
  athero: { label: 'Clogged arteries', title: 'Atherosclerosis: clogged arteries' },
  attack: { label: 'Heart attack, stroke', title: 'Heart attack and stroke' },
  varicose: { label: 'Varicose veins', title: 'Varicose veins' },
  anaemia: { label: 'Anaemia', title: 'Anaemia: too little haemoglobin' },
  donate: { label: 'Give blood', title: 'Giving blood' },
};
const IN = [-7.4, 5.2, 0];            // where the close-up sits

// A short piece of artery seen end-on: wall ring, inner lining, optional plaque crescent and clot.
function arteryEnd() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8646f, roughness: 0.5, side: THREE.DoubleSide });
  const R = 2.0, len = 1.6;
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 64, 1, true), wallMat); outer.rotation.x = Math.PI / 2; g.add(outer);
  const face = new THREE.Mesh(new THREE.RingGeometry(1.35, R, 64), wallMat); face.position.z = len / 2; g.add(face);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, len, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a1520, side: THREE.BackSide })); inner.rotation.x = Math.PI / 2; g.add(inner);
  const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xf2d27a, roughness: 0.7 });
  let plaque = null;
  const setPlaque = (n) => {                                  // n: fraction of the diameter narrowed
    if (plaque) { g.remove(plaque); plaque.geometry.dispose(); }
    if (n < 0.01) { plaque = null; return; }
    // The open lumen: a circle of radius r = 1.35 × (1 − n), pushed to one side by the plaque.
    const r = 1.35 * (1 - n), off = 1.35 - r;
    const sh = new THREE.Shape(); sh.absarc(0, 0, 1.35, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, off - 0.0001, Math.max(0.02, r), 0, Math.PI * 2, true); sh.holes.push(hole);
    plaque = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: len * 0.98, bevelEnabled: false, curveSegments: 48 }), plaqueMat);
    plaque.position.z = -len * 0.49; g.add(plaque);
  };
  const clot = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x5a0a14, roughness: 0.8 }));
  clot.position.z = len / 2 + 0.01; g.add(clot);
  return { g, setPlaque, clot, face, outer, wallMat };
}

export default {
  id: 'health',
  short: 'Keeping it healthy',
  title: 'When the pipes and the blood go wrong',
  subtitle: 'High blood pressure, clogged arteries, heart attack and stroke, varicose veins, anaemia, and giving blood.',
  view: { pos: [-2.0, 9.6, 21.5], target: [-3.6, 8.4, 0] },
  learn: `<p>Most problems with the circulation build up quietly over years, so regular check-ups matter. This chapter explains them; it cannot tell you what is going on in your own body. For that, <b>see a doctor</b>.</p>
    <p><b>High blood pressure</b> (hypertension) means a reading that stays at <b>140/90 mmHg or more</b>. It usually causes no symptoms, yet it strains the heart, kidneys, brain and eyes. About <b>1 in 3 adults</b> worldwide has it, and nearly half don't know. In India, the NFHS-5 survey found raised blood pressure in about <b>1 in 4 adults</b>. A simple cuff check at a clinic is the only way to find out.</p>
    <p><b>Atherosclerosis</b> is fatty <b>plaque</b> building up inside artery walls, helped by high blood pressure, smoking, diabetes and high cholesterol. Because of Poiseuille's r⁴ rule a narrowing matters a lot, though small arteries downstream can open up and hide it until it is severe.</p>
    <p>If a plaque cracks, a <b>clot</b> can form on it and block the artery. In a coronary artery that is a <b>heart attack</b>: chest pain or pressure that may spread to the arm, jaw or back, with sweating or breathlessness. In the brain it is a <b>stroke</b>: think <b>FAST</b>, face drooping, arm weakness, speech trouble, time to call. Either way, call an ambulance at once (in India <b>112</b> or <b>108</b>): every minute counts.</p>
    <p><b>Varicose veins</b> are swollen, twisted veins, usually in the legs, where valves have stopped working. <b>Anaemia</b> means too little haemoglobin, so you feel tired and breathless; NFHS-5 found it in about <b>57% of Indian women</b> and <b>67% of young children</b>. Iron-rich food helps, and a doctor can test for it and find the cause.</p>
    <p>You can help others too. A healthy adult can <b>give blood</b>: in India, aged 18–65 and at least 45 kg. One donation of 350–450 mL is less than a tenth of your blood; the plasma is replaced in about a day and the red cells in a few weeks.</p>
    <p class="tip"><b>Try it:</b> pick each problem to see where it happens. For clogged arteries, drag the narrowing and watch how fast the flow through it falls.</p>`,
  terms: [
    { t: 'Hypertension', d: 'Blood pressure that stays at 140/90 mmHg or higher.' },
    { t: 'Atherosclerosis', d: 'Fatty plaque building up inside artery walls, narrowing and stiffening them.' },
    { t: 'Heart attack', d: 'Heart muscle starved of blood because a coronary artery is blocked, usually by a clot on a plaque.' },
    { t: 'Stroke', d: 'Brain cells starved of blood by a blocked or burst artery in the brain. Think FAST.' },
    { t: 'Varicose veins', d: 'Swollen, twisted veins, usually in the legs, where the valves leak.' },
    { t: 'Anaemia', d: 'Too little haemoglobin or too few red cells, so the blood carries less oxygen.' },
  ],
  defaults: { cond: 'bp', narrow: 0.5, labels: true },
  controls: [
    { key: 'cond', type: 'seg', label: 'Show', options: Object.entries(COND).map(([v, c]) => ({ v, label: c.label })), fmt: (v) => COND[v].title },
    { key: 'narrow', type: 'range', label: 'Artery narrowing (clogged arteries)', min: 0, max: 0.95, step: 0.01, ends: ['clear', 'nearly blocked'], fmt: (v) => Math.round(v * 100) + '% of its width' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'What is the usual sign of high blood pressure?', options: ['A headache every day', 'Usually none: you only find out by measuring', 'A red face', 'Nosebleeds'], answer: 1, why: 'It is often called a silent condition. Nearly half of the people who have it don’t know, so get it checked.' },
    { q: 'Someone’s face droops on one side and their speech is slurred. What should you do?', options: ['Let them sleep it off', 'Call an ambulance straight away', 'Give them water', 'Wait an hour and see'], answer: 1, why: 'These are FAST signs of a stroke. Treatment works best in the first hours, so call for help immediately.' },
    { q: 'Halving an artery’s radius cuts the flow through that narrowed piece to about…', options: ['One half', 'One quarter', 'One sixteenth', 'It doesn’t change'], answer: 2, why: 'Poiseuille’s law: flow goes with r⁴, and (1/2)⁴ = 1/16.' },
  ],
  reel: [
    { ms: 5400, caption: 'About 1 in 4 adults in India has high blood pressure, and most feel nothing. Get it checked.', set: { cond: 'bp', labels: false }, view: { pos: [-2.0, 9.6, 21.5], target: [-3.6, 8.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { labels: false, lymph: false });
    root.add(body.root);
    body.setXray(1);
    Object.values(body.mats).forEach((m) => { m.transparent = true; m.opacity = 0.55; m.depthWrite = false; });

    // Markers where each problem happens.
    const mk = (pos, col = 0xffd166) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false })); m.position.set(...pos); root.add(m); return m; };
    const mHeart = mk([HEART.c[0] + 0.3, HEART.c[1] + 0.1, HEART.c[2] + 0.3], 0xff5a6a);
    const mBrain = mk([0.35, 16.7, 0.2], 0xff5a6a);
    const mCarotid = mk([0.36, 15.2, 0.2]);
    const mLeg = mk([0.66, 4.8, 0.4], 0x8fb0ff);
    // A varicose saphenous vein: the same path, thicker and twisting.
    const vp = TREE.lSaph.pts.map((p) => new THREE.Vector3(...p));
    const vpts = smoothPts(vp, 80).map((p, i) => p.clone().add(new THREE.Vector3(Math.sin(i * 0.9) * 0.12, 0, Math.cos(i * 0.7) * 0.08)));
    const varicose = tube(vpts, 0.09, new THREE.MeshStandardMaterial({ color: 0x5a6cff, roughness: 0.4, emissive: 0x2233aa, emissiveIntensity: 0.4 }), false, 160);
    root.add(varicose);
    const skin0 = body.skinMat.color.clone();

    // ---- close-ups
    const inset = new THREE.Group(); inset.position.set(...IN); root.add(inset);
    const art = arteryEnd(); inset.add(art.g);
    // Varicose close-up: a healthy vein and a stretched, twisting one.
    const vg = new THREE.Group(); inset.add(vg);
    const healthy = tube([[-1.4, -3, 0], [-1.4, 3, 0]], 0.38, M.clear(0x7f9dff, 0.55), false, 20); vg.add(healthy);
    const twist = []; for (let i = 0; i <= 40; i++) { const y = -3 + i * 0.15; twist.push([1.4 + Math.sin(i * 0.5) * 0.45, y, Math.cos(i * 0.5) * 0.2]); }
    const bad = tube(twist, 0.62, M.clear(0x6a78e8, 0.6), false, 120); vg.add(bad);
    const leafM = new THREE.MeshBasicMaterial({ color: 0xeef2ff, side: THREE.DoubleSide });
    [-1.5, 0.5, 2.4].forEach((y) => { [1, -1].forEach((sx) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.5), leafM); l.position.set(-1.4 + sx * 0.18, y, 0.1); l.rotation.z = sx * 0.6; vg.add(l); }); });
    [-1.5, 0.5, 2.4].forEach((y) => { [1, -1].forEach((sx) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), leafM); l.position.set(1.4 + Math.sin((y + 3) / 0.15 * 0.5) * 0.45 + sx * 0.5, y, 0.1); l.rotation.z = sx * 0.1; vg.add(l); }); });
    // Anaemia close-up: a drop of blood, normal vs anaemic.
    const ag = new THREE.Group(); inset.add(ag);
    const rbcG = rbcGeometry(0.5, 6, 14);
    const drops = [-1.6, 1.6].map((x, j) => {
      const d = new THREE.Group(); d.position.x = x; ag.add(d);
      d.add(new THREE.Mesh(new THREE.CircleGeometry(1.45, 40), new THREE.MeshBasicMaterial({ color: 0xf2d27a, transparent: true, opacity: 0.2 })));
      const n = j ? 22 : 44, m = new THREE.InstancedMesh(rbcG, new THREE.MeshStandardMaterial({ color: j ? 0xe07a80 : 0xd8323c, roughness: 0.4 }), n);
      const o = new THREE.Object3D();
      for (let i = 0; i < n; i++) { const a = rnd(i + j * 50) * Math.PI * 2, r = Math.sqrt(rnd(i + 99 + j * 50)) * 1.2; o.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.2); o.rotation.set(Math.PI / 2 + rnd(i) * 0.8, rnd(i + 5), 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
      d.add(m); return d;
    });
    // Donation close-up: a blood bag filling to 350 mL.
    const dg = new THREE.Group(); inset.add(dg);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.5), M.clear(0xf6f6f8, 0.35)); dg.add(bag);
    const fillM = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 0.42), new THREE.MeshStandardMaterial({ color: 0x9a1020, roughness: 0.3 })); dg.add(fillM);
    const hose = tube([[0, 1.7, 0], [0, 2.4, 0], [1.2, 3.1, 0], [2.6, 2.8, 0]], 0.06, new THREE.MeshStandardMaterial({ color: 0x9a1020 }), false, 30); dg.add(hose);

    const insetL = tint(stage.label('', [0, -3.2, 0], inset), 'gold');
    const subL = [tint(stage.label('Healthy', [-1.6, 3.6, 0], inset), 'good'), tint(stage.label('', [1.6, 3.6, 0], inset), 'red')];
    const bodyL = tint(stage.label('', [2.6, 16.2, 0], root), 'pink');

    let t = 0, filled = 0, flowPct = 100;
    const fit = fitNarrow(stage, { pos: [0.3, 9.2, 25], target: [0, 9.0, 0] });
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const c = s.cond, pulse = 0.55 + 0.45 * Math.sin(t * 4);
        const on = s.labels && !inReel(), narrow = fit();
        // body highlights
        mHeart.visible = c === 'attack' || c === 'athero'; mBrain.visible = c === 'attack'; mCarotid.visible = c === 'athero'; mLeg.visible = c === 'varicose';
        [mHeart, mBrain, mCarotid, mLeg].forEach((m) => { m.scale.setScalar(0.8 + 0.5 * pulse); m.material.opacity = 0.35 + 0.5 * pulse; });
        varicose.visible = c === 'varicose';
        body.mats.a.emissiveIntensity = c === 'bp' ? 0.3 + 0.7 * pulse : 0.3;
        body.skinMat.color.copy(skin0);
        if (c === 'anaemia') body.skinMat.color.lerp(new THREE.Color(0xf4ece6), 0.7);
        body.flow.step(dt, c === 'bp' ? 1.6 : 1);
        // close-ups
        art.g.visible = c === 'bp' || c === 'athero' || c === 'attack';
        vg.visible = c === 'varicose'; ag.visible = c === 'anaemia'; dg.visible = c === 'donate';
        const n = c === 'athero' ? s.narrow : c === 'attack' ? 0.7 : 0;
        if (art.g.visible && Math.abs((art.g.userData.n ?? -1) - n) > 0.004) { art.setPlaque(n); art.g.userData.n = n; }
        // High blood pressure thickens and stiffens the wall over years.
        const thick = c === 'bp';
        art.face.geometry.dispose(); art.face.geometry = new THREE.RingGeometry(thick ? 1.2 : 1.35, 2.0, 64);
        art.clot.visible = c === 'attack';
        art.clot.scale.setScalar(1.35 * 0.3 + 0.001); art.clot.position.y = 1.35 * 0.7;
        flowPct = Math.round(100 * (1 - n) ** 4);
        art.g.rotation.y = Math.sin(t * 0.4) * 0.25;
        if (c === 'donate') { filled = Math.min(1, filled + dt * 0.12); } else filled = 0;
        fillM.scale.y = Math.max(0.01, 3.2 * filled); fillM.position.y = -1.6 + 1.6 * filled;
        insetL.element.innerHTML = {
          bp: 'Close-up: a thickened artery wall',
          athero: `Plaque: ${Math.round(n * 100)}% narrower, ${flowPct}% of the flow through it`,
          attack: 'A clot on a cracked plaque blocks the artery',
          varicose: 'Valves fail, the vein stretches and twists',
          anaemia: 'Fewer red cells in each drop',
          donate: `Blood bag: ${Math.round(350 * filled)} of 350 mL`,
        }[c];
        subL[1].element.innerHTML = c === 'varicose' ? 'Varicose' : 'Anaemia';
        subL.forEach((l) => { l.visible = on && (c === 'varicose' || c === 'anaemia'); });
        bodyL.element.innerHTML = { bp: 'Every artery feels it', athero: 'Common in heart and neck arteries', attack: 'Heart: heart attack. Brain: stroke.', varicose: 'Usually the long leg vein', anaemia: 'Paler skin, tiredness', donate: '350–450 mL from an arm vein' }[c];
        insetL.visible = on; bodyL.visible = on && !narrow;
        inset.visible = !narrow || inReel();
      },
      readout: (s) => {
        const c = s.cond;
        const rows = {
          bp: [['High blood pressure is', '140/90 mmHg or more'], ['Adults with it, worldwide', 'about 1 in 3'], ['Adults with it, India (NFHS-5)', 'about 1 in 4'], ['Who know they have it', 'only about half']],
          athero: [['Narrowed by', `${Math.round(s.narrow * 100)}% of the width`], ['Flow through that piece alone', `${flowPct}%`], ['Rest flow usually kept until', 'about 85–90% narrowing'], ['Risks', 'BP, smoking, diabetes, cholesterol']],
          attack: [['Heart attack signs', 'chest pain, pressure, sweating'], ['Stroke signs (FAST)', 'face, arm, speech: time!'], ['Emergency, India', 'call 112 or 108'], ['Deaths from heart and vessel disease', 'about 19 million a year']],
          varicose: [['What fails', 'the valves in leg veins'], ['Ankle vein pressure', 'stays high when walking'], ['Can help', 'walking, raising legs'], ['If painful or swollen', 'see a doctor']],
          anaemia: [['Women 15–49, India (NFHS-5)', '57%'], ['Children 6–59 months', '67%'], ['Men 15–49', '25%'], ['Common cause', 'too little iron']],
          donate: [['Age (India)', '18 to 65'], ['Weight', 'at least 45 kg'], ['Haemoglobin', 'at least 12.5 g/dL'], ['Gap between donations', '3 months (men), 4 (women)']],
        }[c];
        const note = { bp: 'It rarely causes symptoms. A cuff check is the only way to know; a doctor can explain your numbers.', athero: 'Flow ∝ r⁴ for the narrowed piece. Only a doctor can check your arteries.', attack: 'Don’t wait to see if it passes: call an ambulance at once.', varicose: 'Usually harmless, but see a doctor if a leg is painful, hot or swollen.', anaemia: 'Tiredness has many causes. A simple blood test at a clinic tells you.', donate: 'India collected about 1.46 crore units in 2024. One donation can help several patients.' }[c];
        return `<div class="big">${COND[c].title}</div>
          ${rows.map(([a, b]) => `<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}
          <small>${note}</small>`;
      },
    });
  },
};
