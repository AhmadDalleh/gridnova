import { ZONES } from './zones.js';

// The isometric campus, built as real CSS 3D: a ground plane in a perspective container, one box per zone.
// The "camera" is three numbers (tilt, spin, zoom) that we turn into ONE transform string, so the whole move
// is a single tween on a plain object and is easy to explain: flat and far -> tilted, rotated and close.
export const CAMERA_FLAT = { tilt: 0, spin: 0, zoom: 0.62 };
export const CAMERA_ISO = { tilt: 58, spin: -45, zoom: 0.82 };
export const PLANE = 900;                                   // ground plane edge, plane pixels
export const MAP_CENTER = { x: 730, y: 600 };               // where the plane's centre sits on the 1920x1080 stage

const FACES = ['top', 'n', 's', 'e', 'w'];

export function createCampus(rigEl) {
  const plane = rigEl.querySelector('.s3-plane');
  const blocks = new Map();

  ZONES.forEach((z) => {
    const blk = document.createElement('div');
    blk.className = 'blk';
    blk.dataset.zone = z.id;
    blk.dataset.kind = z.kind;
    blk.style.cssText = `left:${z.x}px; top:${z.y}px; width:${z.w}px; height:${z.h}px; --h:0px; --lift:0px;`;
    FACES.forEach((f) => {
      const face = document.createElement('i');
      face.className = `face ${f}`;
      blk.append(face);
    });
    plane.append(blk);
    blocks.set(z.id, blk);
  });

  return {
    plane,
    blocks,
    /** Apply a camera state. Order matters: tilt the plane, then spin it on its own axis. */
    setCamera({ tilt, spin, zoom }) {
      plane.style.transform = `rotateX(${tilt}deg) rotateZ(${spin}deg) scale(${zoom})`;
    },
    /** Set how far a block has risen (0..1 of its final height) and how far it is lifted by selection (px). */
    setRise(id, k) {
      const z = ZONES.find((x) => x.id === id);
      blocks.get(id).style.setProperty('--h', `${(z.rise * k).toFixed(2)}px`);
    },
    setLift(id, px) {
      blocks.get(id).style.setProperty('--lift', `${px.toFixed(2)}px`);
    },
    setSelected(id) {
      blocks.forEach((b, key) => b.classList.toggle('is-selected', key === id));
    },
  };
}

/** Screen position of each zone's top face in STAGE pixels, measured with the camera in its final pose. */
export function measureTops(stageEl, campus) {
  const box = stageEl.getBoundingClientRect();
  const scale = box.width / 1920;
  const out = {};
  campus.blocks.forEach((blk, id) => {
    const r = blk.querySelector('.top').getBoundingClientRect();
    out[id] = { x: (r.left + r.width / 2 - box.left) / scale, y: (r.top + r.height / 2 - box.top) / scale };
  });
  return out;
}
