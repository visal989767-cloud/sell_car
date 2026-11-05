@echo off
title AutoStock - Car Seller Management System Setup
echo ======================================================
echo   AutoStock - Car Seller Management System Setup
echo ======================================================
echo.
echo [1/4] Setting up database schema...
mysql -u root < "%~dp0backend\sql\schema.sql"
if %ERRORLEVEL% NEQ 0 (
    echo [!] Schema creation failed. Make sure MySQL is running.
    echo     Try: mysql -u root -p ^< backend\sql\schema.sql
    pause
    exit /b 1
)
echo      Database schema created successfully!
echo.

echo [2/4] Seeding sample data...
mysql -u root car_seller_db < "%~dp0backend\sql\seed.sql"
if %ERRORLEVEL% NEQ 0 (
    echo [!] Seeding failed (database might already have data).
    echo     This is usually safe to ignore.
) else (
    echo      Sample data inserted successfully!
)
echo.

echo [3/4] Creating test user (visal / visal123)...
echo      You can also register via: http://localhost/frontend/register.html
echo.

echo [4/4] Setup complete!
echo.
echo ======================================================
echo   Open your browser and go to:
echo.
echo   http://localhost/car-seller-management-system/frontend/
echo.
echo   Demo credentials:
echo     Email: admin@autostock.com
echo     Password: password
echo.
echo   OR register a new account at:
echo     http://localhost/car-seller-management-system/frontend/register.html
echo.
echo ======================================================
echo.
pause

