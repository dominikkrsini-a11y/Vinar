import { Router } from 'express';
import { requireAuth, adminDb } from '../middleware/auth.js';
import { requireWithinRateLimit } from '../middleware/rateLimit.js';
import { callAnthropic } from '../services/anthropic.js';
import { buildSystemPromptForUser } from '../services/promptBuilder.js';
import { config } from '../config.js';
import { logError } from '../logger.js';

const router = Router();

// Fields the client is never allowed to control. Rejected outright rather
// than silently ignored, so a client bug or a malicious client gets a clear
// error instead of silent divergence from what it thinks was sent.
const REJECTED_CLIENT_FIELDS = ['system', 'model', 'max_tokens'];

function isValidMessage(m) {
  if (!m || typeof m !== 'object') return false;
  if (m.role !== 'user' && m.role !== 'assistant') return false;
  if (!Array.isArray(m.content)) return false;

  for (const c of m.content) {
    if (!c || typeof c !== 'object') return false;
    if (c.type === 'text') {
      if (typeof c.text !== 'string') return false;
      if (c.text.length > 4000) return false;
    } else if (c.type === 'image') {
      const s = c.source;
      if (!s || typeof s !== 'object') return false;
      if (s.type !== 'base64') return false;
      if (typeof s.media_type !== 'string') return false;
      if (typeof s.data !== 'string') return false;
      if (s.data.length > 1_500_000) return false;
    } else {
      return false;
    }
  }

  return true;
}

// Simple per-user, per-day counter in Firestore. This is a cost backstop on
// top of the hourly Upstash rate limit, not a replacement for it.
async function checkAndIncrementDailyUsage(uid) {
  const today = new Date().toISOString().slice(0, 10);
  const usageRef = adminDb.collection('assistantUsage').doc(uid).collection('daily').doc(today);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const count = snap.exists ? snap.data().count || 0 : 0;

    if (count >= config.dailyUsage.maxRequestsPerUserPerDay) {
      return { allowed: false };
    }

    tx.set(usageRef, { count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return { allowed: true, count: count + 1 };
  });
}

router.post('/', requireAuth, requireWithinRateLimit, async (req, res) => {
  const body = req.body || {};

  const rejectedFields = REJECTED_CLIENT_FIELDS.filter((field) => body[field] !== undefined);
  if (rejectedFields.length > 0) {
    return res.status(400).json({
      error: {
        message: `These fields are server-controlled and must not be sent by the client: ${rejectedFields.join(', ')}.`,
      },
    });
  }

  const { messages } = body;

  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 50) {
    return res.status(400).json({ error: { message: 'Invalid messages.' } });
  }
  if (!messages.every(isValidMessage)) {
    return res.status(400).json({ error: { message: 'Invalid message shape.' } });
  }

  try {
    const usage = await checkAndIncrementDailyUsage(req.uid);
    if (!usage.allowed) {
      return res.status(429).json({
        error: { message: 'Daily assistant usage limit reached. Please try again tomorrow.' },
      });
    }
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7853/ingest/455c49a4-0543-4545-bab0-3a2545c46eb6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fd8b60' },
      body: JSON.stringify({
        sessionId: 'fd8b60',
        runId: 'run1',
        hypothesisId: 'A,B,C,D',
        location: 'server/routes/assistant.js:88',
        message: 'usage check threw',
        data: {
          code: err?.code,
          name: err?.name,
          message: err?.message,
          details: err?.details,
          hasUid: Boolean(req.uid),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    logError('debug_usage_check_error_detail', {
      code: err?.code,
      name: err?.name,
      message: err?.message,
      details: err?.details,
    });
    // #endregion
    logError('usage_check_failed', { uid: req.uid, message: err?.message });
    return res.status(500).json({ error: { message: 'Could not verify usage limits.' } });
  }

  let system;
  try {
    system = await buildSystemPromptForUser(req.uid);
  } catch (err) {
    logError('prompt_build_failed', { uid: req.uid, message: err?.message });
    return res.status(500).json({ error: { message: 'Could not load your winemaking context.' } });
  }

  const result = await callAnthropic({ system, messages });

  if (result.networkError || result.data === null) {
    logError('anthropic_upstream_failed', { uid: req.uid, status: result.status });
    return res.status(502).json({ error: { message: 'Upstream request failed.' } });
  }

  return res.status(result.status).json(result.data);
});

export default router;
