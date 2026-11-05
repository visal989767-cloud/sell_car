# AutoStock Setup Guide

## Prerequisites

- [Laragon](https://laragon.org/) (recommended) or any Apache + PHP + MySQL stack
- PHP 8.0+
- MySQL 5.7+ or MariaDB 10.3+
- Web browser (Chrome, Firefox, Edge)

## Quick Start (Laragon)

### 1. Clone / Copy to Laragon

Copy the entire `car-seller-management-system-fixed (1)` folder into:
```
C:\laragon\www\
```

### 2. Run the Setup Script

Double-click `setup.bat` OR open terminal and run:
```bash
cd C:\laragon\www\car-seller-management-system-fixed (1)
setup.bat
```

This will:
- Create the `car_seller_db` database with all tables and stored procedures
- Seed sample vehicle data (10 cars, demo check-in/out log)
- Create a demo user

### 3. Start Laragon

Click **Start All** in Laragon. Then open:
```
http://localhost/car-seller-management-system-fixed (1)/frontend/
```

### 4. Login with Demo Accounts

| Role  | Email                 | Password  |
|-------|-----------------------|-----------|
| Admin | admin@autostock.com   | password  |
| Staff | staff@autostock.com   | password  |

Or register a new account at:
```
http://localhost/car-seller-management-system-fixed (1)/frontend/register.html
```

## Manual Setup (Without Laragon)

### Step 1: Create Database
```bash
mysql -u root -p < backend/sql/schema.sql
```

### Step 2: Seed Sample Data
```bash
mysql -u root -p car_seller_db < backend/sql/seed.sql
```

### Step 3: Configure Database Connection
Edit `backend/config/db.php` if your MySQL credentials differ from defaults:
```php
$DB_HOST = 'localhost';
$DB_NAME = 'car_seller_db';
$DB_USER = 'root';
$DB_PASS = '';
```

### Step 4: Serve the Application
Deploy the `backend/` and `frontend/` folders to your web server's document root.

### Step 5: Access the App
Open `http://localhost/frontend/` in your browser.

## Features Breakdown

| Feature               | Page                          | Description                                    |
|-----------------------|-------------------------------|------------------------------------------------|
| Login                 | `frontend/index.html`         | Session-based authentication                   |
| Register              | `frontend/register.html`      | Create new staff/admin accounts                |
| Dashboard             | `frontend/dashboard.html`     | Stats, availability gauge, recent activity     |
| Inventory CRUD        | `frontend/cars.html`          | Add/edit/delete vehicles, search & filter      |
| Check In / Out        | `frontend/checkinout.html`    | Test drive & reservation log                   |
| Bookings & Payments   | `frontend/booking.html`       | Create bookings with card payment simulation   |
| React Widget          | Inside `booking.html`         | Live payment summary dashboard widget          |

## API Endpoints

| Endpoint              | Methods                          | Description                     |
|-----------------------|----------------------------------|---------------------------------|
| `login.php`           | POST                             | Authenticate user               |
| `register.php`        | POST                             | Create new user                 |
| `logout.php`          | POST                             | Destroy session                 |
| `session.php`         | GET                              | Current user info               |
| `cars.php`            | GET, POST, PUT, DELETE           | Full CRUD on vehicles           |
| `checkinout.php`      | GET, POST, PUT                   | Check-in / check-out log        |
| `dashboard.php`       | GET                              | Aggregate stats                 |
| `booking.php`         | GET, POST, PUT, DELETE           | Bookings with payment processing|

## Troubleshooting

### "Database connection failed"
- Ensure MySQL is running in Laragon
- Check credentials in `backend/config/db.php`

### "Network error – could not reach the server"
- Open the app via `http://localhost/...` not `file://`
- Check browser console for the API base URL

### "No vehicles in stock"
- Add vehicles via the Inventory page
- Or run the seed SQL file

### Blank page / 404
- Make sure you're accessing through Laragon's web server (not file://)
- Verify the folder name doesn't have special characters in the URL

## Tech Stack

- **Backend:** PHP 8+ with PDO + MySQL stored procedures
- **Frontend:** HTML5, CSS3 (custom design system), Vanilla JS
- **Widget:** React 18 (CDN) for payment summary component
- **Database:** MySQL with 6 tables, 17 stored procedures
- **Auth:** PHP sessions + bcrypt password hashing

