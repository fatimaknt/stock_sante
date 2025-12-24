#!/bin/bash
set -e

echo "=== Setting up Laravel ==="
php artisan cache:clear 2>&1 || true
php artisan config:clear 2>&1 || true

echo "=== Checking storage permissions ==="
mkdir -p /app/storage/logs
chmod -R 775 /app/storage

echo "=== Running Migrations ==="
php artisan migrate --force 2>&1 || echo "Migration encountered an issue but continuing..."

# DISABLED IN PRODUCTION - Seeders cause data duplication
# The seeders use firstOrCreate() which recreates data even if deleted
# echo "=== Running Seeds ==="
# php artisan db:seed --force 2>&1 || echo "Seeding encountered an issue but continuing..."

echo "=== Testing Laravel bootstrap ==="
php artisan tinker --execute='echo "Laravel OK\n";' 2>&1 || echo "Tinker test skipped"

echo "=== Starting PHP Server with Debug ==="
exec php -d display_errors=On -d error_reporting=E_ALL -d error_log=/app/storage/logs/php-error.log -S 0.0.0.0:8000 -t public
