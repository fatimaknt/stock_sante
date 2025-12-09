FROM php:8.2-cli

WORKDIR /app

# Installer les extensions PHP requises et les dépendances
RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    && docker-php-ext-install pdo pdo_mysql

# Copier composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copier le code
COPY . .

# Installer les dépendances
RUN composer install --no-dev --optimize-autoloader

# Exposer le port
EXPOSE 8000

# Script de démarrage avec migrations
RUN echo '#!/bin/bash\nphp artisan migrate --force --no-interaction || true\nexec php -S 0.0.0.0:8000 -t public' > /app/start.sh && chmod +x /app/start.sh

# Lancer l'app
CMD ["/app/start.sh"]
