# Fonctionnalités à EXCLURE du Projet

## Système d'Approbation des Opérations

**IMPORTANT**: Ne pas implémenter le système d'approbation des opérations par l'administrateur. Toutes les opérations doivent être exécutées directement sans validation préalable.

### Ce qui doit être EXCLU :

1. **Table `pending_operations`**
   - Ne pas créer cette table
   - Ne pas créer la migration pour cette table

2. **Modèle `PendingOperation`**
   - Ne pas créer le modèle `App\Models\PendingOperation`

3. **Contrôleur `ApprovalController`**
   - Ne pas créer `App\Http\Controllers\Api\ApprovalController`
   - Ne pas créer les routes d'approbation (`/api/approvals`)

4. **Logique d'approbation dans les contrôleurs**
   - Dans `ReceiptController::store()` : Créer directement la réception, pas de `PendingOperation`
   - Dans `StockOutController::store()` : Créer directement la sortie, pas de `PendingOperation`
   - Dans `VehicleController::store()` : Créer directement le véhicule, pas de `PendingOperation`
   - Dans `InventoryController::store()` : Créer directement l'inventaire (déjà fait, mais à confirmer)

5. **Champs de statut dans les tables**
   - Ne pas ajouter de champ `status` à la table `receipts` (sauf si nécessaire pour autre chose)
   - Les réceptions sont toujours "Complétées" directement

6. **Frontend - Boutons d'approbation/rejet**
   - Ne pas afficher de boutons "Approuver" ou "Rejeter"
   - Ne pas afficher de statut "En attente" ou "Rejetée"
   - Toutes les opérations apparaissent comme complétées

7. **Frontend - Logique d'affichage**
   - Ne pas combiner les données de `pending_operations` avec les données principales
   - Afficher uniquement les données des tables principales (`receipts`, `stock_movements`, `vehicles`)

### Comportement Attendu :

- **Réceptions** : Un utilisateur crée une réception → Elle est immédiatement enregistrée dans `receipts` et le stock est mis à jour
- **Sorties** : Un utilisateur crée une sortie → Elle est immédiatement enregistrée dans `stock_movements` et le stock est décrémenté
- **Véhicules** : Un utilisateur crée un véhicule → Il est immédiatement enregistré dans `vehicles`
- **Inventaires** : Un utilisateur crée un inventaire → Il est immédiatement enregistré dans `inventories` et le stock est ajusté

### Résumé :

**Tout doit fonctionner en temps réel, sans étape d'approbation intermédiaire.**

