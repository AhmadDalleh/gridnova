import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 5,
  id: 'peak-event',
  title: 'A peak event',
  anchor: { x: 1700, y: 80, size: 110 },
});
