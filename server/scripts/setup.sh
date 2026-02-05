#!/bin/bash
# ClawChat Server Setup Script
# Run this after docker-compose up -d

set -e

DOMAIN="${DOMAIN:-clawchat.io}"
BOT_USERNAME="${BOT_USERNAME:-clawbot}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

echo "=========================================="
echo "ClawChat Server Setup"
echo "=========================================="

# Wait for Synapse to be ready
echo "Waiting for Synapse to be ready..."
until curl -sf http://localhost:8008/health > /dev/null 2>&1; do
    echo "  Synapse not ready yet, waiting..."
    sleep 5
done
echo "Synapse is ready!"

# Generate passwords if not set
if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 16)
    echo ""
    echo "Generated admin password: $ADMIN_PASSWORD"
    echo "(Save this - it won't be shown again)"
fi

if [ -z "$BOT_PASSWORD" ]; then
    BOT_PASSWORD=$(openssl rand -base64 16)
    echo ""
    echo "Generated bot password: $BOT_PASSWORD"
    echo "(Save this - it won't be shown again)"
fi

# Create admin user
echo ""
echo "Creating admin user: @$ADMIN_USERNAME:$DOMAIN"
docker exec -it clawchat-synapse register_new_matrix_user \
    -c /data/homeserver.yaml \
    -u "$ADMIN_USERNAME" \
    -p "$ADMIN_PASSWORD" \
    --admin \
    2>/dev/null || echo "  User may already exist"

# Create bot user
echo ""
echo "Creating bot user: @$BOT_USERNAME:$DOMAIN"
docker exec -it clawchat-synapse register_new_matrix_user \
    -c /data/homeserver.yaml \
    -u "$BOT_USERNAME" \
    -p "$BOT_PASSWORD" \
    --admin \
    2>/dev/null || echo "  User may already exist"

# Get bot access token
echo ""
echo "Getting bot access token..."
BOT_TOKEN=$(curl -sf -X POST "http://localhost:8008/_matrix/client/r0/login" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"m.login.password\",\"user\":\"$BOT_USERNAME\",\"password\":\"$BOT_PASSWORD\"}" \
    | jq -r '.access_token')

if [ "$BOT_TOKEN" != "null" ] && [ -n "$BOT_TOKEN" ]; then
    echo ""
    echo "=========================================="
    echo "Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Bot Access Token:"
    echo "$BOT_TOKEN"
    echo ""
    echo "Add this to your clawdbot configuration:"
    echo ""
    echo "  MATRIX_ACCESS_TOKEN=$BOT_TOKEN"
    echo ""
    echo "Or configure clawdbot:"
    echo ""
    echo "  openclaw config set channels.matrix.accessToken \"$BOT_TOKEN\""
    echo ""
else
    echo "Failed to get bot access token"
    echo "You may need to manually login and get the token"
fi
