#!/bin/bash
set -euo pipefail

# Spustit jen ve webovém prostředí Claude Code
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# ── 1. Nainstalovat gh CLI pokud chybí ──────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo "[session-start] Instaluji gh CLI..."
  apt-get install -y gh 2>&1 | tail -2
  echo "[session-start] gh nainstalován: $(gh --version | head -1)"
else
  echo "[session-start] gh již nainstalován: $(gh --version | head -1)"
fi

# ── 2. Načíst GitHub token ───────────────────────────────────────────────────
TOKEN_FILE="$HOME/.claude/.github_token"

if [ -f "$TOKEN_FILE" ]; then
  GH_TOKEN_VAL=$(cat "$TOKEN_FILE")
  echo "export GH_TOKEN=${GH_TOKEN_VAL}" >> "$CLAUDE_ENV_FILE"
  export GH_TOKEN="$GH_TOKEN_VAL"
  echo "[session-start] GitHub token načten z ${TOKEN_FILE}"
else
  echo "[session-start] ⚠️  GitHub token nenalezen."
  echo "[session-start] Ulož svůj GitHub token příkazem:"
  echo "[session-start]   echo 'ghp_TVUJ_TOKEN' > ~/.claude/.github_token"
fi

# ── 3. Ověřit přihlášení ─────────────────────────────────────────────────────
if gh auth status &>/dev/null; then
  echo "[session-start] ✅ GitHub přihlášení OK ($(gh api user --jq '.login' 2>/dev/null || echo 'neznámý uživatel'))"
else
  echo "[session-start] ℹ️  gh není přihlášen – PR/issues budou vyžadovat token"
fi
