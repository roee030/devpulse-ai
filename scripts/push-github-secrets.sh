#!/usr/bin/env bash
# Push all .env.local values as GitHub Actions secrets.
# Run once after setting up .env.local:
#   bash scripts/push-github-secrets.sh
#
# Requires: gh CLI authenticated (gh auth login)

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.local not found at $ENV_FILE"
  exit 1
fi

# Detect repo from git remote
REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/\.git$//')
if [[ -z "$REPO" ]]; then
  echo "ERROR: could not detect GitHub repo from git remote"
  exit 1
fi

echo "Pushing secrets to: $REPO"
echo ""

# Keys to push (matches what deploy.yml reads)
KEYS=(
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET
  VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID
  VITE_UNIFIED_API_KEY
  VITE_UNIFIED_WORKSPACE_ID
  VITE_UNIFIED_JIRA_CONNECTION_ID
  VITE_UNIFIED_LINEAR_CONNECTION_ID
  VITE_UNIFIED_MONDAY_CONNECTION_ID
  VITE_UNIFIED_GITHUB_CONNECTION_ID
  VITE_UNIFIED_SLACK_CONNECTION_ID
  VITE_UNIFIED_TEAMS_CONNECTION_ID
)

for KEY in "${KEYS[@]}"; do
  # Extract value from .env.local
  VALUE=$(grep "^${KEY}=" "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
  if [[ -z "$VALUE" ]]; then
    echo "  SKIP  $KEY (not set in .env.local)"
    continue
  fi
  gh secret set "$KEY" --repo "$REPO" --body "$VALUE"
  echo "  SET   $KEY"
done

echo ""
echo "Done. Trigger a deploy with: git commit --allow-empty -m 'ci: trigger deploy' && git push"
