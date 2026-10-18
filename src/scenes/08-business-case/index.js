import { createPlaceholderScene } from '../../ui/placeholder.js';

// Placeholder: number + title only. Replaced by the real scene in its own slice.
export default createPlaceholderScene({
  number: 8,
  id: 'business-case',
  title: 'The business case',
  anchor: { x: 1250, y: 240, size: 260 },
});
