import assert from 'node:assert/strict';
import { CacheSimulator, REPLACEMENT } from '../sim-core.js';

const trace = [
  { access: 'r', address: '0x00000000' },
  { access: 'r', address: '0x00000004' },
  { access: 'w', address: '0x00000000' },
  { access: 'r', address: '0x00000008' },
  { access: 'r', address: '0x00000010' },
  { access: 'w', address: '0x00000004' },
  { access: 'r', address: '0x00000014' },
  { access: 'w', address: '0x00000018' },
  { access: 'r', address: '0x00000000' },
  { access: 'w', address: '0x00000010' }
];

const sim = new CacheSimulator({
  blockSize: 4,
  l1Size: 16,
  l1Assoc: 2,
  l2Size: 0,
  l2Assoc: 2,
  replacement: REPLACEMENT.LRU,
  inclusion: 0
});

sim.processTrace(trace);
const stats = sim.getStats();

assert.equal(stats.l1Reads, 6);
assert.equal(stats.l1ReadMisses, 6);
assert.equal(stats.l1Writes, 4);
assert.equal(stats.l1WriteMisses, 2);
assert.equal(stats.l1Writebacks, 2);
assert.equal(Number(stats.l1MissRate.toFixed(6)), 0.8);
assert.equal(stats.memoryTraffic, 10);

console.log('sim-core starter trace test: PASSED');
