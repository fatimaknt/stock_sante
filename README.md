# StockPro (Lightweight Stack)

Frontend: React 18 + Tailwind via CDN (no build step)
Backend: PHP (mysqli) REST API
Database: MySQL (MAMP friendly)

## Quick Start (MAMP)
1. Create a MySQL database named `stock_sante`.
2. Import `backend/schema.sql`.
3. Put the `backend` folder inside your web root (e.g., `/Applications/MAMP/htdocs/stock_sante/backend`).
4. Serve the `frontend` folder with any static server or open `frontend/index.html` directly.
5. Update `backend/api/_config.php` if your DB credentials differ.

Default MAMP credentials used:
- host: `localhost`
- port: `8889`
- user: `root`
- password: `root`
- db: `stock_sante`

API base URL (example): `http://localhost:8888/stock_sante/backend/api`

## API Overview
- `GET /products` – list products
- `POST /products` – create
- `POST /products?_method=PUT&id=ID` – update
- `POST /products?_method=DELETE&id=ID` – delete
- `GET /receipts` – list receipts
- `POST /receipts` – create receipt and increment stock
- `GET /stockouts` – list stock outs
- `POST /stockouts` – create stock out and decrement stock
- `GET /inventories` – list inventories
- `POST /inventories` – create inventory count and auto-adjust by variance
- `GET /stats` – dashboard metrics (totals, low stock, charts)

## Frontend
Open `frontend/index.html`. Hash-based routing is used; no build tools required.

## Notes
- Tailwind Play CDN is used for styling.
- Charts are simple placeholders; you can swap to Chart.js later.
