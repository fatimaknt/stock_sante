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

EXPOSE 8000

# Copier le script de démarrage
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Lancer l'app
CMD ["/app/start.sh"]
