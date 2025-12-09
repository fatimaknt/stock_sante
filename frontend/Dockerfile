FROM node:18-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code
COPY . .

# Build
RUN npm run build

# Expose le port
EXPOSE 3000

# Lancer l'app
CMD ["npm", "start"]
