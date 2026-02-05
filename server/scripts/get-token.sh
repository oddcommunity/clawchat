#!/bin/bash
# Get access token for a Matrix user
# Usage: ./get-token.sh <username> <password>

set -e

USERNAME="$1"
PASSWORD="$2"
HOMESERVER="${HOMESERVER:-http://localhost:8008}"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <username> <password>"
    echo ""
    echo "Environment variables:"
    echo "  HOMESERVER - Matrix homeserver URL (default: http://localhost:8008)"
    exit 1
fi

RESPONSE=$(curl -sf -X POST "${HOMESERVER}/_matrix/client/r0/login" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"m.login.password\",\"user\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$RESPONSE" | jq -r '.user_id')
DEVICE_ID=$(echo "$RESPONSE" | jq -r '.device_id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "User ID: $USER_ID"
    echo "Device ID: $DEVICE_ID"
    echo ""
    echo "Access Token:"
    echo "$TOKEN"
else
    echo "Login failed"
    echo "$RESPONSE"
    exit 1
fi
