#!/usr/bin/env bash
# ==============================================================================
# Database and Uploads Backup Script for Coupon Verification System
# ==============================================================================
set -euo pipefail

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "=== Starting Coupon Verification System Backup ==="
echo "Target Backup Directory: $BACKUP_DIR"

# 1. Backup MongoDB database using mongodump inside container
echo "[1/2] Creating MongoDB dump..."
docker exec coupon-system-mongodb mongodump --db coupon_verification_db --gzip --archive=/tmp/mongo_dump.gz
docker cp coupon-system-mongodb:/tmp/mongo_dump.gz "$BACKUP_DIR/mongo_dump.gz"
docker exec coupon-system-mongodb rm /tmp/mongo_dump.gz
echo "MongoDB backup saved to $BACKUP_DIR/mongo_dump.gz"

# 2. Backup uploaded coupon images
echo "[2/2] Archiving uploaded coupon images..."
docker run --rm \
  -v coupon-system-uploads:/data:ro \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar -czf /backup/coupon_uploads.tar.gz -C /data .
echo "Uploaded photos archive saved to $BACKUP_DIR/coupon_uploads.tar.gz"

echo "=== Backup Successfully Completed! ==="
ls -lh "$BACKUP_DIR"

