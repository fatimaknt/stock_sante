FROM php:8.2-cli

WORKDIR /app

# Installer les extensions PHP requises et les dépendances
RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql

# Copier composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copier le code
COPY . .

# Installer les dépendances
RUN composer install --no-dev --optimize-autoloader

# Générer la clé d'application
RUN php artisan key:generate --force || true

# Exposer le port
EXPOSE 8000

# Script de démarrage avec migrations et serveur
RUN echo '#!/bin/bash\n\
echo "=== Setting up Laravel ==="\n\
php artisan cache:clear\n\
php artisan config:clear\n\
echo "=== Running Migrations ==="\n\
php artisan migrate --force 2>&1 || echo "Migration encountered an issue but continuing..."\n\
echo "=== Starting PHP Server ==="\n\
php -S 0.0.0.0:8000 -t public' > /app/start.sh && chmod +x /app/start.sh

# Lancer l'app
CMD ["/app/start.sh"]
