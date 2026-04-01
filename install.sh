#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
echo "🚀 Installing Zipup4..."

REPO_OWNER="ankitaabad"
REPO_NAME="zipup"
INSTALL_DIR="$HOME/zipup"

echo "📦 Installing system dependencies..."
echo "📦 Updating package lists..."
sudo apt update -y >/dev/null
sudo apt install -y curl tar jq ca-certificates

# Remove snap docker if present
if command -v snap >/dev/null 2>&1 && snap list 2>/dev/null | grep -q '^docker '; then
  echo "🧹 Removing Snap-installed Docker to avoid conflicts..."
  sudo snap remove docker
fi
# Install docker if missing
if ! command -v docker >/dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
fi

sudo systemctl enable docker
sudo systemctl start docker
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon is not running or not accessible."
  exit 1
fi
echo "🐳 Docker version:"
docker --version
# Verify compose (fail fast if missing)
if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Docker Compose not found. Something went wrong with Docker install."
  exit 1
fi

echo "✅ Docker Compose version:"
docker compose version

# Add user to docker group
if ! groups "$USER" | grep -q '\bdocker\b'; then
  if [[ "${ZIPUP_REEXEC:-}" != "1" ]]; then
    echo "👤 Adding $USER to docker group..."
    sudo usermod -aG docker "$USER"

    echo "⚠️  Re-running script with new group..."

    exec sg docker "ZIPUP_REEXEC=1 bash \"$0\" $@"
  fi
fi

# Detect architecture for Zipup binary
echo "🧠 Detecting system architecture..."

# ARCH=$(uname -m)

# if [[ "$ARCH" == "x86_64" ]]; then
#   APP_ARCH="x64"
# elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
#   APP_ARCH="arm64"
# else
#   echo "❌ Unsupported architecture: $ARCH"
#   exit 1
# fi

# echo "📦 Detected architecture: $ARCH → using ${APP_ARCH} build"

# # Fetch latest release
# echo "🔎 Fetching latest release..."

LATEST_TAG=$(curl -fsSL \
  "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest" \
  | jq -r '.tag_name') || {
    echo "❌ Failed to fetch latest release (network or GitHub rate limit)."
    exit 1
}

if [[ -z "$LATEST_TAG" || "$LATEST_TAG" == "null" ]]; then
  echo "❌ Failed to fetch latest release."
  exit 1
fi

echo "📦 Latest release: $LATEST_TAG"

DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${LATEST_TAG}/zipup-${LATEST_TAG}.tar.gz"

echo "⬇️ Downloading release..."
echo "🔗 $DOWNLOAD_URL"

TMP_ARCHIVE=$(mktemp)
curl -fL --retry 3 --retry-delay 2  "$DOWNLOAD_URL" -o "$TMP_ARCHIVE"

echo "📂 Extracting files..."

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
tar --no-same-owner -xzf "$TMP_ARCHIVE" -C "$INSTALL_DIR"

rm "$TMP_ARCHIVE"

cd "$INSTALL_DIR" || {
  echo "❌ Failed to enter install directory."
  exit 1
}

echo "🐳 Starting zipup cloud..."

docker compose \
  -f docker-compose.base.yaml \
  -f docker-compose.release.yaml \
  up -d

echo ""
echo "✅ Zipup installed successfully!"
echo ""
echo "📂 Install directory: $INSTALL_DIR"
echo "🌐 Containers running in background"
echo ""
echo "Useful commands:"
echo "  docker compose ps"
echo "  docker compose logs -f"
echo ""
