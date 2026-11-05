<?php
/*
 * Apply the login_log table migration.
 *
 * Run:  php backend/sql/apply_login_log.php
 *   or:  C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe backend/sql/apply_login_log.php
 */

require_once __DIR__ . '/../config/db.php';

$sql = <<<SQL
CREATE TABLE IF NOT EXISTS login_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  full_name  VARCHAR(120) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'staff',uyhy
  login_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  CONSTRAINT fk_login_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB
SQL;

try {
    $pdo->exec($sql);
    echo "[OK] login_log table is ready.\n";
} catch (PDOException $e) {
    // If the FK already exists but table was partially created, report clearly.
    echo "[FAIL] " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nDone.\n";
