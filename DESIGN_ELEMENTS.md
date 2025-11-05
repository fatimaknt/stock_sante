# Documentation Complète des Éléments de Design

## 📚 BIBLIOTHÈQUES ET FRAMEWORKS

### 1. **Tailwind CSS** (Framework CSS principal)
- Version utilisée : Tailwind CSS v3+
- Configuration : `tailwind.config.js`
- Dark Mode : Activé avec `darkMode: 'class'`

### 2. **Heroicons** (Bibliothèque d'icônes)
- Source : `@heroicons/react/24/outline` et `@heroicons/react/24/solid`
- Format : SVG icons React components
- Styles disponibles : `outline` (contour) et `solid` (plein)

---

## 🎨 COULEURS UTILISÉES

### Palette Principale (Emerald/Green - Couleur de marque)
- **Emerald 50** : `bg-emerald-50`, `text-emerald-50`
- **Emerald 100** : `bg-emerald-100`, `text-emerald-100`
- **Emerald 300** : `border-emerald-300`, `hover:border-emerald-300`
- **Emerald 400** : `text-emerald-400`, `dark:text-emerald-400`
- **Emerald 500** : `bg-emerald-500`, `ring-emerald-500`, `focus:ring-emerald-500`
- **Emerald 600** : `bg-emerald-600`, `text-emerald-600`, `from-emerald-600`
- **Emerald 700** : `bg-emerald-700`, `to-emerald-700`, `text-emerald-700`
- **Emerald 800** : `border-emerald-800`, `dark:bg-emerald-800`

### Palette Rouge (Erreurs, Suppression, Alertes)
- **Red 50** : `bg-red-50`, `from-red-50`
- **Red 100** : `bg-red-100`, `hover:bg-red-100`
- **Red 200** : `hover:bg-red-200`
- **Red 400** : `text-red-400`, `border-red-400`
- **Red 500** : `border-red-500`, `bg-red-500`
- **Red 600** : `bg-red-600`, `from-red-600`, `text-red-600`
- **Red 700** : `bg-red-700`, `to-red-700`, `hover:text-red-700`

### Palette Orange (Alertes Faible Stock)
- **Orange 50** : `bg-orange-50`
- **Orange 500** : `bg-orange-500`, `from-orange-500`
- **Orange 600** : `bg-orange-600`, `to-orange-600`, `border-orange-600`
- **Orange 700** : `bg-orange-700`, `to-orange-700`

### Palette Verte (Statut Normal)
- **Green 50** : `bg-green-50`
- **Green 100** : `hover:bg-green-100`
- **Green 600** : `bg-green-600`, `from-green-600`
- **Green 700** : `bg-green-700`, `to-green-700`

### Palette Grise (Fond, Texte, Bordures)
- **Gray 50** : `bg-gray-50`, `from-gray-50`
- **Gray 100** : `bg-gray-100`, `to-gray-100`, `hover:bg-gray-50`
- **Gray 200** : `border-gray-200`, `bg-gray-200`
- **Gray 300** : `border-gray-300`, `text-gray-300`
- **Gray 400** : `text-gray-400`, `dark:text-gray-400`
- **Gray 500** : `text-gray-500`
- **Gray 600** : `text-gray-600`, `border-gray-600`
- **Gray 700** : `text-gray-700`, `border-gray-700`, `bg-gray-700`
- **Gray 800** : `dark:bg-gray-800`, `bg-gray-800`
- **Gray 900** : `text-gray-900`, `dark:text-gray-900`

### Palette Dark Mode
- **Dark Gray 800** : `dark:bg-gray-800`
- **Dark Gray 700** : `dark:bg-gray-700`, `dark:hover:bg-gray-700`
- **Dark Gray 600** : `dark:border-gray-600`, `dark:hover:bg-gray-600`

---

## 🎭 GRADIENTS

### Gradients de Fond
1. **Gradient Emerald** : `bg-gradient-to-r from-emerald-600 to-green-700`
   - Utilisé pour : Headers, boutons principaux, modals

2. **Gradient Red** : `bg-gradient-to-r from-red-600 to-red-700`
   - Utilisé pour : Modals de suppression, alertes critiques

3. **Gradient Green** : `bg-gradient-to-r from-green-600 to-green-700`
   - Utilisé pour : Badges statut "Normal"

4. **Gradient Orange** : `bg-gradient-to-r from-orange-600 to-orange-700`
   - Utilisé pour : Badges statut "Faible"

5. **Gradient Red** : `bg-gradient-to-r from-red-600 to-red-700`
   - Utilisé pour : Badges statut "Critique"

6. **Gradient Gray** : `bg-gradient-to-r from-gray-50 to-gray-100`
   - Utilisé pour : En-têtes de tableaux

7. **Gradient Emerald Light** : `bg-gradient-to-r from-emerald-50 to-emerald-100`
   - Utilisé pour : Messages de succès, backgrounds

8. **Gradient Red Light** : `bg-gradient-to-r from-red-50 to-red-100`
   - Utilisé pour : Messages d'erreur, backgrounds

9. **Gradient Emerald Hover** : `hover:from-emerald-50 hover:to-emerald-100`
   - Utilisé pour : Effets hover sur boutons

10. **Gradient Red Hover** : `hover:from-red-50 hover:to-red-100`
    - Utilisé pour : Effets hover sur boutons de suppression

11. **Gradient Background** : `bg-gradient-to-br from-emerald-500 to-emerald-600`
    - Utilisé pour : Icônes dans les KPI cards

12. **Gradient Background Orange** : `bg-gradient-to-br from-orange-500 to-orange-600`
    - Utilisé pour : Icônes dans les alertes

13. **Gradient Background Red** : `bg-gradient-to-br from-red-500 to-red-600`
    - Utilisé pour : Icônes dans les ruptures

---

## 🎬 ANIMATIONS CSS

### Animations Tailwind CSS

1. **Spin** : `animate-spin`
   - Utilisé pour : Loaders de chargement
   - Exemple : `<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>`

2. **Pulse** : `animate-pulse`
   - Utilisé pour : Badges de notification
   - Exemple : `animate-pulse` sur les notifications

### Animations Personnalisées (dans globals.css)

1. **Bounce Slow** : `animate-bounce-slow`
   - Durée : `3s ease-in-out infinite`
   - Effet : Mouvement vertical lent et continu
   - Utilisé pour : Logo dans la sidebar
   - Code :
   ```css
   @keyframes bounce-slow {
       0%, 100% { transform: translateY(0); }
       50% { transform: translateY(-10px); }
   }
   ```

2. **Fade In** : `animate-fade-in`
   - Durée : `0.5s ease-out`
   - Effet : Fade in avec translation horizontale
   - Utilisé pour : Éléments qui apparaissent progressivement
   - Code :
   ```css
   @keyframes fade-in {
       from { opacity: 0; transform: translateX(-10px); }
       to { opacity: 1; transform: translateX(0); }
   }
   ```

---

## 🔄 TRANSITIONS

### Transitions Tailwind

1. **Transition All** : `transition-all`
   - Durée : `duration-300` (300ms)
   - Utilisé pour : Effets hover globaux sur les cartes

2. **Transition Colors** : `transition-colors`
   - Durée : `duration-300` (300ms) ou `duration-200` (200ms)
   - Utilisé pour : Changements de couleur au hover

3. **Transition Transform** : `transition-transform`
   - Durée : `duration-300` (300ms)
   - Utilisé pour : Transformations (scale, rotate)

4. **Transition All** : `transition-all`
   - Durée : `duration-300` (300ms)
   - Utilisé pour : Animations complexes combinant plusieurs propriétés

---

## ✨ EFFETS HOVER

### Effets Scale (Agrandissement)

1. **Scale 105** : `hover:scale-105`
   - Utilisé pour : Cartes KPI, boutons d'action
   - Combine avec : `transform`, `transition-all duration-300`

2. **Scale 110** : `hover:scale-110`
   - Utilisé pour : Boutons d'action dans les tableaux, icônes
   - Combine avec : `transform`, `transition-transform duration-300`

### Effets Shadow (Ombres)

1. **Shadow XL** : `hover:shadow-xl`
   - Utilisé pour : Cartes au hover

2. **Shadow MD** : `hover:shadow-md`
   - Utilisé pour : Éléments de navigation au hover

3. **Shadow LG** : `shadow-lg`
   - Utilisé pour : Cartes, modals

4. **Shadow 2XL** : `shadow-2xl`
   - Utilisé pour : Modals, dropdowns

5. **Shadow SM** : `shadow-sm`
   - Utilisé pour : Inputs, boutons secondaires

### Effets Border (Bordures)

1. **Border Emerald 300** : `hover:border-emerald-300`
   - Utilisé pour : Cartes KPI au hover

2. **Border Emerald 600** : `dark:hover:border-emerald-600`
   - Utilisé pour : Dark mode

3. **Border Orange 300** : `hover:border-orange-300`
   - Utilisé pour : Cartes d'alerte au hover

4. **Border Red 300** : `hover:border-red-300`
   - Utilisé pour : Cartes de rupture au hover

5. **Border Left 4** : `hover:border-l-4`
   - Utilisé pour : Éléments de navigation actifs

### Effets Background

1. **Background Emerald 50** : `hover:bg-emerald-50`
   - Utilisé pour : Lignes de tableau, éléments de navigation

2. **Background Emerald 100** : `hover:bg-emerald-100`
   - Utilisé pour : Boutons secondaires

3. **Background Gray 50** : `hover:bg-gray-50`
   - Utilisé pour : Dropdowns, boutons neutres

4. **Background White/Opacity** : `hover:bg-white/30`, `bg-white/20`
   - Utilisé pour : Boutons avec backdrop blur

### Effets Text

1. **Text Emerald 600** : `hover:text-emerald-600`
   - Utilisé pour : Liens, boutons

2. **Text Emerald 700** : `hover:text-emerald-700`
   - Utilisé pour : Éléments de navigation

3. **Text Red 700** : `hover:text-red-700`
   - Utilisé pour : Boutons de suppression

### Effets Rotate

1. **Rotate 12** : `group-hover:rotate-12`
   - Utilisé pour : Icône de déconnexion

---

## 🎯 OMBRES (SHADOWS)

1. **Shadow SM** : `shadow-sm` - Petite ombre
2. **Shadow MD** : `shadow-md` - Ombre moyenne
3. **Shadow LG** : `shadow-lg` - Grande ombre
4. **Shadow XL** : `shadow-xl` - Très grande ombre
5. **Shadow 2XL** : `shadow-2xl` - Ombre maximale
6. **Shadow Color** : `shadow-red-900/20` - Ombres colorées (avec opacité)

---

## 📐 BORDURES ET ARRONDIS

### Border Radius

1. **Rounded LG** : `rounded-lg` - 8px
2. **Rounded XL** : `rounded-xl` - 12px
3. **Rounded Full** : `rounded-full` - Cercle parfait
4. **Rounded T XL** : `rounded-t-xl` - Arrondi en haut uniquement

### Border Width

1. **Border** : `border` - 1px
2. **Border L 4** : `border-l-4` - Bordure gauche 4px
3. **Border B** : `border-b` - Bordure basse

### Border Style

- **Border Solid** : Par défaut
- **Border Dashed** : Utilisé pour certains séparateurs

---

## 🔤 TYPOGRAPHIE

### Font Weight

1. **Font Medium** : `font-medium` - 500
2. **Font Semibold** : `font-semibold` - 600
3. **Font Bold** : `font-bold` - 700

### Font Size

1. **Text XS** : `text-xs` - 12px
2. **Text SM** : `text-sm` - 14px
3. **Text MD** : `text-md` - 16px
4. **Text LG** : `text-lg` - 18px
5. **Text XL** : `text-xl` - 20px
6. **Text 2XL** : `text-2xl` - 24px
7. **Text 3XL** : `text-3xl` - 30px
8. **Text 4XL** : `text-4xl` - 36px

### Font Family

1. **Font Mono** : `font-mono` - Monospace (pour les références)

---

## 🎨 BACKDROP BLUR

1. **Backdrop Blur SM** : `backdrop-blur-sm`
   - Utilisé pour : Modals, overlays
   - Effet : Flou d'arrière-plan léger

---

## 🖼️ ICÔNES HEROICONS

### Icônes de Navigation (Sidebar)
1. **Squares2X2Icon** - Dashboard (grille 2x2)
2. **CubeIcon** - Produits (cube)
3. **ArrowDownTrayIcon** - Réception (flèche vers le bas)
4. **ArrowRightOnRectangleIcon** - Sortie (flèche sortie)
5. **ClipboardDocumentListIcon** - Inventaire (clipboard avec liste)
6. **BellIcon** - Alertes (cloche)
7. **UserIcon** - Utilisateur (utilisateur)
8. **ChartBarIcon** - Rapports (graphique barres)
9. **Cog6ToothIcon** - Paramètres (roue dentée)

### Icônes d'Actions
1. **PlusIcon** - Ajouter (plus)
2. **XMarkIcon** - Fermer/Supprimer (X)
3. **MagnifyingGlassIcon** - Recherche (loupe)
4. **ChevronDownIcon** - Dropdown (flèche vers le bas)
5. **CheckIcon** - Validation (coche)
6. **PencilIcon** - Éditer (crayon) - SVG custom
7. **TrashIcon** - Supprimer (poubelle) - SVG custom

### Icônes de Statistiques
1. **CurrencyDollarIcon** - Devise/Money (dollar)
2. **ExclamationTriangleIcon** - Alerte/Avertissement (triangle avec !)
3. **ArrowTrendingUpIcon** - Tendance hausse (flèche montante)
4. **ArrowTrendingDownIcon** - Tendance baisse (flèche descendante)
5. **CalendarDaysIcon** - Calendrier (calendrier)

### Icônes TopBar
1. **BellIcon** - Notifications (cloche)
2. **UserCircleIcon** - Profil utilisateur (utilisateur dans cercle)
3. **ArrowRightOnRectangleIcon** - Déconnexion (sortie)

### Icônes de Statut
1. **WifiIcon** - Connexion/Rupture (WiFi)
2. **CheckCircleIcon** - Succès (cercle avec coche) - Version `solid`

### Icônes Autres Pages
1. **ShoppingCartIcon** - Panier (chariot)
2. **TruckIcon** - Livraison (camion)
3. **DocumentArrowDownIcon** - Télécharger (document avec flèche)
4. **DocumentArrowUpIcon** - Uploader (document avec flèche haut)
5. **CircleStackIcon** - Base de données (pile de cercles)
6. **TrashIcon** - Supprimer (poubelle)
7. **InboxIcon** - Boîte de réception
8. **UserPlusIcon** - Ajouter utilisateur
9. **EnvelopeIcon** - Email
10. **EyeIcon** - Voir/Afficher
11. **ShieldCheckIcon** - Sécurité
12. **ClipboardDocumentCheckIcon** - Checklist
13. **ChartBarIcon** - Graphique en barres
14. **ClipboardDocumentListIcon** - Liste de documents

### Tailles d'Icônes Utilisées
- `w-4 h-4` - Petite (16px)
- `w-5 h-5` - Petite-moyenne (20px)
- `w-6 h-6` - Moyenne (24px)
- `w-7 h-7` - Moyenne-grande (28px)
- `w-8 h-8` - Grande (32px)
- `w-12 h-12` - Très grande (48px)

---

## 🔘 BOUTONS

### Boutons Principaux (Primary)

1. **Bouton Gradient Emerald**
   ```tsx
   className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-lg hover:from-emerald-700 hover:to-green-800 transition-all transform hover:scale-105 font-medium"
   ```
   - Utilisé pour : Actions principales (Ajouter, Enregistrer)

2. **Bouton Gradient Red**
   ```tsx
   className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 font-medium"
   ```
   - Utilisé pour : Suppression, actions destructives

3. **Bouton Blanc avec Bordure**
   ```tsx
   className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium"
   ```
   - Utilisé pour : Annuler, actions secondaires

4. **Bouton Glassmorphism**
   ```tsx
   className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
   ```
   - Utilisé pour : Boutons dans les headers avec gradient

### Boutons d'Action (Tableaux)

1. **Bouton Éditer**
   ```tsx
   className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all transform hover:scale-110"
   ```

2. **Bouton Supprimer**
   ```tsx
   className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
   ```

### Boutons de Navigation

1. **Bouton Actif (Sidebar)**
   ```tsx
   className="bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg scale-105 border-l-4 border-emerald-800 dark:border-emerald-600"
   ```

2. **Bouton Hover (Sidebar)**
   ```tsx
   className="hover:bg-emerald-50 dark:hover:bg-gray-700 hover:text-emerald-700 dark:hover:text-emerald-400 hover:scale-105 hover:shadow-md hover:border-l-4 hover:border-emerald-300 dark:hover:border-emerald-500"
   ```

### Boutons de Filtre/Dropdown

1. **Bouton Dropdown**
   ```tsx
   className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between shadow-sm"
   ```

---

## 📦 BADGES ET TAGS

### Badges de Statut

1. **Badge Normal (Vert)**
   ```tsx
   className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm bg-gradient-to-r from-green-600 to-green-700"
   ```

2. **Badge Faible (Orange)**
   ```tsx
   className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm bg-gradient-to-r from-orange-600 to-orange-700"
   ```

3. **Badge Critique (Rouge)**
   ```tsx
   className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm bg-gradient-to-r from-red-600 to-red-700"
   ```

### Badge de Notification

```tsx
className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse"
```

---

## 🎴 CARTES (CARDS)

### Card KPI
```tsx
className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 cursor-pointer"
```

### Card Table
```tsx
className="bg-white border rounded-xl shadow-lg p-6"
```

### Card Header avec Gradient
```tsx
className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl shadow-lg p-8 text-white"
```

---

## 📝 INPUTS ET FORMULAIRES

### Input Standard
```tsx
className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
```

### Input avec Icône
```tsx
className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
```

### Input Monospace (Référence)
```tsx
className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm font-mono"
```

### Select
```tsx
className="w-full border border-gray-300 rounded-lg px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm bg-white"
```

---

## 🗨️ MESSAGES D'ALERTE

### Message d'Erreur
```tsx
className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-700 dark:text-red-400 border-l-4 border-red-500 dark:border-red-400 px-6 py-4 rounded-lg shadow-md flex items-center justify-between"
```

### Message de Succès
```tsx
className="bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-l-4 border-emerald-500 px-6 py-4 rounded-lg shadow-md flex items-center justify-between"
```

---

## 🪟 MODALS

### Modal Overlay
```tsx
className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
```

### Modal Background
```tsx
className="absolute inset-0 bg-black/50"
```

### Modal Container
```tsx
className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200"
```

### Modal Header
```tsx
className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-t-xl p-6"
```

---

## 📊 TABLEAUX

### Table Header
```tsx
className="bg-gradient-to-r from-gray-50 to-gray-100"
```

### Table Row
```tsx
className="border-t hover:bg-emerald-50 transition-colors"
```

### Table Cell
```tsx
className="px-6 py-5 text-gray-700"
```

---

## 🎪 EFFETS SPÉCIAUX

### Transform Translate
- `transform -translate-y-1/2` - Centrer verticalement
- `transform translateX(-10px)` - Dans les animations

### Group Hover
- `group-hover:scale-110` - Agrandir l'icône quand le groupe est survolé
- `group-hover:text-emerald-600` - Changer la couleur du texte

### Backdrop Filter
- `backdrop-blur-sm` - Flou d'arrière-plan

### Opacity
- `bg-black/50` - Noir avec 50% d'opacité
- `bg-white/20` - Blanc avec 20% d'opacité
- `bg-white/30` - Blanc avec 30% d'opacité

### Z-Index
- `z-10` - Dropdowns
- `z-20` - Sidebar
- `z-50` - Modals, TopBar

---

## 🌙 DARK MODE

Toutes les classes avec préfixe `dark:` pour le mode sombre :
- `dark:bg-gray-800` - Fond sombre
- `dark:border-gray-700` - Bordure sombre
- `dark:text-white` - Texte blanc
- `dark:text-gray-400` - Texte gris clair
- `dark:hover:bg-gray-700` - Hover fond sombre
- `dark:hover:text-emerald-400` - Hover texte emerald

---

## 📏 ESPACEMENTS (SPACING)

### Padding
- `p-1`, `p-2`, `p-4`, `p-6`, `p-8`
- `px-4`, `px-5`, `px-6` (horizontal)
- `py-2`, `py-2.5`, `py-3`, `py-4` (vertical)

### Margin
- `mb-1`, `mb-2`, `mb-4`, `mb-6`
- `mt-2`, `mt-4`
- `gap-2`, `gap-3`, `gap-4` (espacement flex/grid)

### Space Y
- `space-y-6` - Espacement vertical entre enfants

---

## 📐 LAYOUT

### Grid
- `grid grid-cols-6 gap-4` - Grille 6 colonnes
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` - Responsive

### Flex
- `flex items-center justify-between` - Flex horizontal centré
- `inline-flex items-center gap-2` - Flex inline

---

## 🎯 UTILITAIRES SPÉCIAUX

### Pointer Events
- `pointer-events-none` - Désactiver les événements de pointeur

### Appearance
- `appearance-none` - Supprimer le style par défaut (selects)

### Cursor
- `cursor-pointer` - Curseur pointeur

### Select
- `select-none` - Désactiver la sélection de texte

---

## 🎨 RÉSUMÉ DES COMBINAISONS COMMUNES

### Hover sur Carte KPI
```tsx
hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300
```

### Bouton Action
```tsx
transition-all transform hover:scale-110
```

### Élément de Navigation Actif
```tsx
bg-emerald-600 text-white shadow-lg scale-105 border-l-4 border-emerald-800
```

### Input Focus
```tsx
focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all
```

---

## 📚 RESSOURCES

- **Tailwind CSS Docs** : https://tailwindcss.com/docs
- **Heroicons** : https://heroicons.com/
- **Tailwind Dark Mode** : https://tailwindcss.com/docs/dark-mode

