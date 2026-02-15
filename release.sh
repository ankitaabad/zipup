#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT_DIR/release"
APP_DIR="$OUT_DIR/app"
BACKEND_OUT_DIR="$APP_DIR/backend"
FRONTEND_OUT_DIR="$APP_DIR/frontend"

BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
DB_PATH="$BACKEND_DIR/src/db/zipup.db"

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
mkdir -p "$BACKEND_OUT_DIR" "$FRONTEND_OUT_DIR"

echo "📦 Deploying backend prod node_modules into /out..."
cd "$ROOT_DIR"
echo "📂 Copying backend dist + package.json..."
pnpm --filter backend deploy --prod --legacy "$BACKEND_OUT_DIR"
pnpm --filter backend dbInit

echo "📂 Copying database file into /out..."
# create db folder in out and copy the db file there
mkdir -p "$BACKEND_OUT_DIR/db"
cp "$DB_PATH" "$BACKEND_OUT_DIR/db/zipup.db"

# copy open resty folder and docker compose file
echo "📂 Copying OpenResty and docker-compose.yaml into /out..."
mkdir -p "$OUT_DIR/openResty"
cp -r "$ROOT_DIR/openResty/"* "$OUT_DIR/openResty"
cp "$ROOT_DIR/docker-compose.release.yaml" "$OUT_DIR/docker-compose.release.yaml"
# copy vector yaml
cp "$ROOT_DIR/vector.yaml" "$OUT_DIR/vector.yaml" 

echo "📂 Copying frontend build into /out/app/frontend/dist..."
mkdir -p "$FRONTEND_OUT_DIR/dist"
cp -r "$FRONTEND_DIR/dist/"* "$FRONTEND_OUT_DIR/dist"


echo "📊 Final out size:"
du -sh "$OUT_DIR"

echo "🎉 Release artifact ready at: $OUT_DIR"