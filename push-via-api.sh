#!/bin/bash
set -euo pipefail

# ─── CONFIG ────────────────────────────────────────────────
OWNER="alexandreybasta-cyber"
REPO="sky-news-interactive"
BRANCH="main"
API="https://api.github.com"
WORKDIR="/Users/temp/Documents/QODER/Sky News"

cd "$WORKDIR"

# ─── EXTRACT TOKEN (silently) ─────────────────────────────
TOKEN_FILE="${WORKDIR}/.github-token"
if [ -f "$TOKEN_FILE" ]; then
  TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n')
else
  echo "ERROR: Token file not found at $TOKEN_FILE"
  echo "Create it with: echo 'your_pat_here' > $TOKEN_FILE"
  exit 1
fi
echo "✓ Token loaded"

# ─── HELPER: GitHub API call ──────────────────────────────
gh_api() {
  local method="$1" endpoint="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -X "$method" "${API}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "${API}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28"
  fi
}

# ─── VERIFY AUTH ──────────────────────────────────────────
echo "Verifying authentication..."
AUTH_CHECK=$(gh_api GET /user)
LOGIN=$(echo "$AUTH_CHECK" | jq -r '.login // empty')
if [ -z "$LOGIN" ]; then
  echo "ERROR: Authentication failed"
  echo "$AUTH_CHECK" | jq .
  exit 1
fi
echo "✓ Authenticated as: $LOGIN"

# ─── STEP 0.5: Auto-commit ALL changes (tracked + new files) ─────
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠ Uncommitted changes detected — auto-committing..."
  git add -A
  git commit -m "chore: auto-commit before push" --no-verify 2>/dev/null || true
  echo "✓ Changes committed (including any new files)"
fi

# ─── STEP 1: Get list of all tracked files with modes ─────
echo ""
echo "═══ Step 1: Reading tracked files ═══"
TREE_ENTRIES="[]"
FILE_COUNT=0
TOTAL_FILES=$(git -c core.quotePath=false ls-tree -r HEAD --name-only | wc -l | tr -d ' ')
echo "Total files to upload: $TOTAL_FILES"

# ─── STEP 2: Create blobs for each file ──────────────────
echo ""
echo "═══ Step 2: Creating blobs ═══"

while IFS= read -r line; do
  meta="${line%%	*}"
  path="${line#*	}"
  MODE="${meta%% *}"
  FILE_COUNT=$((FILE_COUNT + 1))

  PAYLOAD=$(cat "$path" | base64 | jq -Rsc '{content: (. | rtrimstr("\n")), encoding: "base64"}')

  PAYLOAD_FILE=$(mktemp)
  printf '%s' "$PAYLOAD" > "$PAYLOAD_FILE"
  MAX_RETRIES=5
  RETRY_COUNT=0
  BLOB_SHA=""
  while [ -z "$BLOB_SHA" ] && [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; do
    RESPONSE=$(curl -s -X POST "${API}/repos/${OWNER}/${REPO}/git/blobs" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      -H "Content-Type: application/json" \
      --data-binary "@${PAYLOAD_FILE}")
    BLOB_SHA=$(echo "$RESPONSE" | jq -r '.sha // empty')
    if [ -z "$BLOB_SHA" ]; then
      RETRY_COUNT=$((RETRY_COUNT + 1))
      if [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
        echo "  RETRY $RETRY_COUNT/$MAX_RETRIES for $path ($(echo "$RESPONSE" | jq -r '.message // .'))..."
        sleep 2
      fi
    fi
  done
  rm -f "$PAYLOAD_FILE"

  if [ -z "$BLOB_SHA" ]; then
    echo "  FAILED after $MAX_RETRIES retries: $path"
    echo "$RESPONSE" | jq -r '.message // .'
    exit 1
  fi

  TREE_ENTRIES=$(echo "$TREE_ENTRIES" | jq --arg path "$path" --arg mode "$MODE" --arg sha "$BLOB_SHA" \
    '. + [{"path": $path, "mode": $mode, "type": "blob", "sha": $sha}]')

  if [ $((FILE_COUNT % 10)) -eq 0 ] || [ "$FILE_COUNT" -eq "$TOTAL_FILES" ]; then
    echo "  [$FILE_COUNT/$TOTAL_FILES] uploaded"
  fi
done < <(git -c core.quotePath=false ls-tree -r HEAD)

echo "✓ All $FILE_COUNT blobs created"

# ─── STEP 3: Create the tree ─────────────────────────────
echo ""
echo "═══ Step 3: Creating tree ═══"
TREE_PAYLOAD=$(echo "$TREE_ENTRIES" | jq '{tree: .}')
TREE_RESPONSE=$(gh_api POST "/repos/${OWNER}/${REPO}/git/trees" "$TREE_PAYLOAD")
TREE_SHA=$(echo "$TREE_RESPONSE" | jq -r '.sha // empty')

if [ -z "$TREE_SHA" ]; then
  echo "ERROR creating tree:"
  echo "$TREE_RESPONSE" | jq -r '.message // .'
  exit 1
fi
echo "✓ Tree created: $TREE_SHA"

# ─── STEP 4: Create the commit ───────────────────────────
echo ""
echo "═══ Step 4: Creating commit ═══"
COMMIT_MSG=$(git log -1 --format=%B)
PARENT_SHA=$(gh_api GET "/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}" | jq -r '.object.sha // empty')

if [ -z "$PARENT_SHA" ]; then
  echo "  No existing branch — creating initial commit..."
  COMMIT_PAYLOAD=$(jq -n --arg message "$COMMIT_MSG" --arg tree "$TREE_SHA" \
    '{"message": $message, "tree": $tree, "parents": []}')
else
  echo "  Parent commit: $PARENT_SHA"
  COMMIT_PAYLOAD=$(jq -n --arg message "$COMMIT_MSG" --arg tree "$TREE_SHA" --arg parent "$PARENT_SHA" \
    '{"message": $message, "tree": $tree, "parents": [$parent]}')
fi

COMMIT_RESPONSE=$(gh_api POST "/repos/${OWNER}/${REPO}/git/commits" "$COMMIT_PAYLOAD")
COMMIT_SHA=$(echo "$COMMIT_RESPONSE" | jq -r '.sha // empty')

if [ -z "$COMMIT_SHA" ]; then
  echo "ERROR creating commit:"
  echo "$COMMIT_RESPONSE" | jq -r '.message // .'
  exit 1
fi
echo "✓ Commit created: $COMMIT_SHA"
echo "  Message: $(echo "$COMMIT_MSG" | head -1)"

# ─── STEP 5: Update or create the branch ref ─────────────
echo ""
echo "═══ Step 5: Updating refs/heads/$BRANCH ═══"
REF_PAYLOAD=$(jq -n --arg sha "$COMMIT_SHA" '{"sha": $sha, "force": true}')
REF_RESPONSE=$(gh_api PATCH "/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}" "$REF_PAYLOAD")
REF_SHA=$(echo "$REF_RESPONSE" | jq -r '.object.sha // empty')

if [ -z "$REF_SHA" ]; then
  echo "  PATCH failed, trying to create ref..."
  REF_PAYLOAD=$(jq -n --arg sha "$COMMIT_SHA" --arg ref "refs/heads/${BRANCH}" '{"ref": $ref, "sha": $sha}')
  REF_RESPONSE=$(gh_api POST "/repos/${OWNER}/${REPO}/git/refs" "$REF_PAYLOAD")
  REF_SHA=$(echo "$REF_RESPONSE" | jq -r '.object.sha // empty')
fi

if [ "$REF_SHA" = "$COMMIT_SHA" ]; then
  echo "✓ Branch '$BRANCH' updated to $COMMIT_SHA"
  echo ""
  echo "════════════════════════════════════════════"
  echo "  SUCCESS! Repository pushed via GitHub API"
  echo "  https://github.com/$OWNER/$REPO"
  echo "════════════════════════════════════════════"
else
  echo "ERROR updating ref:"
  echo "$REF_RESPONSE" | jq .
  exit 1
fi
