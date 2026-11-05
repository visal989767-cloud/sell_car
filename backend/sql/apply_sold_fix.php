<?php
/*
 *Apply the "mark cars as SOLD on paid booking" stored-procedure fixes.
 * Uses PDO (same connection style as the app) so we don't have to deal
 * with the mysql client DELIMITER issues on Windows.
 *
 * Run:  php backend/sql/apply_sold_fix.php
 *   or:  C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe backend/sql/apply_sold_fix.php
 */

require_once __DIR__ . '/../config/db.php';

$procedures = [

// -- sp_payment_process: paid booking ⇒ car is sold --
"DROP PROCEDURE IF EXISTS sp_payment_process",
"CREATE PROCEDURE sp_payment_process (
  IN p_booking_id INT,
  IN p_amount DECIMAL(12,2),
  IN p_payment_method VARCHAR(30),
  IN p_card_last_four VARCHAR(4),
  IN p_transaction_id VARCHAR(60)
)
BEGIN
  DECLARE v_payment_id INT;
  DECLARE v_car_id INT;

  INSERT INTO payments (booking_id, amount, payment_method, card_last_four, transaction_id, payment_status, paid_at)
  VALUES (p_booking_id, p_amount, p_payment_method, p_card_last_four, p_transaction_id, 'completed', NOW());

  SET v_payment_id = LAST_INSERT_ID();

  UPDATE bookings SET payment_status = 'paid', booking_status = 'confirmed'
  WHERE id = p_booking_id;

  -- Once payment is processed, the car is sold
  SELECT car_id INTO v_car_id FROM bookings WHERE id = p_booking_id;
  IF v_car_id IS NOT NULL THEN
    UPDATE cars SET status = 'sold' WHERE id = v_car_id;
  END IF;

  SELECT v_payment_id AS payment_id;
END",

// -- sp_booking_update_status: sync car status with booking lifecycle --
"DROP PROCEDURE IF EXISTS sp_booking_update_status",
"CREATE PROCEDURE sp_booking_update_status (
  IN p_id INT,
  IN p_booking_status VARCHAR(20),
  IN p_payment_status VARCHAR(20)
)
BEGIN
  UPDATE bookings SET
    booking_status = p_booking_status,
    payment_status = IFNULL(p_payment_status, payment_status)
  WHERE id = p_id;

  IF p_booking_status = 'cancelled' THEN
    UPDATE cars SET status = 'in_stock'
    WHERE id = (SELECT car_id FROM bookings WHERE id = p_id);
  ELSEIF p_booking_status = 'completed' THEN
    -- Completing a booking finalizes the sale
    UPDATE cars SET status = 'sold'
    WHERE id = (SELECT car_id FROM bookings WHERE id = p_id);
  ELSEIF p_booking_status IN ('reserved','confirmed') THEN
    UPDATE cars SET status = 'reserved'
    WHERE id = (SELECT car_id FROM bookings WHERE id = p_id);
  END IF;

  SELECT ROW_COUNT() AS affected_rows;
END",

// -- sp_booking_complete: completing a paid booking marks the car sold --
"DROP PROCEDURE IF EXISTS sp_booking_complete",
"CREATE PROCEDURE sp_booking_complete (
  IN p_booking_id INT
)
BEGIN
  DECLARE v_car_id INT;
  DECLARE v_paid TINYINT;

  SELECT car_id, (payment_status = 'paid') INTO v_car_id, v_paid
  FROM bookings WHERE id = p_booking_id;

  UPDATE bookings SET booking_status = 'completed'
  WHERE id = p_booking_id AND booking_status NOT IN ('cancelled','completed');

  IF v_car_id IS NOT NULL THEN
    IF v_paid THEN
      UPDATE cars SET status = 'sold' WHERE id = v_car_id;
    ELSE
      UPDATE cars SET status = 'reserved' WHERE id = v_car_id;
    END IF;
  END IF;

  SELECT ROW_COUNT() AS affected_rows;
END",

// -- sp_checkin_car: returned car → sold if paid, otherwise in_stock --
"DROP PROCEDURE IF EXISTS sp_checkin_car",
"CREATE PROCEDURE sp_checkin_car (
  IN p_log_id INT
)
BEGIN
  DECLARE v_car_id INT;
  DECLARE v_paid TINYINT;

  SELECT l.car_id, COALESCE((b.payment_status = 'paid'), 0)
    INTO v_car_id, v_paid
  FROM checkinout l
  LEFT JOIN bookings b ON b.id = l.booking_id
  WHERE l.id = p_log_id;

  UPDATE checkinout SET check_in_at = NOW() WHERE id = p_log_id;

  IF v_car_id IS NOT NULL THEN
    IF v_paid THEN
      -- Customer paid for this car → it is sold
      UPDATE cars SET status = 'sold' WHERE id = v_car_id;
    ELSE
      UPDATE cars SET status = 'in_stock' WHERE id = v_car_id;
    END IF;
  END IF;

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

echo "\nDone. OK=$ok FAIL=$fail\n";

