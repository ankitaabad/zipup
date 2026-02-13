#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT_DIR/release"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "📦 Building backend + frontend in parallel..."

(
  echo "🔧 Building backend..."
  cd "$BACKEND_DIR"
  pnpm build
) &

(
  echo "🎨 Building frontend..."
  cd "$FRONTEND_DIR"
  pnpm build
) &

wait
echo "✅ Builds complete"

echo "🧹 Preparing /out directory..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "📦 Deploying backend prod node_modules into /out..."
cd "$ROOT_DIR"
pnpm --filter backend deploy --legacy --prod "$OUT_DIR"

echo "📂 Copying backend dist + package.json..."
# cp -r "$BACKEND_DIR/dist" "$OUT_DIR/dist"
# cp "$BACKEND_DIR/package.json" "$OUT_DIR/package.json"
#  copy open resty folder and docker compose file
echo "📂 Copying OpenResty and docker-compose.yml into /out..."
mkdir -p "$OUT_DIR/openResty"
cp -r "$ROOT_DIR/openResty/"* "$OUT_DIR/openResty"
cp "$ROOT_DIR/docker-compose.yaml" "$OUT_DIR/docker-compose.yaml"
echo "📂 Copying frontend build into /out/public..."
mkdir -p "$OUT_DIR/frontend/dist"
cp -r "$FRONTEND_DIR/dist/"* "$OUT_DIR/frontend/dist"

echo "📊 Final out size:"
du -sh "$OUT_DIR"

echo "🎉 Release artifact ready at: $OUT_DIR"