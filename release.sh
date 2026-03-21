#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT_DIR/release"
WIREGUARD_DIR="$OUT_DIR/wireguard"
BACKEND_DIR="$ROOT_DIR/backend"
DB_PATH="$BACKEND_DIR/src/db/zipup.db"
pnpm i
pnpm run -F backend dbInit
# echo "📦 Building backend + frontend in parallel..."

# (
#   echo "🔧 Building backend..."
#   cd "$BACKEND_DIR"
#   pnpm build
# ) &

# (
#   echo "🎨 Building frontend..."
#   cd "$FRONTEND_DIR"
#   pnpm build
# ) &

# wait
# echo "✅ Builds complete"

echo "🧹 Preparing /out directory..."
rm -rf "$OUT_DIR"
mkdir -p  "$WIREGUARD_DIR"


echo "📂 Copying database file into /out..."
# create db folder in out and copy the db file there
mkdir -p "$OUT_DIR/db"
cp "$DB_PATH" "$OUT_DIR/db/zipup.db"

# copy open resty folder and docker compose file
echo "📂 Copying OpenResty and docker-compose.yaml into /out..."
mkdir -p "$OUT_DIR/openresty"
cp -r "$ROOT_DIR/openresty/"* "$OUT_DIR/openresty"
cp "$ROOT_DIR/docker-compose.base.yaml" "$OUT_DIR/docker-compose.base.yaml"
cp "$ROOT_DIR/docker-compose.release.yaml" "$OUT_DIR/docker-compose.release.yaml"
# copy vector yaml
cp "$ROOT_DIR/vector.yaml" "$OUT_DIR/vector.yaml" 

# echo "📂 Copying frontend build into /out/app/frontend/dist..."
# mkdir -p "$FRONTEND_OUT_DIR/dist"
# cp -r "$FRONTEND_DIR/dist/"* "$FRONTEND_OUT_DIR/dist"

echo "copying wireguard confg"
cp "$ROOT_DIR/wireguard/wg0.template.conf" "$WIREGUARD_DIR/wg0.conf"

echo "📊 Final out size:"
du -sh "$OUT_DIR"

echo "🎉 Release artifact ready at: $OUT_DIR"