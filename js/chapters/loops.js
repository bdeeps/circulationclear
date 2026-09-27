// Chapter 2: the double circulation. One red blood cell goes right heart → lungs → left heart →
// an organ → back to the right heart, and the readout follows its oxygen saturation. The activity
// slider moves the body from resting to running hard, and the board shows where each minute's
// blood goes (rest vs exercise redistribution).
// Timing of one lap (Guyton & Hall, 14th ed., ch. 14, 20, 39): the mean lap time is blood volume ÷
// cardiac output, about 5 L ÷ 5 L/min = 1 minute at rest. How long blood spends in each part follows
// how much of the blood sits there: heart 7%, lungs 9%, systemic arteries 13%, arterioles and
// capillaries 7%, veins 64%. So of 60 s: heart about 4 s, lungs about 5.4 s (about 0.8 s of it in
// a lung capillary, where haemoglobin fills within the first third, ch. 40), arteries about 8 s,
// arterioles and capillaries about 4 s, veins about 38 s.
// Oxygen: arterial saturation about 98%; mixed venous about 75% at rest, from Fick's principle
// (see circ.js); organ venous saturations from arteriovenous O2 differences (Ganong's table).
// Blood flow shares: Guyton table 17-1 at rest; Chapman & Mitchell (1965) for heavy exercise.
import { THREE, M, clamp, canvasTexture } from '../kit.js';
import { makeBody, tint, fitNarrow, compactReadout, inReel, board, rrect, pathOf, smoothPts, wiggle, lineTo, BEDS, HEART, ORG, TREE, REF, organFlows, cardiacOutput, heartRate, mixedVenousSat, organVenousSat, satColor, rbcGeometry, gradientTube } from '../circ.js';

const V = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p));
// Which vessels and bed each destination uses, and which organ table row it belongs to.
const DEST = {
  brain: { name: 'the brain', art: 'lCarotid', bed: 'brain', vein: 'lJug', organ: 'brain', sat: 'brain' },
  arm: { name: 'the right hand', art: 'rArmA', bed: 'handR', vein: 'rArmV', organ: 'muscle', sat: 'arm' },
  gut: { name: 'the gut, then the liver', art: 'gutA', bed: 'gut', vein: 'hepV', organ: 'gut', sat: 'gut' },
  kidney: { name: 'a kidney', art: 'renLA', bed: 'kidL', vein: 'renLV', organ: 'kidney', sat: 'kidney' },
  leg: { name: 'the left leg', art: 'lLegA', bed: 'legL', vein: 'lLegV', organ: 'muscle', sat: 'muscle' },
};
const WHERE = { heartR: 'right side of the heart', pa: 'pulmonary artery, to the lungs', lung: 'lung capillaries: picking up O₂', pv: 'pulmonary vein, back to the heart', heartL: 'left side of the heart', art: 'arteries, out to the body', bed: 'capillaries: giving O₂ away', portal: 'portal vein: gut to liver', bed2: 'liver capillaries', vein: 'veins, heading home' };

// Build the lap as pieces: { kind, pts, sec } with seconds at rest.
function lap(destKey) {
  const d = DEST[destKey], b = BEDS[d.bed];
  const out = [];
  const add = (kind, pts, sec) => out.push({ kind, pts: pts.map(V), sec });
  add('heartR', [HEART.ra, HEART.rv, TREE.pTrunk.pts[0]], 2.1);
  add('pa', lineTo('rPA'), 1.5);
  add('lung', smoothPts(wiggle(TREE.rPA.pts.at(-1), ORG.lungR, TREE.rPV.pts.at(-1), 0.5, 3), 30), 0.8);
  add('pv', lineTo('rPV').reverse(), 3.1);
  add('heartL', [HEART.la, HEART.lv, TREE.aorta.pts[0]], 2.1);
  add('art', lineTo(d.art), 7.8);
  if (destKey === 'gut') {
    add('bed', smoothPts(wiggle(TREE.gutA.pts.at(-1), ORG.gut, TREE.portal.pts[0], 0.55, 7), 30), 2.1);
    add('portal', TREE.portal.pts, 3.0);
    add('bed2', smoothPts(wiggle(TREE.portal.pts.at(-1), ORG.liver, TREE.hepV.pts.at(-1), 0.35, 9), 30), 2.1);
    add('vein', [...lineTo(d.vein).reverse(), HEART.ra], 35.4);
  } else {
    add('bed', smoothPts(wiggle(TREE[d.art].pts.at(-1), b.c, TREE[d.vein].pts.at(-1), b.spread, 5), 30), 4.2);
    add('vein', [...lineTo(d.vein).reverse(), HEART.ra], 38.4);
  }
  return out;
}

function drawBoard(g, w, h, st) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.9)'; rrect(g, 0, 0, w, h, 22); g.fill();
  g.fillStyle = '#e8eef8'; g.font = 'bold 34px sans-serif'; g.fillText('Where each minute of blood goes', 28, 52);
  g.fillStyle = 'rgba(232,238,248,.7)'; g.font = '26px sans-serif';
  g.fillText(`Heart pumps ${st.co.toFixed(1)} L a minute, ${st.hr} beats a minute`, 28, 92);
  const rows = st.flows, total = rows.reduce((a, r) => a + r.mL, 0), top = 124, rowH = (h - top - 16) / rows.length, L = 250, R = w - 150;
  rows.forEach((r, i) => {
    const y = top + i * rowH, share = r.mL / total;
    g.fillStyle = r.key === st.hot ? '#ffd166' : 'rgba(255,255,255,.88)'; g.font = (r.key === st.hot ? 'bold ' : '') + '27px sans-serif'; g.fillText(r.name, 28, y + rowH * 0.64);
    g.fillStyle = 'rgba(255,255,255,.07)'; rrect(g, L, y + rowH * 0.18, R - L, rowH * 0.64, 8); g.fill();
    g.fillStyle = r.col; rrect(g, L, y + rowH * 0.18, Math.max(8, (R - L) * share), rowH * 0.64, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 25px sans-serif';
    g.fillText(Math.round(share * 100) + '%', R + 12, y + rowH * 0.64);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '21px sans-serif';
    g.fillText(r.mL >= 1000 ? (r.mL / 1000).toFixed(1) + ' L' : Math.round(r.mL / 10) * 10 + ' mL', R + 72, y + rowH * 0.64);
  });
}

export default {
  id: 'loops',
  short: 'Two loops',
  title: 'Two loops, one lap a minute',
  subtitle: 'Follow one red blood cell to the lungs, back to the heart, out to an organ and home.',
  view: { pos: [-2.8, 10.0, 20], target: [-4.6, 9.0, 0] },
  learn: `<p>Your blood goes round <b>two loops</b>, and passes through the heart once for each. That is why it is called a <b>double circulation</b>.</p>
    <p>In the <b>pulmonary loop</b>, the right side of the heart pumps oxygen-poor blood through the <b>pulmonary artery</b> to the lungs. In the lung capillaries, next to the air sacs, it gives up carbon dioxide and fills up with oxygen in less than a second. It returns to the left side of the heart about <b>98% full</b>. (How the lungs do it is in LungsClear.)</p>
    <p>In the <b>systemic loop</b>, the left side pumps it through the <b>aorta</b> to an organ. In the organ's capillaries it hands over oxygen and picks up waste, then the veins carry it back. At rest, blood returning to the heart is still about <b>75% full</b>: a reserve for when you need it. Blood from the brain comes back about 67% full, blood from the kidneys about 91%, because they take very different amounts.</p>
    <p>You have about <b>5 litres</b> of blood and at rest the heart pumps about <b>5 litres a minute</b>, so an average lap takes <b>about a minute</b>. Most of that time is spent slowly drifting back through the <b>veins</b>, which hold about <b>two thirds</b> of your blood.</p>
    <p>When you run, the heart can pump <b>four or five times</b> as much. Small arteries in the working muscles open wide while those to the gut and kidneys narrow, so muscles go from about a sixth of the flow to over three quarters.</p>
    <p class="tip"><b>Try it:</b> send the cell to the brain, then to a kidney, and compare how full it comes back. Then drag the slider to running and watch the bars swap places.</p>`,
  terms: [
    { t: 'Double circulation', d: 'Blood passes through the heart twice per lap: once for the lungs, once for the body.' },
    { t: 'Pulmonary loop', d: 'Right heart → lungs → left heart. Picks up oxygen, drops carbon dioxide.' },
    { t: 'Systemic loop', d: 'Left heart → body → right heart. Delivers oxygen and food to the organs.' },
    { t: 'Cardiac output', d: 'How much blood the heart pumps each minute: about 5 L at rest, up to about 20–25 L in hard exercise.' },
    { t: 'Oxygen saturation', d: 'How full of oxygen the haemoglobin is: about 98% in arteries, about 75% in mixed venous blood at rest.' },
  ],
  defaults: { dest: 'leg', activity: 0, speed: 5, labels: true },
  controls: [
    { key: 'dest', type: 'seg', label: 'Send the cell to', options: [{ v: 'brain', label: 'Brain' }, { v: 'arm', label: 'Hand' }, { v: 'gut', label: 'Gut' }, { v: 'kidney', label: 'Kidney' }, { v: 'leg', label: 'Leg' }], fmt: (v) => DEST[v].name },
    { key: 'activity', type: 'range', label: 'What you are doing', min: 0, max: 1, step: 0.01, ends: ['resting', 'running hard'], fmt: (v) => (v < 0.12 ? 'resting' : v < 0.4 ? 'walking' : v < 0.72 ? 'jogging' : 'running hard') },
    { key: 'speed', type: 'seg', label: 'Playback speed', options: [{ v: 1, label: 'Real time' }, { v: 5, label: '5×' }, { v: 20, label: '20×' }], fmt: (v) => (v === 1 ? 'as in life' : v + '× faster than life') },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Why is it called a double circulation?', options: ['There are two hearts', 'Blood passes through the heart twice per lap: once for the lungs, once for the body', 'Blood goes round twice as fast', 'Arteries and veins are doubled'], answer: 1, why: 'Right heart to the lungs and back to the left heart, then left heart to the body and back to the right heart.' },
    { q: 'At rest, blood coming back to the heart is about how full of oxygen?', options: ['0%', 'About 25%', 'About 75%', '100%'], answer: 2, why: 'The body takes only about a quarter of the oxygen at rest. The rest is a reserve for exercise.' },
    { q: 'When you run hard, blood flow to your gut…', options: ['Rises a lot', 'Drops, as blood is sent to the muscles', 'Stops completely', 'Stays exactly the same'], answer: 1, why: 'Small arteries to the gut and kidneys narrow while those in the muscles open wide.' },
  ],
  reel: [
    { ms: 5800, caption: 'Blood makes two loops: right heart to the lungs, then left heart out to the body.', set: { dest: 'leg', activity: 0, speed: 20, labels: false }, view: { pos: [0.3, 10.5, 23], target: [0.3, 9.4, 0] }, spin: 0 },
    { ms: 5400, caption: 'Run, and the heart pumps four times more, and most of it floods your muscles.', set: { dest: 'leg', speed: 20, labels: false }, anim: { activity: [0, 1] }, view: { pos: [-3.0, 10.0, 20], target: [-4.6, 9.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { labels: false, lymph: false });
    root.add(body.root);
    // Dim the rest of the network so the route stands out.
    Object.values(body.mats).forEach((m) => { m.transparent = true; m.opacity = 0.28; m.depthWrite = false; m.emissiveIntensity = 0.1; });
    body.G.beds.children.forEach((c) => { if (c.material) { c.material.opacity = 0.3; } });
    body.flow.visible(false);

    const routeG = new THREE.Group(); root.add(routeG);
    let route = null, pieces = null, destKey = null;
    const buildRoute = (key) => {
      routeG.children.slice().forEach((c) => { routeG.remove(c); c.geometry?.dispose(); c.material?.dispose(); });
      pieces = lap(key);
      const all = [], marks = [];
      pieces.forEach((p) => { marks.push(all.length); all.push(...(all.length ? p.pts.slice(1) : p.pts)); });
      route = pathOf(all);
      pieces.forEach((p, i) => { p.u0 = route.uAt(marks[i]); p.u1 = i + 1 < pieces.length ? route.uAt(marks[i + 1]) : 1; });
      destKey = key;
    };
    const tubeCols = [];
    const drawRouteTubes = (k) => {
      routeG.children.slice().forEach((c) => { routeG.remove(c); c.geometry?.dispose(); c.material?.dispose(); });
      tubeCols.length = 0;
      pieces.forEach((p) => {
        const s0 = satAt(p, 0, k), s1 = satAt(p, 1, k);
        const pts = p.pts.length > 2 ? smoothPts(p.pts, p.pts.length * 6) : p.pts;
        const t = gradientTube(pts, p.kind === 'bed' || p.kind === 'bed2' || p.kind === 'lung' ? 0.035 : 0.075, satColor(s0).getHex(), satColor(s1).getHex(), 1, 40);
        t.material.emissiveIntensity = 0.8; t.material.emissive.set(0x331018);
        routeG.add(t);
      });
    };
    // O2 saturation (0–1) at fraction f through a piece.
    const satAt = (p, f, k) => {
      const d = DEST[destKey], sv = mixedVenousSat(k), sa = REF.sao2 / 100, so = organVenousSat(d.sat, k);
      switch (p.kind) {
        case 'heartR': case 'pa': return sv;
        case 'lung': return f < 0.35 ? sv + (sa - sv) * (f / 0.35) : sa;
        case 'pv': case 'heartL': case 'art': return sa;
        case 'bed': return destKey === 'gut' ? sa + (organVenousSat('gut', k) - sa) * f * 0.6 : sa + (so - sa) * clamp(f * 1.1, 0, 1);
        case 'portal': return sa + (organVenousSat('gut', k) - sa) * 0.6;
        case 'bed2': return sa + (organVenousSat('gut', k) - sa) * (0.6 + 0.4 * f);
        case 'vein': return f < 0.75 ? so : so + (sv - so) * ((f - 0.75) / 0.25);
        default: return sa;
      }
    };

    // The red blood cell (drawn about 300,000 times too big) and a ring to find it.
    const cell = new THREE.Mesh(rbcGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0xff3b4a, roughness: 0.35, emissive: 0x440008, emissiveIntensity: 0.6 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 40), M.glow(0xffd166));
    root.add(cell, ring);
    const cellL = tint(stage.label('', [0, 0.65, 0], cell), 'gold');

    const labs = [
      tint(stage.label('Pulmonary loop: lungs and back', [3.1, 14.2, 0], root), 'blue'),
      tint(stage.label('Systemic loop: out to the body', [2.9, 9.8, 0], root), 'red'),
    ];
    const destL = tint(stage.label('', [0, 0, 0.6], root), 'gold');

    const st = { flows: organFlows(0), co: 5, hr: 70, hot: 'muscle' };
    const ct = canvasTexture(900, 620, (g, w, h) => drawBoard(g, w, h, st));
    const bd = board(ct, 10.6, 7.3); bd.position.set(-10.2, 4.3, 0); bd.rotation.y = 0.14; root.add(bd);

    let u = 0.02, lastK = -1, acc = 0, lapT = 0, lapSec = 60, sat = 0.75, where = '', lapDone = 0;
    const p = new THREE.Vector3(), q = new THREE.Vector3(), col = new THREE.Color();
    const fit = fitNarrow(stage, { pos: [0.3, 10.0, 25], target: [-1.2, 8.6, 0] });
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const k = s.activity;
        if (s.dest !== destKey) { buildRoute(s.dest); lastK = -1; u = 0.02; lapT = 0; }
        if (Math.abs(k - lastK) > 0.04) { drawRouteTubes(k); lastK = k; }
        const co = cardiacOutput(k);
        lapSec = (REF.bloodL / co) * 60;
        // Advance through the pieces: each piece's time scales with the whole lap.
        const pc = pieces.find((x) => u >= x.u0 && u < x.u1) || pieces[0];
        const secHere = pc.sec * (lapSec / 60);
        const du = ((pc.u1 - pc.u0) / secHere) * dt * s.speed;
        u += du; lapT += dt * s.speed;
        if (u >= 1) { u -= 1; lapDone = lapT; lapT = 0; }
        const pc2 = pieces.find((x) => u >= x.u0 && u < x.u1) || pieces[0];
        const f = (u - pc2.u0) / Math.max(1e-6, pc2.u1 - pc2.u0);
        sat = satAt(pc2, f, k); where = WHERE[pc2.kind];
        route.at(u, p); route.at(Math.min(1, u + 0.002), q);
        cell.position.copy(p); ring.position.copy(p); ring.lookAt(stage.camera.position);
        cell.lookAt(stage.camera.position); cell.rotateX(Math.PI / 2 + Math.sin(time * 3) * 0.5);
        cell.material.color.copy(satColor(sat, col));
        cellL.element.innerHTML = `<b>${Math.round(sat * 100)}% O₂</b>`;
        cellL.visible = s.labels && !inReel();
        // Board and labels.
        acc += dt;
        if (acc > 0.15) {
          acc = 0;
          st.flows = organFlows(k); st.co = co; st.hr = heartRate(k); st.hot = DEST[s.dest].organ;
          ct.redraw();
        }
        const narrow = fit();
        const d = DEST[s.dest], dp = BEDS[d.bed].c;
        destL.position.set(dp[0] + (dp[0] >= 0 ? 1.6 : -1.6), dp[1] + 0.3, dp[2] + 0.5);
        destL.element.innerHTML = s.dest === 'gut' ? 'Gut, then liver' : d.name[0].toUpperCase() + d.name.slice(1);
        [...labs, destL].forEach((l) => { l.visible = s.labels && !narrow && !inReel(); });
        bd.visible = !narrow;
      },
      readout: (s) => `<div class="big">${Math.round(sat * 100)}% full of oxygen</div>
        <div class="row"><span>Your cell is in the</span><b>${where}</b></div>
        <div class="row"><span>This lap so far</span><b>${Math.round(lapT)} s of real time</b></div>
        <div class="row"><span>Average lap now</span><b>about ${lapSec >= 50 ? '1 minute' : Math.round(lapSec) + ' s'}</b></div>
        <div class="row"><span>O₂ in arteries · veins</span><b>${REF.sao2}% · ${Math.round(mixedVenousSat(s.activity) * 100)}%</b></div>
        <small>${lapDone ? `Last lap took ${Math.round(lapDone)} s. ` : ''}Shown ${s.speed === 1 ? 'in real time' : s.speed + '× faster than life'}.</small>`,
    });
  },
};
