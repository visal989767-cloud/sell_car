-- ============================================================
-- Migration: Expand bookings.payment_method ENUM
-- Add QR / Wing Bank / ABA Bank so those payment methods can be saved.
-- Run against the existing car_seller_db database.
-- ============================================================

USE car_seller_db;

ALTER TABLE bookings
  MODIFY COLUMN payment_method
    ENUM('credit_card','debit_card','cash','bank_transfer','qr','wing_bank','aba_bank')
    NOT NULL DEFAULT 'credit_card';

