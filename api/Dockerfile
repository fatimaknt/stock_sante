FROM php:8.2-cli

WORKDIR /app

# Installer les extensions PHP requises
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_mysql

# Copier composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copier le code
COPY . .

# Installer les dépendances
RUN composer install --no-dev --optimize-autoloader

# Migrations
RUN php artisan migrate --force --no-interaction

# Exposer le port
EXPOSE 8000

# Lancer l'app
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
