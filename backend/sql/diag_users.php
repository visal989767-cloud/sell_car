<?php
/**
 * Diagnostic: inspect users table, stored procedures, and FK constraints
 * related to account registration. Run:
 *   C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe backend/sql/diag_users.php
 */
require_once __DIR__ . '/../config/db.php';

echo "===== USERS TABLE =====" . PHP_EOL;
$rows = $pdo->query("SELECT id, full_name, email, role, created_at FROM users ORDER BY id")->fetchAll();
echo "Total users: " . count($rows) . PHP_EOL;
foreach ($rows as $r) {
    echo json_encode($r) . PHP_EOL;
}

echo PHP_EOL . "===== STORED PROCEDURES (user-related) =====" . PHP_EOL;
$procs = $pdo->query(
    "SELECT ROUTINE_NAME, ROUTINE_DEFINITION FROM information_schema.ROUTINES
     WHERE ROUTINE_SCHEMA = 'car_seller_db' AND ROUTINE_TYPE = 'PROCEDURE'
       AND ROUTINE_NAME LIKE 'sp_%user%'"
)->fetchAll();
if (!$procs) {
    echo "(none found)" . PHP_EOL;
}
foreach ($procs as $p) {
    echo '--- ' . $p['ROUTINE_NAME'] . ' ---' . PHP_EOL;
    echo $p['ROUTINE_DEFINITION'] . PHP_EOL . PHP_EOL;
}

echo "===== FOREIGN KEY CONSTRAINTS referencing users =====" . PHP_EOL;
$fks = $pdo->query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = 'car_seller_db' AND REFERENCED_TABLE_NAME = 'users'"
)->fetchAll();
if (!$fks) {
    echo "(none found)" . PHP_EOL;
}
foreach ($fks as $f) {
    echo json_encode($f) . PHP_EOL;
}

echo PHP_EOL . "===== ALL TABLES =====" . PHP_EOL;
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo implode(', ', $tables) . PHP_EOL;
