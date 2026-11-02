import assert from 'node:assert/strict';
import { test } from 'node:test';
import { health } from './health.ts';

test('health reports ok', () => {
  assert.deepEqual(health(), { status: 'ok' });
});
