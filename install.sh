#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "🚀 Installing Zipup..."

check_port_in_use() {
  local port=$1

  if ss -ltnup | grep -q ":$port "; then
    echo "❌ Port $port is already in use"
    ss -ltnup | grep ":$port "
    exit 1
  else
    echo "✅ Port $port is free"
  fi
}

echo "🔍 Checking required ports..."

check_port_in_use 80
check_port_in_use 443
check_port_in_use 51820
echo "🔐 Checking firewall (UFW)..."

if command -v ufw >/dev/null 2>&1; then
  if sudo ufw status | grep -q "Status: active"; then
    echo "⚠️ UFW is active."

    read -rp "Open required ports (80, 443, 51820)? (y/n): " choice
    if [[ "$choice" == "y" ]]; then
      sudo ufw allow 80/tcp
      sudo ufw allow 443/tcp
      sudo ufw allow 51820/udp
      sudo ufw reload
      echo "✅ Ports opened successfully."
    else
      echo "⚠️ Skipping firewall configuration."
    fi
  else
    echo "ℹ️ UFW is installed but not active. Skipping..."
  fi
else
  echo "ℹ️ UFW not installed. Skipping firewall configuration."
fi

echo ""
read -rp "⚠️ Ensure ports 80, 443, 51820 are accessible from internet (firewall). Press Enter to continue..."

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
    -days 3650 \
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

# pull node:24-bookworm-slim
echo "⬇️ Pulling base Docker image (node:24-bookworm-slim)..."
# since user apps uses this image, pull it now to avoid slow first run later
docker pull node:24-bookworm-slim 
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

REPO_OWNER="ankitaabad"
REPO_NAME="zipup"
LATEST_TAG=$(curl -fsSL \
  "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest" \
  | jq -r '.tag_name') || {
    echo "$REPO_OWNER/${REPO_NAME}: Failed to fetch latest release tag from GitHub API."
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
ENV_FILE=".env"
KEY="ACME_EMAIL"
echo ""
# Simple email regex
is_valid_email() {
  local email="$1"
  [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
}

# Prompt until valid email
while true; do
  read -rp "👉 Enter your email (Let's Encrypt / ACME will use this for certificate expiry notices): " EMAIL </dev/tty

  if is_valid_email "$EMAIL"; then
    break
  else
    echo "❌ Invalid email format. Please try again."
  fi
done

echo "✅ Valid email: $EMAIL"

# Ensure .env exists
touch "$ENV_FILE"

# Ensure file ends with newline
if [ -s "$ENV_FILE" ] && [ -n "$(tail -c1 "$ENV_FILE")" ]; then
  echo "" >> "$ENV_FILE"
fi

# Replace if exists, else append
if grep -q "^${KEY}=" "$ENV_FILE"; then
  echo "♻️ Updating existing $KEY in $ENV_FILE"
  sed -i.bak "s|^${KEY}=.*|${KEY}=${EMAIL}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
else
  echo "➕ Adding $KEY to $ENV_FILE"
  echo "${KEY}=${EMAIL}" >> "$ENV_FILE"
fi

echo "🎉 Done! $KEY set"

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