import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import * as Sentry from '@sentry/node';
import { config, validateEnv } from './config.js';
import assistantRouter from './routes/assistant.js';
import { logError, logInfo } from './logger.js';
// #region agent log
import { adminDb as __dbgDb } from './middleware/auth.js';
// #endregion

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

// #region agent log
// TEMPORARY debug endpoint — runs the same Firestore transaction that
// checkAndIncrementDailyUsage runs, and reports the raw error. Remove once
// the "Could not verify usage limits" issue is resolved.
app.get('/__debug/firestore', async (_req, res) => {
  const key = String(config.firebase.privateKey || '');
  const snapshot = {
    upstashEnabled: config.upstash.enabled,
    firebaseProjectId: config.firebase.projectId,
    clientEmailProject: String(config.firebase.clientEmail || '').split('@')[1] || null,
    privateKeyLooksPem: key.includes('BEGIN PRIVATE KEY'),
    privateKeyHasRealNewlines: key.includes('\n'),
    privateKeyLength: key.length,
  };

  try {
    const today = new Date().toISOString().slice(0, 10);
    const probeRef = __dbgDb
      .collection('assistantUsage')
      .doc('debug_probe')
      .collection('daily')
      .doc(today);

    await __dbgDb.runTransaction(async (tx) => {
      const snap = await tx.get(probeRef);
      tx.set(
        probeRef,
        { count: (snap.exists ? snap.data().count || 0 : 0) + 1, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    });

    return res.json({ ok: true, firestore: 'transaction succeeded', snapshot });
  } catch (err) {
    logError('debug_firestore_probe_failed', {
      code: err?.code,
      name: err?.name,
      message: err?.message,
      details: err?.details,
    });
    return res.status(200).json({
      ok: false,
      snapshot,
      error: {
        code: err?.code,
        name: err?.name,
        message: err?.message,
        details: err?.details,
      },
    });
  }
});
// #endregion

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

app.listen(config.port, '0.0.0.0', () => {
  logInfo('server_started', { port: config.port });

  // #region agent log
  (async () => {
    const dbg = (message, data) =>
      fetch('http://127.0.0.1:7853/ingest/455c49a4-0543-4545-bab0-3a2545c46eb6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fd8b60' },
        body: JSON.stringify({
          sessionId: 'fd8b60',
          runId: 'run1',
          hypothesisId: 'A,B,C,D,E',
          location: 'server/index.js:boot-probe',
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});

    const key = String(config.firebase.privateKey || '');
    await dbg('boot config snapshot', {
      port: config.port,
      upstashEnabled: config.upstash.enabled,
      firebaseProjectId: config.firebase.projectId,
      clientEmailProject: String(config.firebase.clientEmail || '').split('@')[1] || null,
      privateKeyLooksPem: key.includes('BEGIN PRIVATE KEY'),
      privateKeyHasRealNewlines: key.includes('\n'),
      privateKeyLength: key.length,
    });

    try {
      // Mirrors checkAndIncrementDailyUsage exactly: same collection, same
      // nested daily doc, same runTransaction read+write.
      const today = new Date().toISOString().slice(0, 10);
      const probeRef = __dbgDb
        .collection('assistantUsage')
        .doc('debug_probe')
        .collection('daily')
        .doc(today);

      await __dbgDb.runTransaction(async (tx) => {
        const snap = await tx.get(probeRef);
        tx.set(
          probeRef,
          { count: (snap.exists ? snap.data().count || 0 : 0) + 1, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      });
      await dbg('firestore probe TRANSACTION ok', { ok: true, today });
    } catch (err) {
      await dbg('firestore probe FAILED', {
        code: err?.code,
        name: err?.name,
        message: err?.message,
        details: err?.details,
      });
      logError('debug_firestore_probe_failed', {
        code: err?.code,
        name: err?.name,
        message: err?.message,
        details: err?.details,
      });
    }
  })();
  // #endregion
});
