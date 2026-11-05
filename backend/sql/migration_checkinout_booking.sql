-- ============================================================
-- Migration: Link checkinout entries to bookings
-- NOTE: booking_id column is added idempotently (if not exists).
-- Re-creates sp_checkout_car (with booking_id), sp_booking_complete,
-- and sp_checkinout_list (with booking info).
-- ============================================================

USE car_seller_db;

-- Add column only if it doesn't already exist
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'car_seller_db'
    AND TABLE_NAME = 'checkinout'
    AND COLUMN_NAME = 'booking_id'
);

SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE checkinout ADD COLUMN booking_id INT NULL AFTER handled_by',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK only if the constraint doesn't already exist
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'car_seller_db'
    AND TABLE_NAME = 'checkinout'
    AND CONSTRAINT_NAME = 'fk_checkinout_booking'
);

SET @ddl2 := IF(@fk_exists = 0,
  'ALTER TABLE checkinout ADD CONSTRAINT fk_checkinout_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt2 FROM @ddl2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_checkout_car $$
CREATE PROCEDURE sp_checkout_car (
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
END $$

DROP PROCEDURE IF EXISTS sp_booking_complete $$
CREATE PROCEDURE sp_booking_complete (
  IN p_booking_id INT
)
BEGIN
  UPDATE bookings SET booking_status = 'completed'
  WHERE id = p_booking_id AND booking_status NOT IN ('cancelled','completed');

  SELECT ROW_COUNT() AS affected_rows;
END $$

DROP PROCEDURE IF EXISTS sp_checkinout_list $$
CREATE PROCEDURE sp_checkinout_list ()
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
END $$

DELIMITER ;

