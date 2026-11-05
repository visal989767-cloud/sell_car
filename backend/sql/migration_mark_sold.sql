-- ============================================================
-- Migration: Mark cars as SOLD when a booking is paid
--
-- Recreates 4 stored procedures so the sales flow stays in sync:
--   * sp_payment_process          → paid booking ⇒ car = 'sold'
--   * sp_booking_update_status    → completed ⇒ sold, cancelled ⇒ in_stock,
--                                   reserved/confirmed ⇒ reserved
--   * sp_booking_complete         → completed ⇒ car sold (if paid)
--   * sp_checkin_car              → if linked booking is paid ⇒ sold,
--                                   otherwise ⇒ in_stock
--
-- Run via:  mysql -u root car_seller_db < migration_mark_sold.sql
--       or:  php backend/sql/apply_sold_fix.php
-- ============================================================

USE car_seller_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_payment_process $$
CREATE PROCEDURE sp_payment_process (
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
END $$

DROP PROCEDURE IF EXISTS sp_booking_update_status $$
CREATE PROCEDURE sp_booking_update_status (
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
END $$

DROP PROCEDURE IF EXISTS sp_booking_complete $$
CREATE PROCEDURE sp_booking_complete (
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
END $$

DROP PROCEDURE IF EXISTS sp_checkin_car $$
CREATE PROCEDURE sp_checkin_car (
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
END $$

DELIMITER ;

