#!/bin/sh
# Fix permissions on /app/data before dropping to nextjs user.
# The host bind-mount is typically owned by UID 1000; nextjs is UID 1001.
chown -R nextjs:nodejs /app/data 2>/dev/null || true
exec su-exec nextjs "$@"
