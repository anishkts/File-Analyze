#!/bin/sh
set -e

# Ensure persistent volume directory and uploads directory exist with proper permissions
mkdir -p /app/data/uploads
chown -R nextjs:nodejs /app/data 2>/dev/null || true
chmod -R 775 /app/data 2>/dev/null || true

# Execute command as nextjs user
exec su-exec nextjs "$@"
