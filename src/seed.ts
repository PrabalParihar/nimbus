import type { Product } from './contracts.js';

// Fictional catalog. No accounts, customer data or external services.
export const seedProducts: Product[] = [
  { id: 'notebook', name: 'Nebula Notebook', unitPriceCents: 1299, available: 50 },
  { id: 'pen', name: 'Comet Pen', unitPriceCents: 105, available: 100 },
  { id: 'mug', name: 'Orbit Mug', unitPriceCents: 1895, available: 20 },
  { id: 'tote', name: 'Lunar Tote', unitPriceCents: 2499, available: 15 },
  { id: 'limited-print', name: 'Stardust Limited Print', unitPriceCents: 4999, available: 1 },
];
