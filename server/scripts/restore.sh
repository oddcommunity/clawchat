#!/bin/bash
# ClawChat Restore Script
# Restores from backup files

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"

echo "=========================================="
echo "ClawChat Restore"
echo "=========================================="

# List available backups
echo ""
echo "Available PostgreSQL backups:"
ls -lh "$BACKUP_DIR"/postgres_*.sql.gz 2>/dev/null || echo "  None found"

echo ""
echo "Available media backups:"
ls -lh "$BACKUP_DIR"/media_*.tar.gz 2>/dev/null || echo "  None found"

echo ""
echo "Available keys backups:"
ls -lh "$BACKUP_DIR"/keys_*.tar.gz 2>/dev/null || echo "  None found"

# Get backup timestamp from user
echo ""
read -p "Enter backup timestamp to restore (e.g., 20240115_120000): " TIMESTAMP

if [ -z "$TIMESTAMP" ]; then
    echo "No timestamp provided. Aborting."
    exit 1
fi

PG_BACKUP="$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"
MEDIA_BACKUP="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"
KEYS_BACKUP="$BACKUP_DIR/keys_$TIMESTAMP.tar.gz"

# Verify at least one backup exists
if [ ! -f "$PG_BACKUP" ] && [ ! -f "$MEDIA_BACKUP" ] && [ ! -f "$KEYS_BACKUP" ]; then
    echo "No backup files found for timestamp: $TIMESTAMP"
    exit 1
fi

echo ""
echo "Found backup files:"
[ -f "$PG_BACKUP" ] && echo "  - $PG_BACKUP"
[ -f "$MEDIA_BACKUP" ] && echo "  - $MEDIA_BACKUP"
[ -f "$KEYS_BACKUP" ] && echo "  - $KEYS_BACKUP"

echo ""
echo "WARNING: This will overwrite existing data!"
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborting."
    exit 1
fi

# =============================================================================
# Stop Services
# =============================================================================
echo ""
echo "Stopping services..."
docker-compose stop synapse clawdbot 2>/dev/null || true

# =============================================================================
# Restore PostgreSQL
# =============================================================================
if [ -f "$PG_BACKUP" ]; then
    echo ""
    echo "Restoring PostgreSQL database..."

    # Drop and recreate database
    docker exec clawchat-postgres psql -U synapse -c "DROP DATABASE IF EXISTS synapse_restore;"
    docker exec clawchat-postgres psql -U synapse -c "CREATE DATABASE synapse_restore;"

    # Restore backup
    gunzip -c "$PG_BACKUP" | docker exec -i clawchat-postgres pg_restore \
        -U synapse \
        -d synapse_restore \
        --no-owner \
        --no-privileges \
        2>/dev/null || true

    # Swap databases
    docker exec clawchat-postgres psql -U synapse -c "
        SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'synapse';
    " 2>/dev/null || true
    docker exec clawchat-postgres psql -U synapse -c "DROP DATABASE synapse;"
    docker exec clawchat-postgres psql -U synapse -c "ALTER DATABASE synapse_restore RENAME TO synapse;"

    echo "  PostgreSQL restored."
fi

# =============================================================================
# Restore Media
# =============================================================================
if [ -f "$MEDIA_BACKUP" ]; then
    echo ""
    echo "Restoring Synapse media store..."

    docker run --rm \
        -v clawchat_synapse-data:/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine \
        sh -c "rm -rf /data/media_store && tar -xzf /backup/media_$TIMESTAMP.tar.gz -C /data"

    echo "  Media restored."
fi

# =============================================================================
# Restore Keys
# =============================================================================
if [ -f "$KEYS_BACKUP" ]; then
    echo ""
    echo "Restoring Synapse signing keys..."

    docker run --rm \
        -v clawchat_synapse-data:/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine \
        tar -xzf "/backup/keys_$TIMESTAMP.tar.gz" -C /data

    echo "  Keys restored."
fi

# =============================================================================
# Restart Services
# =============================================================================
echo ""
echo "Starting services..."
docker-compose up -d synapse

echo ""
echo "=========================================="
echo "Restore Complete!"
echo "=========================================="
echo ""
echo "Services restarted. Check logs with:"
echo "  docker-compose logs -f synapse"
