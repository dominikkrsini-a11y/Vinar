import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import * as Sentry from '@sentry/node';
import { config, validateEnv } from './config.js';
import assistantRouter from './routes/assistant.js';
import { logError, logInfo } from './logger.js';

validateEnv();

// Optional — only enabled if SENTRY_DSN is set. Not in REQUIRED_ENV_VARS
// (server/config.js) since the proxy must keep working without it.
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

const app = express();

app.use(express.json({ limit: '2mb' }));

// NOTE: CORS is not an authentication boundary. React Native fetch calls
// carry no Origin header at all, so this check is bypassed by design for
// the mobile app. The actual identity check is the Firebase ID token
// verified in middleware/auth.js on every /api/assistant request.
const allowOrigin = (origin) => {
  if (!origin) return true;

  const o = String(origin).toLowerCase();
  return (
    o.startsWith('http://localhost') ||
    o.startsWith('http://127.0.0.1') ||
    o.startsWith('http://192.168.') ||
    o.startsWith('http://10.') ||
    o.startsWith('http://172.16.') ||
    o.startsWith('http://172.17.') ||
    o.startsWith('http://172.18.') ||
    o.startsWith('http://172.19.') ||
    o.startsWith('http://172.2') ||
    o.startsWith('http://172.30.') ||
    o.startsWith('http://172.31.')
  );
};

app.use(
  cors({
    origin(origin, cb) {
      if (allowOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('/api/assistant', assistantRouter);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Catches anything that reaches here as an error (e.g. CORS rejections,
// unexpected thrown/rejected errors from route handlers) — logs it as
// structured JSON and returns a generic JSON error instead of leaking
// stack traces or crashing the process.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logError('unhandled_request_error', {
    path: req.path,
    method: req.method,
    message: err?.message,
  });
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  if (res.headersSent) return;
  res.status(500).json({ error: { message: 'Internal server error.' } });
});

// No host argument on purpose. Node then binds the unspecified address (::)
// in dual-stack mode, accepting both IPv6 and IPv4. Passing '0.0.0.0'
// explicitly restricts the socket to IPv4 only, which Railway's healthcheck
// and internal proxy cannot always reach.
app.listen(config.port, () => {
  logInfo('server_started', { port: config.port });
});
