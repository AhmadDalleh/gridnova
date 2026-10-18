import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 4,
  id: 'system',
  title: 'The system',
  anchor: { x: 860, y: 380, size: 300 },
});
