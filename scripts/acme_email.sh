#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
KEY="ACME_EMAIL"

# Simple email regex
is_valid_email() {
  local email="$1"
  [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
}

# Prompt until valid email
while true; do
  read -rp "Enter your email (Let's Encrypt / ACME will use this for certificate expiry notices): " EMAIL

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

echo "🎉 Done! $KEY set in $ENV_FILE"