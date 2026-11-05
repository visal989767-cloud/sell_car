-- ============================================================
-- Migration: Add login_log table to record who logs in and when
-- Run against the existing car_seller_db database.
-- ============================================================

USE car_seller_db;

CREATE TABLE IF NOT EXISTS login_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  full_name  VARCHAR(120) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'staff',
  login_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  CONSTRAINT fk_login_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
