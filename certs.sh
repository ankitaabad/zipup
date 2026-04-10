#!/usr/bin/env bash

set -e

CERT_DIR="./certs"

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
    -days 0 \
    -out "$DEFAULT_CERT" \
    -subj "/CN=localhost"
fi

echo "🎉 Certificate setup complete!"