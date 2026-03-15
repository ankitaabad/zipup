#!/usr/bin/env bash
set -e

# --- 0. Update system and install dependencies ---
sudo apt update
sudo apt install -y curl tar jq apt-transport-https ca-certificates gnupg lsb-release software-properties-common

# --- 1. Remove snap Docker if present ---
if snap list | grep -q '^docker '; then
    echo "Removing snap Docker..."
    sudo snap remove docker
fi

# --- 2. Install Docker (APT) ---
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt install -y docker.io docker-compose
    sudo systemctl enable --now docker
fi

# --- 3. Add current user to docker group ---
if ! groups $USER | grep -q "\bdocker\b"; then
    echo "Adding $USER to docker group..."
    sudo usermod -aG docker $USER
    # Apply new group membership for current shell
    newgrp docker <<EONG
echo "Docker group applied for current shell"
EONG
fi

# --- 4. Set variables for GitHub release ---
REPO_OWNER="ankitaabad"
REPO_NAME="zipup"

# Fetch latest release tag
LATEST_TAG=$(curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest" \
  | jq -r .tag_name)

echo "Latest release: $LATEST_TAG"

# --- 5. Download release artifact ---
curl -L -o myapp.tar.gz \
  "https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${LATEST_TAG}/myapp-${LATEST_TAG}-linux-x64.tar.gz"

# --- 6. Extract artifact ---
mkdir -p artifact
tar -xzf myapp.tar.gz -C artifact
rm myapp.tar.gz
cd artifact

# --- 7. Run docker-compose (legacy standalone) ---
echo "Starting containers..."
docker-compose -f docker-compose.base.yaml -f docker-compose.release.yaml up
echo "✅ Installation complete. Containers are running."