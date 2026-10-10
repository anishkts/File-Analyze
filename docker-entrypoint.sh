#!/bin/sh
set -e

# Ensure persistent volume directory and uploads directory exist with full write permissions
mkdir -p /app/data/uploads
chmod 777 /app/data 2>/dev/null || true
chmod 777 /app/data/uploads 2>/dev/null || true
chown -R nextjs:nodejs /app/data 2>/dev/null || true

# Execute command as nextjs user
exec su-exec nextjs "$@"
