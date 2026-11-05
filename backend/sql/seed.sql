-- ============================================================
-- Seed Data for Car Seller Management System
-- ============================================================

USE car_seller_db;

-- -----------------------------------------------------------
-- Sample Cars (Vehicles)
-- -----------------------------------------------------------
INSERT INTO cars (vin, make, model, year, color, plate_number, price, mileage, status) VALUES
('VIN-DEMO-0001', 'Toyota',  'Corolla',  2022, 'Silver', 'ABC-123', 18500.00, 2500,  'in_stock'),
('VIN-DEMO-0002', 'Honda',   'Civic',    2021, 'Black',  'XYZ-789', 16500.00, 4200,  'in_stock'),
('VIN-DEMO-0003', 'Ford',    'Mustang',  2023, 'Red',    'MUS-001', 42000.00, 1200,  'in_stock'),
('VIN-DEMO-0004', 'BMW',     'X5',       2022, 'White',  'BMW-555', 55000.00, 8900,  'reserved'),
('VIN-DEMO-0005', 'Tesla',   'Model 3',  2023, 'Blue',   'TES-001', 38900.00, 600,   'in_stock'),
('VIN-DEMO-0006', 'Chevrolet', 'Camaro', 2022, 'Yellow', 'CAM-002', 36000.00, 3100,  'sold'),
('VIN-DEMO-0007', 'Audi',    'Q7',       2021, 'Gray',   'AUD-007', 48000.00, 15000, 'checked_out'),
('VIN-DEMO-0008', 'Nissan',  'Altima',   2023, 'Silver', 'ALT-003', 24500.00, 800,   'in_stock'),
('VIN-DEMO-0009', 'Mercedes','C-Class',  2022, 'Black',  'MERC-01', 41000.00, 5400,  'in_stock'),
('VIN-DEMO-0010', 'Hyundai', 'Tucson',   2023, 'Green',  'HYU-010', 27500.00, 1800,  'in_stock');

-- -----------------------------------------------------------
-- Sample Check In / Check Out Log
-- -----------------------------------------------------------
INSERT INTO checkinout (car_id, customer_name, customer_phone, purpose, check_out_at, check_in_at) VALUES
(1, 'John Smith',   '555-0101', 'test_drive',   '2024-03-10 14:00:00', '2024-03-10 16:30:00'),
(2, 'Sarah Johnson','555-0102', 'reservation',  '2024-03-11 09:00:00', NULL),
(3, 'Mike Davis',   '555-0103', 'test_drive',   '2024-03-12 11:00:00', '2024-03-12 13:15:00'),
(7, 'Emily White',  '555-0104', 'test_drive',   '2024-03-13 10:30:00', NULL);

-- -----------------------------------------------------------
-- Demo User — password for BOTH accounts is: password
-- (verified: bcrypt hash below matches 'password', NOT 'dealer123' —
-- an earlier comment here was wrong and caused login confusion)
-- -----------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Demo Admin', 'admin@autostock.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Staff User', 'staff@autostock.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff');

-- Alternative: to log in with 'visal' / 'visal123' instead, run:
-- http://localhost/.../backend/api/create_test_user.php
-- Or register your own account via frontend/register.html

