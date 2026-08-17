#!/usr/bin/env bash
# Start the Express assistant proxy for Cloud Agents.
# Real Anthropic + Firebase Admin secrets are used when present. Otherwise a
# throwaway RSA key is generated so the process can bind and GET /healthz
# succeeds. POST /api/assistant still needs genuine credentials.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

required=(ANTHROPIC_API_KEY FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY)

has_all_env=1
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    has_all_env=0
    break
  fi
done

if [[ "$has_all_env" -eq 0 && -f server/.env ]]; then
  echo "Starting assistant proxy using server/.env"
  exec npm run dev --prefix server
fi

if [[ "$has_all_env" -eq 0 ]]; then
  echo "Cloud Agent secrets not set; starting assistant proxy with throwaway local credentials."
  echo "GET /healthz will work. POST /api/assistant needs real Anthropic + Firebase Admin secrets."
  export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-sk-ant-api03-cloud-agent-local-not-a-real-key}"
  export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-vinar-cloud-agent-local}"
  export FIREBASE_CLIENT_EMAIL="${FIREBASE_CLIENT_EMAIL:-cloud-agent@vinar-cloud-agent-local.iam.gserviceaccount.com}"
  if [[ -z "${FIREBASE_PRIVATE_KEY:-}" ]]; then
    export FIREBASE_PRIVATE_KEY="$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 2>/dev/null)"
  fi
fi

exec npm run dev --prefix server
