#!/bin/bash
# Copies the files the live site needs into one folder (default: _site) for GitHub Pages.
# Everything else in the repo (backend/, docs/, tests/, modules/, …) stays out of the published site.
# A new page, script or asset must be added to the list below, or the check at the end fails the deploy.
# Usage: scripts/build-site.sh [output-folder]
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-_site}"
rm -rf "$out"
mkdir -p "$out"

files=(
  index.html privacy.html share.html
  CNAME .nojekyll manifest.json styles.css
  config.js logger.js validators.js themeToggle.js theme-init.js
  realtimeSync.js pushManager.js script.js page-extras.js share.js sw.js
  app.css app-ui.js
  vendor
)
cp -r "${files[@]}" "$out"/

# Every local file a page or the service worker asks for must be in the published site
refs=$( { grep -hoE '(src|href)="[^"#?:]+["?#]' "$out"/*.html | sed -E 's/^(src|href)="//; s/.$//'
          grep -oE "'/[^'/][^']*'" "$out"/sw.js | tr -d "'"; } | sed 's#^/##' | sort -u )
missing=0
for ref in $refs; do
  [ -e "$out/$ref" ] || { echo "✗ referenced but not published: $ref"; missing=1; }
done
[ "$missing" = 0 ] && echo "✓ $(find "$out" -type f | wc -l) files in $out/"
exit "$missing"
