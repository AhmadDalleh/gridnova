import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 1,
  id: 'proposition',
  title: 'The proposition',
  anchor: { x: 1150, y: 280, size: 520 },
});
