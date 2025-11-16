#!/usr/bin/env bash
set -euo pipefail

echo "Automate: create GitHub repo, push code, add Fly secret, optional Fly deploy"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI 'gh' not found. Install it and run 'gh auth login' then re-run this script." >&2
  exit 1
fi

if ! command -v flyctl >/dev/null 2>&1; then
  echo "Warning: 'flyctl' not found. You can still create the GitHub repo and secret; Fly deploy will be skipped." >&2
  HAVE_FLY=0
else
  HAVE_FLY=1
fi

# Ensure git repo and commit
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial commit - add pong backend & frontend"
else
  # ensure there is at least one commit
  if [ -z "$(git rev-parse --verify HEAD 2>/dev/null || true)" ]; then
    git add .
    git commit -m "Initial commit - add pong backend & frontend"
  fi
fi

DEFAULT_REPO="watergamekitty/waterryblock-game"
read -r -p "GitHub repo (owner/name) [${DEFAULT_REPO}]: " REPO
REPO=${REPO:-$DEFAULT_REPO}

echo "Creating GitHub repo ${REPO} (or using existing) and pushing..."
set +e
gh repo create "${REPO}" --public --source=. --remote=origin --push
GHCODE=$?
set -e
if [ $GHCODE -ne 0 ]; then
  echo "gh repo create returned non-zero (${GHCODE}). Attempting to add remote and push instead..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${REPO}.git"
  git branch -M main || true
  git push -u origin main
fi

echo
echo "Next: set Fly API token as GitHub secret 'FLY_API_TOKEN' for the repo ${REPO}."
if [ -z "${FLY_API_TOKEN:-}" ]; then
  read -r -s -p "Paste Fly API token (will be stored as repo secret): " FLY_API_TOKEN
  echo
fi

if [ -n "${FLY_API_TOKEN:-}" ]; then
  echo "Setting secret FLY_API_TOKEN in repo ${REPO}..."
  gh secret set FLY_API_TOKEN --body "$FLY_API_TOKEN" --repo "$REPO"
else
  echo "No Fly token provided; skipping secret set. You can still add it later in GitHub Settings -> Secrets." >&2
fi

if [ "$HAVE_FLY" -eq 1 ]; then
  read -r -p "Create Fly app and deploy now? (y/N): " DOFLY
  DOFLY=${DOFLY:-N}
  if [ "${DOFLY,,}" = "y" ]; then
    # create app (ignore errors if already exists)
    echo "Creating Fly app 'waterryblock-game' (if not exists) and deploying..."
    flyctl apps create waterryblock-game || true
    flyctl deploy --config fly.toml || true
    echo "If deploy succeeded, add domain using: flyctl domains add waterryblock.game"
  else
    echo "Skipping Fly deploy. You can deploy later with 'flyctl deploy --config fly.toml' or via the GitHub Actions workflow." 
  fi
else
  echo "flyctl not installed; to deploy to Fly install flyctl and run 'flyctl deploy --config fly.toml' or let Actions deploy after adding the secret." 
fi

echo
echo "Done. CI workflow is configured and will deploy on pushes to main once the secret is set."
