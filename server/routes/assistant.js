import { Router } from 'express';
import { requireAuth, adminDb } from '../middleware/auth.js';
import { requireWithinRateLimit } from '../middleware/rateLimit.js';
import { callAnthropic } from '../services/anthropic.js';
import { assistantTools, runTool } from '../services/assistantTools.js';
import { buildSystemPromptForUser } from '../services/promptBuilder.js';
import { config } from '../config.js';
import { logError } from '../logger.js';

const router = Router();

// Upper bound on upstream calls for a single user message. Three allows one
// tool result to inform a second tool call before answering, which is as far as
// this needs to go — there is no planner and no autonomous looping here.
const MAX_UPSTREAM_CALLS = 3;

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

// The app reads the reply as `data.content[0].text` (see
// useAssistantOrchestrator.js), so a tool_use block sitting in content[0] would
// render as undefined. Collapse whatever came back into exactly one text block.
function normaliseForClient(data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const textBlock = blocks.find(
    (c) => c?.type === 'text' && typeof c.text === 'string' && c.text.trim()
  );

  return {
    ...data,
    content: [
      {
        type: 'text',
        text: textBlock
          ? textBlock.text
          : 'Sorry — I could not put together an answer for that. Please try asking again.',
      },
    ],
  };
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

  // Tool loop. The model may ask for a calculation; we run it locally and hand
  // the result back. Bounded by MAX_UPSTREAM_CALLS and always resolved here, so
  // the app only ever receives a finished text answer.
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let call = 1; call <= MAX_UPSTREAM_CALLS; call += 1) {
    const result = await callAnthropic({ system, messages: convo, tools: assistantTools });

    if (result.networkError || result.data === null) {
      logError('anthropic_upstream_failed', { uid: req.uid, status: result.status });
      return res.status(502).json({ error: { message: 'Upstream request failed.' } });
    }

    const data = result.data;

    // Any non-200 is an upstream error object, not a message — pass it through
    // untouched rather than trying to read content blocks off it.
    if (result.status !== 200) {
      logError('anthropic_returned_error', { uid: req.uid, status: result.status });
      return res.status(result.status).json(data);
    }

    const toolUses = Array.isArray(data.content)
      ? data.content.filter((c) => c?.type === 'tool_use')
      : [];

    if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
      return res.status(200).json(normaliseForClient(data));
    }

    if (call === MAX_UPSTREAM_CALLS) {
      logError('tool_loop_exhausted', { uid: req.uid, tools: toolUses.map((t) => t.name) });
      return res.status(200).json(normaliseForClient(data));
    }

    convo.push({ role: 'assistant', content: data.content });
    convo.push({
      role: 'user',
      content: toolUses.map((toolUse) => ({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: runTool(toolUse.name, toolUse.input),
      })),
    });
  }
});

export default router;
