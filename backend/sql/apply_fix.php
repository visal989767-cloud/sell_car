<?php
/**
 * Apply stored-procedure fixes for the booking/checkinout flow.
 * Uses PDO (same connection style as the app) so we don't have to
 * deal with the mysql client DELIMITER issues on Windows.
 *
 * Run:  php backend/sql/apply_fix.php
 *   or:  C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe backend/sql/apply_fix.php
 */

require_once __DIR__ . '/../config/db.php';

$procedures = [

// -- sp_checkout_car: now links a checkout to a booking_id --
"DROP PROCEDURE IF EXISTS sp_checkout_car",
"CREATE PROCEDURE sp_checkout_car (
  IN p_car_id INT,
  IN p_customer_name VARCHAR(120),
  IN p_customer_phone VARCHAR(30),
  IN p_purpose VARCHAR(20),
  IN p_notes VARCHAR(255),
  IN p_handled_by INT,
  IN p_booking_id INT
)
BEGIN
  INSERT INTO checkinout (car_id, customer_name, customer_phone, purpose, notes, handled_by, booking_id)
  VALUES (p_car_id, p_customer_name, p_customer_phone, p_purpose, p_notes, p_handled_by, IFNULL(p_booking_id, NULL));

  UPDATE cars SET status = 'checked_out' WHERE id = p_car_id;

  SELECT LAST_INSERT_ID() AS new_log_id;
END",

// -- sp_checkin_car: restores the vehicle to in_stock --
"DROP PROCEDURE IF EXISTS sp_checkin_car",
"CREATE PROCEDURE sp_checkin_car (
  IN p_log_id INT
)
BEGIN
  DECLARE v_car_id INT;

  SELECT car_id INTO v_car_id FROM checkinout WHERE id = p_log_id;

  UPDATE checkinout SET check_in_at = NOW() WHERE id = p_log_id;
  UPDATE cars SET status = 'in_stock' WHERE id = v_car_id;

  SELECT ROW_COUNT() AS affected_rows;
END",

// -- sp_checkinout_list: includes booking info --
"DROP PROCEDURE IF EXISTS sp_checkinout_list",
"CREATE PROCEDURE sp_checkinout_list ()
BEGIN
  SELECT
    l.id, l.car_id, c.vin, c.make, c.model, c.plate_number,
    l.customer_name, l.customer_phone, l.purpose,
    l.check_out_at, l.check_in_at, l.notes,
    l.booking_id,
    b.booking_status AS booking_status,
    b.payment_status AS payment_status,
    b.total_amount AS booking_amount,
    CASE WHEN l.check_in_at IS NULL THEN 'out' ELSE 'in' END AS current_state
  FROM checkinout l
  JOIN cars c ON c.id = l.car_id
  LEFT JOIN bookings b ON b.id = l.booking_id
  ORDER BY l.check_out_at DESC;
END",

// -- sp_booking_complete: marks a booking completed on checkout --
"DROP PROCEDURE IF EXISTS sp_booking_complete",
"CREATE PROCEDURE sp_booking_complete (
  IN p_booking_id INT
)
BEGIN
  UPDATE bookings SET booking_status = 'completed'
  WHERE id = p_booking_id AND booking_status NOT IN ('cancelled','completed');

  SELECT ROW_COUNT() AS affected_rows;
END",

];

$ok = 0;
$fail = 0;

foreach ($procedures as $sql) {
    try {
        $pdo->exec($sql);
        echo "[OK] " . (str_starts_with($sql, 'DROP') ? 'dropped' : substr(strtok(strtok($sql, "\n"), ' '), 8)) . "\n";
        $ok++;
    } catch (PDOException $e) {
        echo "[FAIL] " . $e->getMessage() . "\n";
        $fail++;
    }
}

// Also ensure the checkinout table has a booking_id column & FK.
try {
    $col = $pdo->query(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = 'car_seller_db' AND TABLE_NAME = 'checkinout' AND COLUMN_NAME = 'booking_id'"
    )->fetchColumn();
    if (!$col) {
        $pdo->exec("ALTER TABLE checkinout ADD COLUMN booking_id INT NULL AFTER handled_by");
        echo "[OK] added checkinout.booking_id\n";
    } else {
        echo "[SKIP] checkinout.booking_id already exists\n";
    }
} catch (PDOException $e) {
    echo "[FAIL] booking_id column: " . $e->getMessage() . "\n";
    $fail++;
}

echo "\nDone. OK=$ok FAIL=$fail\n";

