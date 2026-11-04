#!/usr/bin/env bash
# Build a standalone AG CRM for Cloudflare Pages.
# No Supabase secrets and no repository SQL/workflows are shipped.
set -euo pipefail
out="dist-ag-crm"
rm -rf "$out"
mkdir -p "$out/crm"

for f in admin.html admin.js admin.css index.html crm.js crm.css supabase-config.js; do
  test -f "crm/$f" || { echo "Missing crm/$f" >&2; exit 1; }
  cp "crm/$f" "$out/crm/$f"
done
for f in academy-supabase-config.js logo-completo-oficial.png icon-192.png; do
  test -f "$f" || { echo "Missing $f" >&2; exit 1; }
  cp "$f" "$out/$f"
done

# The separate CRM shares the AG Supabase project, but the academy stays on its original domain.
cat > "$out/academia.html" <<'HTML'
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Academia AG</title></head><body>
<script>location.replace('https://agbusinessnetworking.com/academia.html'+location.search+location.hash)</script>
<a href="https://agbusinessnetworking.com/academia.html">Ir a Academia AG</a>
</body></html>
HTML

cat > "$out/index.html" <<'HTML'
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/crm/admin.html"><meta name="robots" content="noindex"><title>Administrador AG Networking</title></head><body>
<a href="/crm/admin.html">Abrir administrador AG Networking</a>
</body></html>
HTML

# Prevent old admin bundles from remaining cached after a release.
cat > "$out/_headers" <<'HEADERS'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Robots-Tag: noindex

/crm/*.html
  Cache-Control: no-store

/crm/*.js
  Cache-Control: no-cache, must-revalidate

/academy-supabase-config.js
  Cache-Control: no-cache, must-revalidate
HEADERS

grep -q "academy_profile_workspaces" "$out/crm/admin.js" || {
  echo "Refusing to deploy old student registry code" >&2; exit 1;
}
echo "AG CRM Cloudflare bundle ready in $out"
