#!/usr/bin/env bash
# Bumps the root version from the commit types since the last bump and opens the staging → main PR.
# Breaking (`type!:`) → major, any `feat` → minor, anything else → patch. `scripts/release.sh minor` forces a level.
set -euo pipefail

[ "$(git branch --show-current)" = staging ] || { echo "Run on staging" >&2; exit 1; }
git pull --ff-only

# Tags live on main's merge commits, so count from the last version bump on staging instead.
since=$(git log -1 --format=%H -G'"version":' -- package.json)
subjects=$(git log "$since"..HEAD --format=%s)

if [ -n "${1:-}" ]; then level=$1
elif grep -qE '^[a-z]+(\(.+\))?!:' <<<"$subjects"; then level=major
elif grep -qE '^feat(\(.+\))?:' <<<"$subjects"; then level=minor
else level=patch; fi

pnpm version "$level" --no-git-tag-version >/dev/null
v=v$(jq -r .version package.json)
git commit -qam "chore(release): $v"
git push
gh pr create --base main --head staging --title "chore(release): $v" --label release --fill
