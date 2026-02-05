#!/bin/bash
# ClawChat Backup Script
# Creates backups of PostgreSQL database and Synapse media

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

echo "=========================================="
echo "ClawChat Backup - $TIMESTAMP"
echo "=========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# =============================================================================
# PostgreSQL Backup
# =============================================================================
echo ""
echo "Backing up PostgreSQL database..."

PG_BACKUP_FILE="$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

docker exec clawchat-postgres pg_dump \
    -U synapse \
    -d synapse \
    --format=custom \
    --compress=9 \
    | gzip > "$PG_BACKUP_FILE"

PG_SIZE=$(du -h "$PG_BACKUP_FILE" | cut -f1)
echo "  PostgreSQL backup: $PG_BACKUP_FILE ($PG_SIZE)"

# =============================================================================
# Synapse Media Store Backup
# =============================================================================
echo ""
echo "Backing up Synapse media store..."

MEDIA_BACKUP_FILE="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"

docker run --rm \
    -v clawchat_synapse-data:/data:ro \
    -v "$(pwd)/$BACKUP_DIR":/backup \
    alpine \
    tar -czf "/backup/media_$TIMESTAMP.tar.gz" -C /data media_store 2>/dev/null || true

if [ -f "$MEDIA_BACKUP_FILE" ]; then
    MEDIA_SIZE=$(du -h "$MEDIA_BACKUP_FILE" | cut -f1)
    echo "  Media backup: $MEDIA_BACKUP_FILE ($MEDIA_SIZE)"
else
    echo "  No media to backup (or media_store doesn't exist yet)"
fi

# =============================================================================
# Synapse Signing Keys Backup
# =============================================================================
echo ""
echo "Backing up Synapse signing keys..."

KEYS_BACKUP_FILE="$BACKUP_DIR/keys_$TIMESTAMP.tar.gz"

docker run --rm \
    -v clawchat_synapse-data:/data:ro \
    -v "$(pwd)/$BACKUP_DIR":/backup \
    alpine \
    sh -c "cd /data && tar -czf /backup/keys_$TIMESTAMP.tar.gz *.signing.key 2>/dev/null" || true

if [ -f "$KEYS_BACKUP_FILE" ]; then
    KEYS_SIZE=$(du -h "$KEYS_BACKUP_FILE" | cut -f1)
    echo "  Keys backup: $KEYS_BACKUP_FILE ($KEYS_SIZE)"
fi

# =============================================================================
# Cleanup Old Backups
# =============================================================================
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null || true
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null || true

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=========================================="
echo "Backup Complete!"
echo "=========================================="
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Files created:"
ls -lh "$BACKUP_DIR"/*_$TIMESTAMP.* 2>/dev/null || echo "  (no files)"
echo ""

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Total backup directory size: $TOTAL_SIZE"
