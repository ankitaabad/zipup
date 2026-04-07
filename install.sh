#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "🚀 Installing Zipup4..."

REPO_OWNER="ankitaabad"
REPO_NAME="zipup"
INSTALL_DIR="$HOME/zipup"
echo "📂 Installation directory: $INSTALL_DIR"
echo "cleaning up old install if exists..."
rm -rf "$INSTALL_DIR"
CERT_DIR="$INSTALL_DIR/certs"

ACCOUNT_KEY="$CERT_DIR/account.key"
DEFAULT_KEY="$CERT_DIR/default.key"
DEFAULT_CERT="$CERT_DIR/default.pem"

echo "👉 Ensuring cert directory exists..."
mkdir -p "$CERT_DIR"

# Check openssl exists
if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ OpenSSL is not installed. Please install it first."
  exit 1
fi

# Generate account key (for Let's Encrypt)
if [ -f "$ACCOUNT_KEY" ]; then
  echo "✅ account.key already exists, skipping..."
else
  echo "🔐 Generating account.key..."
  openssl genpkey \
    -algorithm RSA \
    -pkeyopt rsa_keygen_bits:4096 \
    -out "$ACCOUNT_KEY"
fi

# Generate fallback key + cert
if [ -f "$DEFAULT_KEY" ] && [ -f "$DEFAULT_CERT" ]; then
  echo "✅ default.key and default.pem already exist, skipping..."
else
  echo "🔐 Generating default.key and default.pem..."

  openssl req \
    -newkey rsa:2048 \
    -nodes \
    -keyout "$DEFAULT_KEY" \
    -x509 \
    -days 365 \
    -out "$DEFAULT_CERT" \
    -subj "/CN=localhost"
fi

echo "🎉 Certificate setup complete!"

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

# Check docker daemon (use sudo to be safe)
if ! sudo docker info >/dev/null 2>&1; then
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

# Add user to docker group (for future runs)
if ! groups "$USER" | grep -q '\bdocker\b'; then
  echo "👤 Adding $USER to docker group..."
  sudo usermod -aG docker "$USER"
  echo "⚠️  Docker will work without sudo after next login."
fi

# Decide how to run docker NOW
if docker info >/dev/null 2>&1; then
  DOCKER_CMD="docker"
else
  echo "⚠️  Using sudo for Docker (group not active yet)"
  DOCKER_CMD="sudo docker"
fi

echo "🧠 Detecting system architecture..."

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
curl -fL --retry 3 --retry-delay 2 "$DOWNLOAD_URL" -o "$TMP_ARCHIVE"

echo "📂 Extracting files..."


mkdir -p "$INSTALL_DIR"
tar --no-same-owner -xzf "$TMP_ARCHIVE" -C "$INSTALL_DIR"

rm "$TMP_ARCHIVE"

cd "$INSTALL_DIR" || {
  echo "❌ Failed to enter install directory."
  exit 1
}

echo "🐳 Starting zipup cloud..."

$DOCKER_CMD compose \
  -f docker-compose.base.yaml \
  -f docker-compose.release.yaml \
  up -d \
  --build
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