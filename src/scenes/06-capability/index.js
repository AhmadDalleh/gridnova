import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 6,
  id: 'capability',
  title: 'Capability showcase',
  anchor: { x: 1700, y: 920, size: 110 },
});
