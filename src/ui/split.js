// Split a text node's words into masked spans so each word can rise out of its own mask (kinetic typography).
// Returns the inner `.w` elements in reading order. The visible text (and accessible name) is unchanged.
export function splitWords(node) {
  const words = node.textContent.trim().split(/\s+/);
  node.textContent = '';
  const out = [];
  words.forEach((word, i) => {
    if (i) node.append(' ');
    const mask = document.createElement('span');
    mask.className = 'w-mask';
    const inner = document.createElement('span');
    inner.className = 'w';
    inner.textContent = word;
    mask.append(inner);
    node.append(mask);
    out.push(inner);
  });
  return out;
}
