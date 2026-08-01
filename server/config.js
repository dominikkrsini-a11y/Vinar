import 'dotenv/config';

const REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key] || !String(process.env[key]).trim());
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Refusing to start — see server/.env.example.'
    );
    process.exit(1);
  }
}

export const config = {
  port: Number(process.env.PORT || 3001),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  // Fixed server-side — the client is never allowed to choose these.
  // Sonnet over Haiku for Croatian: Haiku produced broken morphology and
  // literal translations of English idioms in Croatian answers.
  anthropicModel: 'claude-sonnet-4-5',
  anthropicMaxTokens: 1024,

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Railway (and most host UIs) store multi-line values with literal
    // "\n" sequences — convert back to real newlines for the PEM key.
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },

  upstash: {
    enabled: Boolean(
      process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
    ),
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  rateLimit: {
    // Per authenticated user, not per IP — see middleware/rateLimit.js.
    requests: 30,
    windowSeconds: 60 * 60,
  },

  dailyUsage: {
    maxRequestsPerUserPerDay: 100,
  },
};
