#!/bin/bash
# Create a new Matrix user
# Usage: ./create-user.sh <username> [password] [--admin]

set -e

USERNAME="$1"
PASSWORD="$2"
ADMIN_FLAG=""

if [ -z "$USERNAME" ]; then
    echo "Usage: $0 <username> [password] [--admin]"
    exit 1
fi

# Check for --admin flag
for arg in "$@"; do
    if [ "$arg" = "--admin" ]; then
        ADMIN_FLAG="--admin"
    fi
done

# Generate password if not provided
if [ -z "$PASSWORD" ] || [ "$PASSWORD" = "--admin" ]; then
    PASSWORD=$(openssl rand -base64 16)
    echo "Generated password: $PASSWORD"
fi

# Create user
docker exec -it clawchat-synapse register_new_matrix_user \
    -c /data/homeserver.yaml \
    -u "$USERNAME" \
    -p "$PASSWORD" \
    $ADMIN_FLAG

echo ""
echo "User created: @$USERNAME:$(grep server_name /home/exe/clawchat/server/homeserver.yaml | head -1 | awk '{print $2}' | tr -d '\"')"
