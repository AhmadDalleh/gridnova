import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 2,
  id: 'pressure',
  title: 'The pressure',
  anchor: { x: 1500, y: 160, size: 120 },
});
