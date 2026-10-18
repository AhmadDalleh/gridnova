const NS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with attributes, optionally appended to `parent`. */
export function svgEl(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

const pt = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/** Polyline through (xs[i], ys[i]). */
export const linePath = (xs, ys) => xs.map((x, i) => `${i ? 'L' : 'M'}${pt(x, ys[i])}`).join(' ');

/** Closed area between a top and a bottom polyline sharing the same xs. */
export function areaPath(xs, top, bottom) {
  const down = xs.map((x, i) => `${i ? 'L' : 'M'}${pt(x, top[i])}`).join(' ');
  const back = xs.map((x, i) => `L${pt(x, bottom[i])}`).reverse().join(' ');
  return `${down} ${back} Z`;
}
