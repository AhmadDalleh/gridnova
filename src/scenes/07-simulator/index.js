import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 7,
  id: 'simulator',
  title: 'Explore the design',
  anchor: { x: 1450, y: 700, size: 200 },
});
