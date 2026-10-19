// An isolated optical fixture, never used by the shipped app or real catalogs.
// Shipped rotatable mirrors have unobstructed incident beams; this additional
// case covers a bubble losing/recovering illumination using real push/undo input.
import { V2_LEVELS } from '../../web/levels-v2.js';
const fixture = structuredClone(V2_LEVELS[5]);
fixture.name = '气泡受光验收夹具';
fixture.science.optics.night = {
  height: 1.6,
  emitters: [{ id: 'E', cell: [5, 0], direction: [0, 1] }],
  mirrors: [{ id: 'M', cell: [5, 2], orientation: '/', rotatable: true }],
  sensors: [{ id: 'LN', cell: [3, 2], label: 'LN' }], absorbers: [],
};
V2_LEVELS[5] = fixture;
import('./markings-probe.js');
