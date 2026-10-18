import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 3,
  id: 'opportunity',
  title: 'The opportunity',
  anchor: { x: 960, y: 480, size: 160 },
});
