# 🚀 Guide de Déploiement sur DigitalOcean App Platform

## 📋 Pré-requis

- ✅ Compte DigitalOcean (créé)
- ✅ Repository GitHub (fatimaknt/stock_sante)
- ✅ Branch principale: `main`
- ✅ Code optimisé pushé

## 🔑 Étapes de Déploiement

### 1️⃣ Accéder à DigitalOcean

```
1. Allez sur: https://cloud.digitalocean.com
2. Connectez-vous avec vos identifiants
3. Allez sur "Apps" (dans le menu gauche)
```

### 2️⃣ Créer une Nouvelle App

```
1. Cliquez "Create App" (bouton bleu)
2. Sélectionnez "GitHub"
3. Autorisez DigitalOcean à accéder à votre GitHub
4. Sélectionnez le repo: fatimaknt/stock_sante
5. Branch: main
6. Source: Dockerfile (ou Auto-detect)
```

### 3️⃣ Configuration des Services

#### **Service 1: Frontend (Next.js)**

```yaml
Name: frontend
Source: GitHub (Dockerfile)
Branch: main
Dockerfile Path: frontend/Dockerfile
Port: 3000
HTTP Routes:
  - /
  - /*
Domains: 
  - stockpro.your-domain.com (ou auto-généré)
Environment Variables:
  NEXT_PUBLIC_API_URL: https://api-stock-sante-xxxx.ondigitalocean.app/api
  NODE_ENV: production
```

#### **Service 2: Backend (Laravel)**

```yaml
Name: backend
Source: GitHub (Dockerfile)
Branch: main
Dockerfile Path: api/Dockerfile
Port: 8000
HTTP Routes:
  - /api
  - /api/*
Domains:
  - api-stock-sante-xxxx.ondigitalocean.app (auto-généré)
Environment Variables:
  APP_ENV: production
  APP_DEBUG: false
  APP_URL: https://api-stock-sante-xxxx.ondigitalocean.app
  NEXT_PUBLIC_FRONTEND_URL: https://stockpro.your-domain.com
  DB_HOST: db-mysql-fra1-xxxxx.ondigitalocean.com
  DB_PORT: 25060
  DB_DATABASE: stock_sante
  DB_USERNAME: doadmin
  DB_PASSWORD: [Généré automatiquement]
  JWT_SECRET: [Générez une clé sécurisée]
  APP_KEY: base64:nw2mYqHl/oYvQa9pLkRtZwXbCdEfGhIjKmNoPqRsTuVwXyZaBc
```

### 4️⃣ Ajouter la Base de Données

```
1. Dans "Resources", cliquez "Create Database"
2. Type: MySQL
3. Name: db
4. Region: Franc (FRA) - même région que l'app
5. Version: 8.0
6. Plan: Basic ($15/mois initial)
```

**Important**: Une fois créée, notez les credentials:
- Host: `db-mysql-fra1-xxxxx.ondigitalocean.com`
- Port: `25060`
- Database: `stock_sante`
- Username: `doadmin`
- Password: [Affiché une seule fois]

### 5️⃣ Variables d'Environnement Sécurisées

#### **Frontend**
```env
NEXT_PUBLIC_API_URL=https://api-stock-sante-xxxx.ondigitalocean.app/api
NODE_ENV=production
```

#### **Backend**
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api-stock-sante-xxxx.ondigitalocean.app
SANCTUM_STATEFUL_DOMAINS=votre-domaine.com,www.votre-domaine.com
JWT_SECRET=<clé-secrète-32-caractères>
APP_KEY=base64:nw2mYqHl/oYvQa9pLkRtZwXbCdEfGhIjKmNoPqRsTuVwXyZaBc
DB_CONNECTION=mysql
DB_HOST=<host-digitalocean>
DB_PORT=25060
DB_DATABASE=stock_sante
DB_USERNAME=doadmin
DB_PASSWORD=<mot-de-passe-bd>
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
```

### 6️⃣ Validation du Déploiement

```
1. Attendez que les builds se terminent (10-15 min)
2. Vérifiez les logs:
   - Frontend: npm start doit réussir
   - Backend: php -S 0.0.0.0:8000 doit démarrer
   - Database: Vérifiez la connexion

3. Test:
   - Frontend: https://stockpro-xxx.ondigitalocean.app
   - Backend: https://api-stock-sante-xxx.ondigitalocean.app/api/health
```

## 🔐 Sécurité - À Vérifier

- [ ] HTTPS activé (automatique avec DigitalOcean)
- [ ] Variables sensibles dans Secrets (pas en code)
- [ ] CORS configuré dans Laravel (autoriser frontend uniquement)
- [ ] Firewall activé sur DigitalOcean
- [ ] Backups BD configurés
- [ ] Logs centralisés activés

### Configuration CORS (api/config/cors.php)

```php
'allowed_origins' => [
    'https://votre-domaine.com',
    'https://www.votre-domaine.com',
    'https://stockpro-xxx.ondigitalocean.app',
],
```

## 🚨 Problèmes Courants

### **"Database connection refused"**
- Vérifier que le port BD est 25060 (pas 3306)
- Vérifier les credentials DB
- Vérifier que l'app a accès au BD (même région)

### **"Frontend ne trouve pas l'API"**
- Vérifier NEXT_PUBLIC_API_URL
- Vérifier les CORS
- Vérifier que le backend est UP

### **"Build fails"**
- Vérifier les logs: Apps > Nom > Build Logs
- Vérifier que les Dockerfiles existent
- Vérifier les dépendances (package.json, composer.json)

## 📊 Monitoring

```
DigitalOcean > Apps > Votre App:
- Logs: Voir les erreurs en temps réel
- Metrics: CPU, RAM, Bande passante
- Alerts: Configurer des alertes
```

## 🎉 Bravo !

Votre app est maintenant en production sur DigitalOcean ! 🚀

- Frontend: https://votre-domaine.com
- Backend API: https://api.votre-domaine.com
- Securité: SOC2 compliant, chiffrée, backup auto

---

**Questions? Consultez:**
- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- Laravel Deployment: https://laravel.com/docs/deployment
- Next.js Production: https://nextjs.org/docs/deployment
