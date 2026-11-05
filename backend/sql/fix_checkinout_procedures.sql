-- ============================================================
-- Recreate checkinout-related stored procedures
-- (restores sp_checkin_car which was lost, and creates the
--  updated sp_checkout_car / sp_checkinout_list with booking
--  support, plus sp_booking_complete)
-- Run via:  mysql -u root car_seller_db < this_file.sql
-- ============================================================

USE car_seller_db;

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

DROP PROCEDURE IF EXISTS sp_checkin_car $$
CREATE PROCEDURE sp_checkin_car (
  IN p_log_id INT
)
BEGIN
  DECLARE v_car_id INT;

  SELECT car_id INTO v_car_id FROM checkinout WHERE id = p_log_id;

  UPDATE checkinout SET check_in_at = NOW() WHERE id = p_log_id;
  UPDATE cars SET status = 'in_stock' WHERE id = v_car_id;

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

DROP PROCEDURE IF EXISTS sp_booking_complete $$
CREATE PROCEDURE sp_booking_complete (
  IN p_booking_id INT
)
BEGIN
  UPDATE bookings SET booking_status = 'completed'
  WHERE id = p_booking_id AND booking_status NOT IN ('cancelled','completed');

  SELECT ROW_COUNT() AS affected_rows;
END $$

DELIMITER ;

