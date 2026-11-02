import type { Health } from './types.ts';

export function health(): Health {
  return { status: 'ok' };
}
