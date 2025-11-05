# Système de Sauvegarde des Données

## 📊 Sauvegarde Automatique des Données

**Oui, vos données sont sauvegardées automatiquement !**

### Comment ça fonctionne ?

1. **Persistance Automatique** : Toutes les données (produits, réceptions, sorties, inventaires) sont sauvegardées **immédiatement** dans la base de données lors de chaque opération (création, modification, suppression).

2. **Transactions de Base de Données** : Laravel utilise des **transactions** pour garantir l'intégrité des données :
   - Si une opération échoue, toutes les modifications sont annulées (rollback)
   - Si une opération réussit, toutes les modifications sont confirmées (commit)
   - Cela protège contre les bugs qui pourraient corrompre les données

3. **Stockage** :
   - **SQLite** : Les données sont stockées dans `api/database/database.sqlite`
   - **MySQL** : Les données sont stockées dans votre base de données MySQL

### ⚠️ Protection contre les Coupures de Courant

- **Les données déjà sauvegardées sont protégées** : Si une coupure de courant survient, toutes les données déjà enregistrées dans la base de données sont conservées.
- **Les opérations en cours peuvent être perdues** : Si une opération était en cours au moment de la coupure, elle peut être annulée, mais les données précédentes restent intactes.

## 🔄 Système de Backup (Sauvegarde de Secours)

Un système de backup a été mis en place pour créer des copies de sécurité de votre base de données.

### Création d'un Backup Manuel

```bash
cd api
php artisan db:backup
```

Cela créera un fichier de backup dans `api/storage/app/backups/` avec un horodatage.

### Backup Automatique (Recommandé)

Pour créer des backups automatiques, vous pouvez utiliser un cron job (Linux/Mac) ou un planificateur de tâches (Windows).

#### Sur Linux/Mac (cron)

1. Ouvrir le crontab :
```bash
crontab -e
```

2. Ajouter une ligne pour créer un backup quotidien à 2h du matin :
```bash
0 2 * * * cd /Users/pro/projet_personnel/stock_sante/api && php artisan db:backup >> /dev/null 2>&1
```

3. Ou un backup toutes les 6 heures :
```bash
0 */6 * * * cd /Users/pro/projet_personnel/stock_sante/api && php artisan db:backup >> /dev/null 2>&1
```

#### Sur Windows (Planificateur de tâches)

1. Ouvrir le Planificateur de tâches Windows
2. Créer une nouvelle tâche
3. Programmer l'exécution de : `php artisan db:backup` dans le dossier `api`

### Options de Backup

```bash
# Créer un backup et garder les 7 derniers (par défaut)
php artisan db:backup

# Créer un backup et garder les 30 derniers
php artisan db:backup --keep=30
```

### Emplacement des Backups

Les backups sont stockés dans : `api/storage/app/backups/`

- **SQLite** : `database_backup_YYYY-MM-DD_HHMMSS.sqlite`
- **MySQL** : `database_backup_YYYY-MM-DD_HHMMSS.sql`

### Restauration d'un Backup

#### Pour SQLite :

```bash
# Arrêter l'application
# Copier le fichier de backup vers la base de données
cp api/storage/app/backups/database_backup_YYYY-MM-DD_HHMMSS.sqlite api/database/database.sqlite
```

#### Pour MySQL :

```bash
# Restaurer le dump
mysql -u username -p database_name < api/storage/app/backups/database_backup_YYYY-MM-DD_HHMMSS.sql
```

## 📝 Bonnes Pratiques

1. **Backups Réguliers** : Configurez un backup automatique quotidien ou hebdomadaire
2. **Backups Externes** : Copiez régulièrement vos backups vers un emplacement externe (cloud, disque dur externe)
3. **Test de Restauration** : Testez périodiquement la restauration d'un backup pour vous assurer qu'elle fonctionne

## 🔍 Vérification des Données

Pour vérifier que vos données sont bien sauvegardées :

```bash
# Vérifier la taille du fichier SQLite
ls -lh api/database/database.sqlite

# Ou pour MySQL, vérifier les tables
mysql -u username -p -e "USE database_name; SHOW TABLES;"
```

