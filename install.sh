REPO_OWNER="ankitaabad"
REPO_NAME="passup"

# Fetch latest release JSON
LATEST_TAG=$(curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest" \
  | jq -r .tag_name)

echo "Latest release: $LATEST_TAG"

# Download artifact
curl -L -o myapp.tar.gz \
  "https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${LATEST_TAG}/myapp-${LATEST_TAG}-linux-x64.tar.gz"

# Extract and run docker-compose
mkdir -p artifact && tar -xzf myapp.tar.gz -C artifact
rm myapp.tar.gz
cd artifact
# docker-compose up -d
