import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 9,
  id: 'decision',
  title: 'Roadmap & decision',
  anchor: { x: 1250, y: 380, size: 480 },
});
