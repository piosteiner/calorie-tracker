#!/bin/bash
# Copies the published site (web/) into one folder (default: _site) for GitHub Pages.
# Everything outside web/ (backend/, docs/, tests/, modules/, …) never reaches the site.
# Fails if a page or the service worker asks for a file that is not in web/.
# Usage: scripts/build-site.sh [output-folder]
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-_site}"
rm -rf "$out"
mkdir -p "$out"
cp -r web/. "$out"/

# Every local file a page or the service worker asks for must be in the published site
refs=$( { grep -hoE '(src|href)="[^"#?:]+["?#]' "$out"/*.html | sed -E 's/^(src|href)="//; s/.$//'
          grep -oE "'/[^'/][^']*'" "$out"/sw.js | tr -d "'"; } | sed 's#^/##' | sort -u )
missing=0
for ref in $refs; do
  [ -e "$out/$ref" ] || { echo "✗ referenced but not published: $ref"; missing=1; }
done
[ "$missing" = 0 ] && echo "✓ $(find "$out" -type f | wc -l) files in $out/"
exit "$missing"
