import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig } from '../src/config.js';

test('public configuration has deterministic defaults and strictly bounded overrides', () => {
  assert.deepEqual(readConfig({}), { host: '127.0.0.1', port: 3000, rewardEvery: 5, discountPercent: 10 });
  assert.deepEqual(readConfig({ HOST: '0.0.0.0', PORT: '0', REWARD_EVERY: '2', DISCOUNT_PERCENT: '100' }), { host: '0.0.0.0', port: 0, rewardEvery: 2, discountPercent: 100 });
  for (const invalid of [
    { PORT: 'abc' }, { PORT: '' }, { PORT: '65536' }, { PORT: '1.1' },
    { REWARD_EVERY: '0' }, { REWARD_EVERY: '1e3' }, { REWARD_EVERY: '1000001' },
    { DISCOUNT_PERCENT: '0' }, { DISCOUNT_PERCENT: '101' }, { HOST: 'invalid-host' },
  ]) assert.throws(() => readConfig(invalid));
});
