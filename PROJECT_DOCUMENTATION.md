# Documentation du Projet Stock Santé

## Vue d'ensemble
Application de gestion de stock et de flotte automobile avec interface web moderne. Le projet utilise Laravel (API) et Next.js/React (Frontend).

## Architecture Technique

### Backend (API Laravel)
- **Framework**: Laravel
- **Base de données**: MySQL
- **Authentification**: Laravel Sanctum
- **Structure**: API RESTful

### Frontend
- **Framework**: Next.js avec React
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **State Management**: React Context API

## Structure de la Base de Données

### Tables Principales

#### `users`
- `id` (primary key)
- `name`
- `email`
- `password`
- `role` (Administrateur, Gestionnaire, Utilisateur)
- `permissions` (JSON array)
- `status` (actif/inactif)
- `email_verified_at`
- `remember_token`
- `created_at`, `updated_at`

#### `categories`
- `id` (primary key)
- `name`
- `description` (nullable)
- `created_at`, `updated_at`

#### `products`
- `id` (primary key)
- `name`
- `description` (nullable)
- `category_id` (foreign key → categories)
- `quantity` (integer, default 0)
- `price` (decimal)
- `unit` (string)
- `critical_level` (integer, default 0)
- `product_ref` (string, nullable)
- `created_at`, `updated_at`

#### `receipts`
- `id` (primary key)
- `supplier` (string)
- `received_at` (date)
- `notes` (text, nullable)
- `created_at`, `updated_at`

#### `receipt_items`
- `id` (primary key)
- `receipt_id` (foreign key → receipts)
- `product_id` (foreign key → products)
- `quantity` (integer)
- `unit_price` (decimal)
- `created_at`, `updated_at`

#### `stock_movements`
- `id` (primary key)
- `product_id` (foreign key → products)
- `type` (enum: 'receipt', 'stockout', 'adjustment')
- `quantity` (integer)
- `movement_date` (date)
- `beneficiary` (string, nullable)
- `agent` (string, nullable)
- `notes` (text, nullable)
- `exit_type` (string, nullable - 'Provisoire' ou null)
- `status` (string, nullable - 'Complétée', 'Retournée', etc.)
- `created_at`, `updated_at`

#### `inventories`
- `id` (primary key)
- `agent` (string)
- `counted_at` (date)
- `notes` (text, nullable)
- `created_at`, `updated_at`

#### `inventory_items`
- `id` (primary key)
- `inventory_id` (foreign key → inventories)
- `product_id` (foreign key → products)
- `theoretical_qty` (integer)
- `counted_qty` (integer)
- `variance` (integer)
- `created_at`, `updated_at`

#### `vehicles`
- `id` (primary key)
- `brand` (string)
- `model` (string)
- `license_plate` (string, unique)
- `acquisition_date` (date)
- `status` (enum: 'pending', 'assigned', 'reformed')
- `created_at`, `updated_at`

#### `vehicle_assignments`
- `id` (primary key)
- `vehicle_id` (foreign key → vehicles)
- `assigned_to` (string)
- `assigned_at` (date)
- `notes` (text, nullable)
- `created_at`, `updated_at`

## Routes API

### Authentification (`/api/auth`)
- `POST /register` - Inscription (admin uniquement)
- `POST /login` - Connexion
- `POST /logout` - Déconnexion
- `GET /user` - Récupérer l'utilisateur connecté
- `POST /invite` - Inviter un utilisateur (admin uniquement)
- `POST /activate` - Activer un compte via token d'invitation
- `GET /google/redirect` - Redirection Google OAuth
- `GET /google/callback` - Callback Google OAuth

### Produits (`/api/products`)
- `GET /products` - Liste des produits (permission: 'Gestion stock')
- `POST /products` - Créer un produit (permission: 'Gestion stock')
- `PUT /products/{id}` - Modifier un produit (permission: 'Gestion stock')
- `DELETE /products/{id}` - Supprimer un produit (permission: 'Gestion stock')

### Catégories (`/api/categories`)
- `GET /categories` - Liste des catégories
- `POST /categories` - Créer une catégorie (permission: 'Gestion stock')
- `PUT /categories/{id}` - Modifier une catégorie (permission: 'Gestion stock')
- `DELETE /categories/{id}` - Supprimer une catégorie (permission: 'Gestion stock')

### Réceptions (`/api/receipts`)
- `GET /receipts` - Liste des réceptions (permission: 'Réceptions')
- `POST /receipts` - Créer une réception (permission: 'Réceptions')
- `PUT /receipts/{id}` - Modifier une réception (permission: 'Réceptions')
- `DELETE /receipts/{id}` - Supprimer une réception (permission: 'Réceptions')

### Sorties (`/api/stockout`)
- `GET /stockout` - Liste des sorties (permission: 'Sorties')
- `POST /stockout` - Créer une sortie (permission: 'Sorties')
- `DELETE /stockout/{id}` - Supprimer une sortie (permission: 'Sorties')

### Inventaires (`/api/inventory`)
- `GET /inventory` - Liste des inventaires (permission: 'Inventaire')
- `POST /inventory` - Créer un inventaire (permission: 'Inventaire')

### Véhicules (`/api/vehicles`)
- `GET /vehicles` - Liste des véhicules
- `POST /vehicles` - Créer un véhicule
- `POST /vehicles/{id}/assign` - Affecter un véhicule
- `POST /vehicles/{id}/unassign` - Désaffecter un véhicule
- `POST /vehicles/{id}/reform` - Réformer un véhicule

### Utilisateurs (`/api/users`)
- `GET /users` - Liste des utilisateurs (admin uniquement)
- `PUT /users/{id}` - Modifier un utilisateur (admin uniquement)
- `DELETE /users/{id}` - Supprimer un utilisateur (admin uniquement)

### Alertes (`/api/alerts`)
- `GET /alerts` - Liste des alertes (permission: 'Alertes')

### Rapports (`/api/reports`)
- `GET /reports` - Générer des rapports (permission: 'Rapports')

### Paramètres (`/api/settings`)
- `GET /settings` - Récupérer les paramètres (admin uniquement)
- `PUT /settings` - Modifier les paramètres (admin uniquement)

## Système de Permissions et Rôles

### Rôles
1. **Administrateur**: Accès complet à toutes les fonctionnalités
2. **Gestionnaire**: Accès basé sur les permissions assignées
3. **Utilisateur**: Accès basé sur les permissions assignées

### Permissions Disponibles
- `Gestion stock` - Gestion des produits et catégories
- `Réceptions` - Gestion des réceptions
- `Sorties` - Gestion des sorties
- `Inventaire` - Gestion des inventaires
- `Alertes` - Consultation des alertes
- `Rapports` - Génération de rapports
- `Administration` - Gestion des utilisateurs et paramètres

### Permissions par Défaut
- **Administrateur**: Toutes les permissions + accès admin
- **Gestionnaire**: `['Gestion stock', 'Réceptions', 'Sorties', 'Inventaire', 'Alertes', 'Rapports']`
- **Utilisateur**: `['Gestion stock', 'Réceptions', 'Sorties']`

## Fonctionnalités Frontend

### Pages Principales

#### Dashboard (`/`)
- Vue d'ensemble avec statistiques
- Graphiques de tendances
- Produits à faible stock
- Dernières activités

#### Produits (`/products`)
- Liste des produits avec recherche et filtres
- Création/Modification/Suppression de produits
- Gestion des catégories
- Affichage du niveau de stock critique

#### Réceptions (`/receipts`)
- Liste des réceptions
- Création de réception avec plusieurs produits
- Modification et suppression
- Export PDF
- Mise à jour automatique du stock

#### Sorties (`/stockout`)
- Liste des sorties
- Création de sortie (Provisoire ou Définitive)
- Gestion des retours (pour sorties provisoires)
- Export PDF
- Décrementation automatique du stock

#### Inventaires (`/inventory`)
- Liste des inventaires
- Création d'inventaire avec comptage
- Calcul automatique des écarts
- Ajustement automatique du stock

#### Véhicules (`/vehicles`)
- Liste des véhicules
- Création de véhicule
- Affectation/Désaffectation
- Réforme de véhicule
- Section "Véhicules en attente d'affectation"

#### Alertes (`/alerts`)
- Produits en rupture de stock
- Produits en stock critique
- Véhicules nécessitant une maintenance

#### Rapports (`/reports`)
- Rapports de stock
- Rapports de mouvements
- Rapports financiers
- Export PDF

#### Agent IA (`/ai-agent`)
- Interface de chat avec assistant IA
- Conseils sur la gestion de stock et flotte
- Analyse et recommandations

#### Utilisateurs (`/user`)
- Liste des utilisateurs (admin uniquement)
- Création d'invitation
- Modification des permissions
- Activation/Désactivation de comptes

#### Paramètres (`/settings`)
- Configuration de l'organisation
- Paramètres généraux
- Gestion des préférences

### Composants Principaux

#### Layout
- Sidebar avec navigation
- TopBar avec profil utilisateur
- Système de collapse/expand pour la sidebar

#### AuthGuard
- Protection des routes
- Vérification des permissions
- Redirection automatique si non autorisé

#### AuthContext
- Gestion de l'état d'authentification
- Gestion des permissions
- Rechargement automatique du contexte utilisateur

## Logique Métier

### Gestion de Stock

#### Réception
1. Création d'une réception avec produits
2. Création des `receipt_items`
3. Création d'un `stock_movement` de type 'receipt'
4. Incrémentation de la quantité du produit

#### Sortie
1. Création d'une sortie
2. Création d'un `stock_movement` de type 'stockout'
3. Vérification de la disponibilité du stock
4. Décrementation de la quantité du produit
5. Si sortie provisoire, possibilité de retour

#### Inventaire
1. Création d'un inventaire avec comptage
2. Calcul de l'écart (variance)
3. Si écart ≠ 0, création d'un `stock_movement` de type 'adjustment'
4. Mise à jour de la quantité du produit

### Gestion de Flotte

#### Véhicule
- Création avec statut 'pending'
- Affectation à un utilisateur (statut → 'assigned')
- Désaffectation (statut → 'pending')
- Réforme (statut → 'reformed')

## Sécurité

### Backend
- Middleware `auth:sanctum` pour toutes les routes protégées
- Vérification des rôles et permissions dans les contrôleurs
- Validation des données avec Laravel Request Validation
- Protection CSRF

### Frontend
- Vérification des permissions avant affichage
- Protection des routes avec `AuthGuard`
- Gestion sécurisée des tokens dans `localStorage`
- Redirection automatique si non authentifié

## Configuration

### Variables d'Environnement Backend (`.env`)
```
APP_NAME=StockSante
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=stock_sante
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost
```

### Variables d'Environnement Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Installation

### Backend
```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Structure des Fichiers

```
stock_sante/
├── api/
│   ├── app/
│   │   ├── Http/
│   │   │   └── Controllers/
│   │   │       └── Api/
│   │   │           ├── AuthController.php
│   │   │           ├── ProductController.php
│   │   │           ├── CategoryController.php
│   │   │           ├── ReceiptController.php
│   │   │           ├── StockOutController.php
│   │   │           ├── InventoryController.php
│   │   │           ├── VehicleController.php
│   │   │           ├── UserController.php
│   │   │           └── ...
│   │   └── Models/
│   │       ├── User.php
│   │       ├── Product.php
│   │       ├── Receipt.php
│   │       └── ...
│   ├── database/
│   │   └── migrations/
│   └── routes/
│       └── api.php
└── frontend/
    ├── components/
    │   ├── Layout.tsx
    │   ├── Sidebar.tsx
    │   ├── TopBar.tsx
    │   └── AuthGuard.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   └── SettingsContext.tsx
    ├── pages/
    │   ├── index.tsx (Dashboard)
    │   ├── products.tsx
    │   ├── receipts.tsx
    │   ├── stockout.tsx
    │   ├── inventory.tsx
    │   ├── vehicles.tsx
    │   ├── alerts.tsx
    │   ├── reports.tsx
    │   ├── ai-agent.tsx
    │   ├── user.tsx
    │   ├── settings.tsx
    │   └── login.tsx
    └── utils/
        └── api.ts
```

## Fonctionnalités Clés à Implémenter

1. **Système d'authentification complet** avec rôles et permissions
2. **Gestion de stock** (produits, catégories, réceptions, sorties)
3. **Inventaires** avec calcul automatique des écarts
4. **Gestion de flotte** (véhicules, affectations)
5. **Système d'alertes** pour stock critique
6. **Rapports** avec export PDF
7. **Interface Agent IA** pour conseils et recommandations
8. **Dashboard** avec statistiques et graphiques
9. **Gestion des utilisateurs** avec invitations
10. **Paramètres** de l'organisation

## Notes Importantes

- Toutes les opérations de stock (réceptions, sorties, inventaires) mettent à jour automatiquement les quantités des produits
- Les sorties provisoires peuvent être retournées
- Les inventaires créent automatiquement des ajustements de stock si nécessaire
- Le système de permissions est granulaire et basé sur les rôles
- L'interface est responsive et moderne avec Tailwind CSS
- L'authentification utilise Laravel Sanctum avec tokens

## Technologies Utilisées

- **Backend**: Laravel 10+, PHP 8.1+
- **Frontend**: Next.js 13+, React 18+, TypeScript
- **Base de données**: MySQL 8.0+
- **Styling**: Tailwind CSS 3+
- **Icons**: Heroicons
- **PDF**: jsPDF
- **Charts**: Recharts

