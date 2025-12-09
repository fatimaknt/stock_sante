# Instructions pour Cursor - Création de l'Application Stock Santé

## Objectif
Créer une application complète de gestion de stock et de flotte automobile avec les fonctionnalités décrites dans `PROJECT_DOCUMENTATION.md`, **MAIS SANS le système d'approbation des opérations** (voir `EXCLUSIONS.md`).

## Points Critiques

### ✅ À IMPLÉMENTER
1. **Système d'authentification complet** avec rôles (Administrateur, Gestionnaire, Utilisateur) et permissions
2. **Gestion de stock** : Produits, Catégories, Réceptions, Sorties
3. **Inventaires** avec calcul automatique des écarts
4. **Gestion de flotte** : Véhicules, Affectations
5. **Système d'alertes** pour produits en stock critique
6. **Rapports** avec export PDF
7. **Interface Agent IA** (page de chat simple)
8. **Dashboard** avec statistiques
9. **Gestion des utilisateurs** avec invitations par email
10. **Paramètres** de l'organisation

### ❌ À NE PAS IMPLÉMENTER
- **Système d'approbation** : Toutes les opérations doivent être exécutées directement
- Table `pending_operations`
- Contrôleur `ApprovalController`
- Boutons "Approuver/Rejeter" dans le frontend
- Statuts "En attente" ou "Rejetée"

## Architecture à Suivre

### Backend (Laravel)
- Structure API RESTful
- Authentification avec Laravel Sanctum
- Middleware pour vérifier les permissions
- Validation des données avec Form Requests
- Relations Eloquent entre modèles

### Frontend (Next.js + React + TypeScript)
- Pages avec Layout commun (Sidebar + TopBar)
- Context API pour l'authentification et les paramètres
- Protection des routes avec AuthGuard
- Interface moderne avec Tailwind CSS
- Composants réutilisables

## Étapes de Développement Recommandées

### Phase 1 : Configuration de Base
1. Initialiser le projet Laravel
2. Configurer la base de données
3. Créer les migrations pour toutes les tables
4. Créer les modèles Eloquent avec relations
5. Initialiser le projet Next.js
6. Configurer Tailwind CSS

### Phase 2 : Authentification
1. Implémenter l'API d'authentification (register, login, logout)
2. Implémenter le système de rôles et permissions
3. Créer les pages de login/register
4. Créer AuthContext et AuthGuard
5. Implémenter l'invitation par email

### Phase 3 : Gestion de Stock
1. API Produits (CRUD)
2. API Catégories (CRUD)
3. API Réceptions (CRUD avec items)
4. API Sorties (CRUD)
5. Pages frontend correspondantes
6. Mise à jour automatique du stock

### Phase 4 : Inventaires
1. API Inventaires (CRUD avec items)
2. Calcul automatique des écarts
3. Ajustement automatique du stock
4. Page frontend

### Phase 5 : Véhicules
1. API Véhicules (CRUD)
2. API Affectations
3. Page frontend avec gestion des affectations

### Phase 6 : Fonctionnalités Avancées
1. Système d'alertes
2. Dashboard avec statistiques
3. Rapports avec export PDF
4. Page Agent IA (interface de chat simple)
5. Gestion des utilisateurs
6. Paramètres

## Règles de Sécurité

1. **Backend** : Toujours vérifier les permissions dans les contrôleurs
2. **Frontend** : Cacher les éléments selon les permissions
3. **Routes** : Protéger toutes les routes API avec `auth:sanctum`
4. **Validation** : Valider toutes les données d'entrée

## Comportement des Opérations

### Réception
```
Utilisateur crée réception → 
  - Création dans table `receipts`
  - Création des `receipt_items`
  - Création `stock_movement` type 'receipt'
  - Incrémentation quantité produit
  - ✅ Terminé (pas d'approbation)
```

### Sortie
```
Utilisateur crée sortie →
  - Vérification disponibilité stock
  - Création `stock_movement` type 'stockout'
  - Décrementation quantité produit
  - ✅ Terminé (pas d'approbation)
```

### Inventaire
```
Utilisateur crée inventaire →
  - Création dans table `inventories`
  - Création des `inventory_items`
  - Calcul variance
  - Si variance ≠ 0 : création `stock_movement` type 'adjustment'
  - Mise à jour quantité produit
  - ✅ Terminé (pas d'approbation)
```

### Véhicule
```
Utilisateur crée véhicule →
  - Création dans table `vehicles` avec status 'pending'
  - ✅ Terminé (pas d'approbation)
```

## Structure des Fichiers à Créer

### Backend
```
api/
├── app/Http/Controllers/Api/
│   ├── AuthController.php
│   ├── ProductController.php
│   ├── CategoryController.php
│   ├── ReceiptController.php
│   ├── StockOutController.php
│   ├── InventoryController.php
│   ├── VehicleController.php
│   ├── UserController.php
│   ├── AlertController.php
│   └── ReportController.php
├── app/Models/
│   ├── User.php
│   ├── Product.php
│   ├── Category.php
│   ├── Receipt.php
│   ├── ReceiptItem.php
│   ├── StockMovement.php
│   ├── Inventory.php
│   ├── InventoryItem.php
│   ├── Vehicle.php
│   └── VehicleAssignment.php
└── database/migrations/
    ├── create_users_table.php
    ├── create_categories_table.php
    ├── create_products_table.php
    ├── create_receipts_table.php
    ├── create_receipt_items_table.php
    ├── create_stock_movements_table.php
    ├── create_inventories_table.php
    ├── create_inventory_items_table.php
    ├── create_vehicles_table.php
    └── create_vehicle_assignments_table.php
```

### Frontend
```
frontend/
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

## Notes Importantes

1. **Pas de système d'approbation** : Toutes les opérations sont directes
2. **Permissions granulaires** : Vérifier les permissions pour chaque action
3. **Mise à jour automatique du stock** : Toutes les opérations mettent à jour les quantités
4. **Interface moderne** : Utiliser Tailwind CSS pour un design professionnel
5. **Responsive** : L'application doit être utilisable sur mobile et desktop

## Tests à Effectuer

1. Authentification (login, logout, permissions)
2. CRUD Produits
3. Création de réception avec mise à jour du stock
4. Création de sortie avec vérification du stock
5. Création d'inventaire avec calcul d'écart
6. Gestion des véhicules et affectations
7. Génération de rapports PDF
8. Système d'alertes

## Support

Consulter `PROJECT_DOCUMENTATION.md` pour les détails techniques complets.
Consulter `EXCLUSIONS.md` pour la liste complète des fonctionnalités à exclure.

