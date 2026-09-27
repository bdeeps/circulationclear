// Chapter 1: the whole network in a ghosted body. The aorta and its big branches, the venae cavae
// and the veins that feed them, the pulmonary arteries and veins, the portal vein, capillary beds
// in each organ, and the lymph. Explode pulls the arteries to one side and the veins to the other.
// Numbers:
//  - about 5 L of blood (7% of body weight, Guyton & Hall, 14th ed., ch. 14); resting cardiac
//    output about 5 L/min (ch. 20);
//  - about 10 billion capillaries with a total exchange surface of roughly 500–700 m² (Guyton &
//    Hall, ch. 16);
//  - the popular "100,000 km of blood vessels" traces back to August Krogh's 1922 estimate, scaled
//    from guinea-pig muscle to a very muscular 140 kg body; Poole et al., "August Krogh: muscle
//    capillary function and oxygen delivery", Comp Biochem Physiol A (2021) estimate about
//    9,000–19,000 km of capillaries, so we call 100,000 km an overestimate.
//  - capillaries are about 5–10 µm wide, just wide enough for one red cell (Guyton & Hall, ch. 16).
import { THREE } from '../kit.js';
import { makeBody, sideLabels, fitNarrow, compactReadout, inReel } from '../circ.js';
import { toast } from '../ui.js';

export default {
  id: 'anatomy',
  short: 'The whole network',
  title: 'A network in every part of you',
  subtitle: 'One pump, two kinds of pipes out and back, and a mesh of tiny tubes in between.',
  view: { pos: [-2.6, 9.6, 20], target: [-4.3, 8.7, 0] },
  learn: `<p>Your <b>circulatory system</b> is a delivery network. A pump, the <b>heart</b>, pushes about <b>5 litres</b> of blood round your body every minute, bringing oxygen and food to every cell and carrying waste away. We are facing the person, so their <b>right</b> side is on <b>your left</b>.</p>
    <p><b>Arteries</b> carry blood <b>away from</b> the heart. The biggest, the <b>aorta</b>, is about as wide as your thumb. It arches over the heart, sends branches up to the head and arms, and runs down in front of the spine to the gut, kidneys and legs.</p>
    <p><b>Veins</b> bring blood <b>back</b>. They join into two huge veins: the <b>superior vena cava</b> from the head and arms and the <b>inferior vena cava</b> from everything below. One odd vein, the <b>portal vein</b>, takes blood from your gut to the liver first, so food is checked before it reaches the rest of you.</p>
    <p>Between them, in every organ, is a mesh of <b>capillaries</b>, tubes so thin that red blood cells go through in single file. You have about <b>10 billion</b> of them. Laid end to end, your capillaries alone would stretch thousands of kilometres. (The famous figure of 100,000 km comes from a rough 1922 guess and is too big: newer estimates are about 9,000 to 19,000 km.)</p>
    <p>The thin green threads are the <b>lymph</b> vessels. They collect fluid that leaks out of capillaries and return it to the veins near your neck, passing through bean-shaped <b>lymph nodes</b> on the way. The heart itself has its own box: see HeartClear. Click it on the model.</p>
    <p class="tip"><b>Try it:</b> take it apart to see the artery tree and the vein tree side by side. Then find the one artery drawn in blue, and ask yourself why.</p>`,
  terms: [
    { t: 'Artery', d: 'A vessel that carries blood away from the heart. Thick, stretchy walls for high pressure.' },
    { t: 'Vein', d: 'A vessel that carries blood back to the heart. Thin walls, and valves in the limbs.' },
    { t: 'Capillary', d: 'The tiniest vessel, about one red blood cell wide, with a wall one cell thick.' },
    { t: 'Aorta', d: 'The biggest artery. It leaves the left side of the heart and feeds the whole body.' },
    { t: 'Vena cava', d: 'One of the two biggest veins, superior and inferior, that empty into the right side of the heart.' },
    { t: 'Portal vein', d: 'The vein that carries blood from the gut to the liver before it goes back to the heart.' },
    { t: 'Lymph', d: 'Clear fluid that leaks out of capillaries and is carried back to the blood by lymph vessels.' },
  ],
  defaults: { explode: 0, xray: true, flow: true, lymph: true, labels: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'arteries | veins'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray: see through the skin' },
    { key: 'flow', type: 'toggle', label: 'Show blood moving' },
    { key: 'lymph', type: 'toggle', label: 'Show lymph vessels' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'What makes a vessel an artery?', options: ['It carries oxygen-rich blood', 'It carries blood away from the heart', 'It is red', 'It is deep inside the body'], answer: 1, why: 'Direction decides. The pulmonary artery carries oxygen-poor blood, but away from the heart, so it is an artery.' },
    { q: 'Where does blood from your gut go first?', options: ['Straight to the heart', 'To the liver, through the portal vein', 'To the kidneys', 'To the lungs'], answer: 1, why: 'The portal vein takes it to the liver, which stores and checks what you absorbed before it reaches the rest of the body.' },
    { q: 'What do lymph vessels do?', options: ['Carry oxygen', 'Return fluid that leaked out of capillaries to the blood', 'Pump blood', 'Make urine'], answer: 1, why: 'A little fluid leaks out of capillaries all the time. Lymph vessels collect it and empty it into veins near the neck.' },
  ],
  reel: [
    { ms: 5200, caption: 'Your blood runs through a network that reaches almost every cell you have.', set: { explode: 0, xray: false, flow: true, lymph: true, labels: false }, view: { pos: [0.5, 10.5, 25], target: [0, 9.2, 0] }, spin: 0.5 },
    { ms: 5600, caption: 'Arteries carry blood away from the heart, veins bring it back, and capillaries join them.', set: { explode: 0, xray: true, flow: true, lymph: false, labels: false }, anim: { explode: [0, 1] }, view: { pos: [0.5, 10.5, 27], target: [0, 9.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage);
    root.add(body.root);
    const sides = sideLabels(stage, root, 2.6, 3.1, 1.4);
    stage.pickables.push(body.heart, body.halo);
    let xr = 1, lastToast = -9, t = 0;
    const fit = fitNarrow(stage, { pos: [0, 14.0, 22.5], target: [0, 13.4, 0] });
    return compactReadout(stage, {
      pick(o) {
        if ((o === body.heart || o === body.halo) && t - lastToast > 1) { lastToast = t; toast('The heart is the pump. <a href="/heartclear/">Open HeartClear</a> to see inside it.'); }
      },
      update(dt, s, time) {
        dt = Math.max(0, dt); t = time;
        xr += ((s.xray ? 1 : 0) - xr) * Math.min(1, dt * 5);
        body.setXray(xr);
        body.setExplode(s.explode);
        body.flow.visible(s.flow);
        if (s.flow) body.flow.step(dt);
        body.G.lymph.visible = s.lymph;
        // A heartbeat: the heart swells a little about 70 times a minute.
        const ph = (time * 70 / 60) % 1, beat = 1 + 0.07 * Math.exp(-((ph - 0.1) ** 2) / 0.004);
        body.heart.scale.set(0.42 * beat, 0.58 * beat, 0.38 * beat);
        body.halo.material.opacity = 0.08 + 0.1 * (beat - 1) / 0.07;
        const narrow = fit();
        body.showLabels(s.labels && !inReel(), narrow);
        body.labels.forEach((l) => { if (l.parent === body.G.lymph) l.visible = l.visible && s.lymph; });
        sides.forEach((l) => { l.visible = s.labels && !narrow; });
      },
      readout: (s) => `<div class="big">5 litres, round in a minute</div>
        <div class="row"><span>Blood in an adult</span><b>about 5 L</b></div>
        <div class="row"><span>Pumped per minute</span><b>about 5 L</b></div>
        <div class="row"><span>Capillaries</span><b>about 10 billion</b></div>
        <div class="row"><span>Widest · narrowest</span><b>2.5 cm · 0.008 mm</b></div>
        <small>${s.explode > 0.4 ? 'Left: arteries. Right: veins.' : 'Red: oxygen-rich. Blue: oxygen-poor.'}</small>`,
    });
  },
};
