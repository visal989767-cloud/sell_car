# AutoStock — Car Seller Stock Management System

A full CRUD dealership stock manager: PHP + MySQL (stored procedures) backend,
plain HTML/CSS/Bootstrap-style/vanilla-JS frontend. Tracks vehicle inventory
and logs test drives / reservations via check-in / check-out.

## Features

- Login & Register (sessions, bcrypt password hashing)
- Admin dashboard with live stats + a stock-availability gauge
- Full CRUD on vehicle inventory (make, model, VIN, price, mileage, status…)
- Check-out / check-in flow for test drives & reservations, tied to a vehicle's status
- All data access goes through MySQL **stored procedures**, called from PHP via PDO

## Folder structure

```
car-seller-management-system/
├── backend/
│   ├── config/db.php          # DB connection settings
│   ├── includes/bootstrap.php # session, CORS, JSON helpers
│   ├── api/
│   │   ├── register.php
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── session.php
│   │   ├── cars.php           # GET/POST/PUT/DELETE = CRUD
│   │   ├── checkinout.php     # GET list, POST check-out, PUT check-in
│   │   └── dashboard.php      # aggregate stats
│   └── sql/schema.sql         # tables + stored procedures
└── frontend/
    ├── index.html             # login
    ├── register.html
    ├── dashboard.html
    ├── cars.html              # inventory CRUD
    ├── checkinout.html
    ├── css/style.css
    └── js/ (api.js, auth.js, dashboard.js, cars.js, checkinout.js)
```

## Setup

### 1. Database

1. Create the database and stored procedures:
   ```bash
   mysql -u root -p < backend/sql/schema.sql
   ```
2. This creates the `car_seller_db` database, its tables, and all stored procedures.
   No demo user is seeded — you'll create your first account through the app itself
   (see step 4).

### 2. Backend

1. Copy the `backend/` folder to your PHP server (Apache/Nginx + PHP 8+, e.g. via
   XAMPP, MAMP, Laragon, or a LAMP box).
2. Edit `backend/config/db.php` if your MySQL host/user/password differ from the
   defaults (`127.0.0.1` / `root` / empty password), or set the `DB_HOST`,
   `DB_NAME`, `DB_USER`, `DB_PASS` environment variables.
3. Make sure the `pdo_mysql` PHP extension is enabled.

### 3. Frontend

The frontend is plain static HTML/CSS/JS — no build step required.

- If you're serving `backend/` and `frontend/` from the same web server
  (e.g. both under `htdocs/car-seller-management-system/`), just open
  `frontend/index.html` through your local server
  (e.g. `http://localhost/car-seller-management-system/frontend/`).
- The frontend calls the API at `../backend/api/...` (see `frontend/js/api.js`,
  `API_BASE`) — update that constant if you host the backend elsewhere
  (e.g. a different domain — CORS headers are already set to allow this).

### 4. First login

1. Open `register.html` and create your first account (choose role "Admin").
2. Sign in from `index.html`.
3. Add vehicles from the **Inventory** page, then use **Check In / Check Out**
   to log test drives or reservations — checking a car out sets its status to
   "checked out" automatically, and checking it back in returns it to "in stock".

## Notes

- Passwords are hashed with PHP's `password_hash()` (bcrypt) — never stored in plain text.
- Sessions are PHP native sessions (cookie-based); the frontend sends
  `credentials: 'include'` on every request so the session cookie is passed along.
- All business logic for reading/writing `cars` and `checkinout` lives in MySQL
  stored procedures (`backend/sql/schema.sql`), called from PHP with `CALL sp_xxx(...)`.
