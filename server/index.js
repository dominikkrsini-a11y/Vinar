import 'dotenv/config';

import cors from 'cors';
import express from 'express';

const app = express();

const PORT = Number(process.env.PORT || 3001);

app.use(express.json({ limit: '2mb' }));

const allowOrigin = (origin) => {
  // React Native fetch often omits Origin; allow it for local dev.
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
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// ---- Simple in-memory per-IP rate limiting (dev) ----
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 20;
const ipHits = new Map(); // ip -> number[] timestamps

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  const arr = ipHits.get(ip) || [];
  const filtered = arr.filter((t) => now - t < RATE_WINDOW_MS);
  filtered.push(now);
  ipHits.set(ip, filtered);

  if (filtered.length > RATE_MAX) {
    return res.status(429).json({
      error: { message: 'Rate limit exceeded. Please wait and try again.' },
    });
  }
  next();
}

function isValidMessage(m) {
  if (!m || typeof m !== 'object') return false;
  if (m.role !== 'user' && m.role !== 'assistant') return false;
  if (!Array.isArray(m.content)) return false;

  // Content items are {type:'text',text} or {type:'image',source:{type:'base64',media_type,data}}
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
      // keep payload bounded (approx)
      if (s.data.length > 1_500_000) return false;
    } else {
      return false;
    }
  }

  return true;
}

app.post('/api/assistant', rateLimit, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'Server missing ANTHROPIC_API_KEY.' },
    });
  }

  const { messages, system, model, max_tokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 50) {
    return res.status(400).json({ error: { message: 'Invalid messages.' } });
  }
  if (!messages.every(isValidMessage)) {
    return res.status(400).json({ error: { message: 'Invalid message shape.' } });
  }
  if (typeof system !== 'string' || system.length < 1 || system.length > 50_000) {
    return res.status(400).json({ error: { message: 'Invalid system prompt.' } });
  }

  const anthropicModel =
    typeof model === 'string' && model.trim() ? model.trim() : 'claude-3-5-haiku-latest';
  const tokens =
    typeof max_tokens === 'number' && Number.isFinite(max_tokens)
      ? Math.max(1, Math.min(2048, Math.floor(max_tokens)))
      : 1024;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: tokens,
        system,
        messages,
      }),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      error: { message: 'Upstream request failed.' },
    });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Assistant proxy listening on http://localhost:${PORT}`);
});

