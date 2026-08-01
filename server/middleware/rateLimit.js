import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { config } from '../config.js';
import { logInfo } from '../logger.js';

let ratelimit;

if (config.upstash.enabled) {
  const redis = new Redis({
    url: config.upstash.url,
    token: config.upstash.token,
  });

  // Per-uid sliding window limiter. Backed by Upstash (not in-memory) so the
  // limit holds across server restarts and across multiple Railway instances,
  // unlike the old per-IP in-memory map.
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.rateLimit.requests, `${config.rateLimit.windowSeconds} s`),
    analytics: true,
    prefix: 'vinar-assistant',
  });
} else {
  logInfo('rate_limit_disabled', {
    message: 'Upstash not configured — per-user rate limiting is disabled.',
  });
}

// Must run AFTER requireAuth — relies on req.uid being set.
export async function requireWithinRateLimit(req, res, next) {
  if (!config.upstash.enabled) return next();

  const uid = req.uid;
  if (!uid) {
    return res.status(401).json({ error: { message: 'Not authenticated.' } });
  }

  let result;
  try {
    result = await ratelimit.limit(uid);
  } catch (err) {
    // Upstash unavailable — fail closed, not open. An outage in the rate
    // limiter must not become a way to bypass rate limiting.
    return res.status(503).json({ error: { message: 'Rate limiter unavailable. Try again shortly.' } });
  }

  const { success, limit, remaining, reset } = result;

  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (!success) {
    const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: { message: 'Rate limit exceeded. Please wait and try again.' },
    });
  }

  return next();
}
