import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { health } from '../../shared/health.ts';
import { ApiError } from './validate';

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => (list((c.env as Env).ALLOWED_ORIGINS).includes(origin.toLowerCase()) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['authorization', 'content-type'],
    maxAge: 86400,
  }),
);

app.get('/api/health', (c) => c.json(health()));

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: err.message, code: err.code }, err.status);
  console.error(err);
  return c.json({ error: 'Something went wrong' }, 500);
});

export default app;
