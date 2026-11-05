-- ============================================================
-- Car Seller / Stock Management System
-- Database schema + Stored Procedures (MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS car_seller_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE car_seller_db;

-- ------------------------------------------------------------
-- Table: users  (login / register)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: cars  (stock)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  vin           VARCHAR(32) NOT NULL UNIQUE,
  make          VARCHAR(60)  NOT NULL,
  model         VARCHAR(60)  NOT NULL,
  year          SMALLINT     NOT NULL,
  color         VARCHAR(30),
  plate_number  VARCHAR(20),
  price         DECIMAL(12,2) NOT NULL DEFAULT 0,
  mileage       INT DEFAULT 0,
  status        ENUM('in_stock','reserved','sold','checked_out') NOT NULL DEFAULT 'in_stock',
  image_url     VARCHAR(255),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: checkinout  (test drive / reservation check-in-check-out log)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checkinout (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  car_id        INT NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30),
  purpose       ENUM('test_drive','reservation') NOT NULL DEFAULT 'test_drive',
  check_out_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_in_at   DATETIME NULL,
  notes         VARCHAR(255),
  handled_by    INT,
  booking_id    INT NULL,
  CONSTRAINT fk_checkinout_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkinout_user FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_checkinout_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- ============================================================
-- ADDITIONAL TABLES FOR PHASE 2: Bookings & Payments
-- ============================================================

-- ------------------------------------------------------------
-- Table: bookings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  car_id            INT NOT NULL,
  customer_name     VARCHAR(120) NOT NULL,
  customer_email    VARCHAR(150),
  customer_phone    VARCHAR(30),
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method    ENUM('credit_card','debit_card','cash','bank_transfer','qr','wing_bank','aba_bank') NOT NULL DEFAULT 'credit_card',
  payment_status    ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  booking_status    ENUM('reserved','confirmed','completed','cancelled') NOT NULL DEFAULT 'reserved',
  notes             VARCHAR(255),
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  booking_id        INT NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  payment_method    VARCHAR(30) NOT NULL DEFAULT 'credit_card',
  card_last_four    VARCHAR(4),
  transaction_id    VARCHAR(60),
  payment_status    ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DELIMITER $$

-- ---------- USERS ----------

DROP PROCEDURE IF EXISTS sp_register_user $$
CREATE PROCEDURE sp_register_user (
  IN p_full_name VARCHAR(120),
  IN p_email VARCHAR(150),
  IN p_password_hash VARCHAR(255),
  IN p_role VARCHAR(20)
)
BEGIN
  INSERT INTO users (full_name, email, password_hash, role)
  VALUES (p_full_name, p_email, p_password_hash, IFNULL(p_role,'staff'));
  SELECT LAST_INSERT_ID() AS new_user_id;
END $$

DROP PROCEDURE IF EXISTS sp_get_user_by_email $$
CREATE PROCEDURE sp_get_user_by_email (
  IN p_email VARCHAR(150)
)
BEGIN
  SELECT id, full_name, email, password_hash, role
  FROM users
  WHERE email = p_email
  LIMIT 1;
END $$

-- ---------- CARS (CRUD) ----------

DROP PROCEDURE IF EXISTS sp_car_create $$
CREATE PROCEDURE sp_car_create (
  IN p_vin VARCHAR(32),
  IN p_make VARCHAR(60),
  IN p_model VARCHAR(60),
  IN p_year SMALLINT,
  IN p_color VARCHAR(30),
  IN p_plate_number VARCHAR(20),
  IN p_price DECIMAL(12,2),
  IN p_mileage INT,
  IN p_image_url VARCHAR(255)
)
BEGIN
  INSERT INTO cars (vin, make, model, year, color, plate_number, price, mileage, image_url)
  VALUES (p_vin, p_make, p_model, p_year, p_color, p_plate_number, p_price, IFNULL(p_mileage,0), p_image_url);
  SELECT LAST_INSERT_ID() AS new_car_id;
END $$

DROP PROCEDURE IF EXISTS sp_car_list $$
CREATE PROCEDURE sp_car_list (
  IN p_status VARCHAR(20)
)
BEGIN
  SELECT * FROM cars
  WHERE (p_status IS NULL OR p_status = '' OR status = p_status)
  ORDER BY created_at DESC;
END $$

DROP PROCEDURE IF EXISTS sp_car_get $$
CREATE PROCEDURE sp_car_get (
  IN p_id INT
)
BEGIN
  SELECT * FROM cars WHERE id = p_id LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS sp_car_update $$
CREATE PROCEDURE sp_car_update (
  IN p_id INT,
  IN p_make VARCHAR(60),
  IN p_model VARCHAR(60),
  IN p_year SMALLINT,
  IN p_color VARCHAR(30),
  IN p_plate_number VARCHAR(20),
  IN p_price DECIMAL(12,2),
  IN p_mileage INT,
  IN p_status VARCHAR(20),
  IN p_image_url VARCHAR(255)
)
BEGIN
  UPDATE cars SET
    make = p_make,
    model = p_model,
    year = p_year,
    color = p_color,
    plate_number = p_plate_number,
    price = p_price,
    mileage = p_mileage,
    status = p_status,
    image_url = IFNULL(p_image_url, image_url)
  WHERE id = p_id;
  SELECT ROW_COUNT() AS affected_rows;
END $$

DROP PROCEDURE IF EXISTS sp_car_delete $$
CREATE PROCEDURE sp_car_delete (
  IN p_id INT
)
BEGIN
  DELETE FROM cars WHERE id = p_id;
  SELECT ROW_COUNT() AS affected_rows;
END $$

-- ---------- DASHBOARD STATS ----------

DROP PROCEDURE IF EXISTS sp_dashboard_stats $$
CREATE PROCEDURE sp_dashboard_stats ()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM cars) AS total_cars,
    (SELECT COUNT(*) FROM cars WHERE status = 'in_stock') AS in_stock,
    (SELECT COUNT(*) FROM cars WHERE status = 'reserved') AS reserved,
    (SELECT COUNT(*) FROM cars WHERE status = 'sold') AS sold,
    (SELECT COUNT(*) FROM cars WHERE status = 'checked_out') AS checked_out,
    (SELECT COUNT(*) FROM checkinout WHERE check_in_at IS NULL) AS active_checkouts,
    (SELECT COUNT(*) FROM bookings WHERE booking_status NOT IN ('cancelled')) AS total_bookings,
    (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') AS confirmed_bookings,
    (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE payment_status = 'paid') AS total_revenue;
END $$

-- ---------- CHECK-IN / CHECK-OUT ----------

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

-- ---------- BOOKINGS (CRUD + Payment) ----------

DROP PROCEDURE IF EXISTS sp_booking_create $$
CREATE PROCEDURE sp_booking_create (
  IN p_car_id INT,
  IN p_customer_name VARCHAR(120),
  IN p_customer_email VARCHAR(150),
  IN p_customer_phone VARCHAR(30),
  IN p_total_amount DECIMAL(12,2),
  IN p_payment_method VARCHAR(30),
  IN p_notes VARCHAR(255)
)
BEGIN
  INSERT INTO bookings (car_id, customer_name, customer_email, customer_phone, total_amount, payment_method, notes)
  VALUES (p_car_id, p_customer_name, p_customer_email, p_customer_phone, p_total_amount, p_payment_method, p_notes);

  UPDATE cars SET status = 'reserved' WHERE id = p_car_id;

  SELECT LAST_INSERT_ID() AS new_booking_id;
END $$

DROP PROCEDURE IF EXISTS sp_booking_list $$
CREATE PROCEDURE sp_booking_list ()
BEGIN
  SELECT
    b.id, b.car_id, c.vin, c.make, c.model, c.year, c.price, c.plate_number,
    b.customer_name, b.customer_email, b.customer_phone,
    b.total_amount, b.payment_method, b.payment_status, b.booking_status,
    b.notes, b.created_at, b.updated_at
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  ORDER BY b.created_at DESC;
END $$

DROP PROCEDURE IF EXISTS sp_booking_get $$
CREATE PROCEDURE sp_booking_get (
  IN p_id INT
)
BEGIN
  SELECT
    b.*, c.vin, c.make, c.model, c.year, c.plate_number
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_id
  LIMIT 1;
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

DROP PROCEDURE IF EXISTS sp_booking_delete $$
CREATE PROCEDURE sp_booking_delete (
  IN p_id INT
)
BEGIN
  DECLARE v_car_id INT;
  SELECT car_id INTO v_car_id FROM bookings WHERE id = p_id;

  DELETE FROM bookings WHERE id = p_id;

  UPDATE cars SET status = 'in_stock' WHERE id = v_car_id;

  SELECT ROW_COUNT() AS affected_rows;
END $$

-- ---------- PAYMENTS ----------

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

DROP PROCEDURE IF EXISTS sp_payment_list_by_booking $$
CREATE PROCEDURE sp_payment_list_by_booking (
  IN p_booking_id INT
)
BEGIN
  SELECT * FROM payments WHERE booking_id = p_booking_id ORDER BY created_at DESC;
END $$

DELIMITER ;

-- ============================================================
-- NOTE: No demo user is seeded here on purpose (a hard-coded
-- password hash in a public schema file is a bad habit to pick up).
-- Open frontend/register.html once after setup to create the
-- first admin account through the real registration flow.
-- ============================================================
