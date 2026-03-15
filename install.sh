#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Installing Zipup4..."

REPO_OWNER="ankitaabad"
REPO_NAME="zipup"
INSTALL_DIR="$HOME/zipup"

echo "📦 Installing system dependencies..."
sudo apt update -y
sudo apt install -y curl tar jq ca-certificates

# Remove snap docker if present
if command -v snap >/dev/null && snap list | grep -q '^docker '; then
  echo "🧹 Removing Snap Docker..."
  sudo snap remove docker
fi

# Install docker if missing
if ! command -v docker >/dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
fi

sudo systemctl enable docker
sudo systemctl start docker

# Install compose plugin if missing
if ! docker compose version >/dev/null 2>&1; then
  echo "🔧 Installing Docker Compose plugin..."

  ARCH=$(uname -m)

  if [[ "$ARCH" == "x86_64" ]]; then
      COMPOSE_ARCH="x86_64"
  elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
      COMPOSE_ARCH="aarch64"
  else
      echo "❌ Unsupported architecture: $ARCH"
      exit 1
  fi

  sudo mkdir -p /usr/lib/docker/cli-plugins

  sudo curl -SL \
    "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${COMPOSE_ARCH}" \
    -o /usr/lib/docker/cli-plugins/docker-compose

  sudo chmod +x /usr/lib/docker/cli-plugins/docker-compose
fi

echo "✅ Docker Compose version:"
docker compose version

# Add user to docker group
if ! groups "$USER" | grep -q '\bdocker\b'; then
  echo "👤 Adding $USER to docker group..."
  sudo usermod -aG docker "$USER"
  echo "⚠️  Please log out and back in to use Docker without sudo."
fi

# Detect architecture for Zipup binary
echo "🧠 Detecting system architecture..."

ARCH=$(uname -m)

if [[ "$ARCH" == "x86_64" ]]; then
  APP_ARCH="x64"
elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  APP_ARCH="arm64"
else
  echo "❌ Unsupported architecture: $ARCH"
  exit 1
fi

echo "📦 Detected architecture: $ARCH → using ${APP_ARCH} build"

# Fetch latest release
echo "🔎 Fetching latest release..."

LATEST_TAG=$(curl -fsSL \
  "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest" \
  | jq -r '.tag_name')

if [[ -z "$LATEST_TAG" || "$LATEST_TAG" == "null" ]]; then
  echo "❌ Failed to fetch latest release."
  exit 1
fi

echo "📦 Latest release: $LATEST_TAG"

DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${LATEST_TAG}/myapp-${LATEST_TAG}-linux-${APP_ARCH}.tar.gz"

echo "⬇️ Downloading release..."
echo "🔗 $DOWNLOAD_URL"

TMP_ARCHIVE=$(mktemp)
curl -fL "$DOWNLOAD_URL" -o "$TMP_ARCHIVE"

echo "📂 Extracting files..."

mkdir -p "$INSTALL_DIR"
tar --no-same-owner -xzf "$TMP_ARCHIVE" -C "$INSTALL_DIR"

rm "$TMP_ARCHIVE"

cd "$INSTALL_DIR"

echo "🐳 Starting containers..."

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
