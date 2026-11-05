-- ============================================================
-- Add Car (Product) helper query
-- ============================================================
-- Use this in DbForge/MySQL to insert a sample car into `cars`.
-- (Replace values as needed.)

-- Option A: Insert directly
INSERT INTO car_seller_db.cars
  (vin, make, model, year, color, plate_number, price, mileage, status, image_url)
VALUES
  ('VIN-DEMO-0001', 'Toyota', 'Corolla', 2022, 'Silver', 'ABC-123', 18500.00, 2500, 'in_stock', NULL);

-- Option B: Insert via stored procedure (preferred, if you use SPs)
-- CALL car_seller_db.sp_car_create(
--   'VIN-DEMO-0002',
--   'Honda',
--   'Civic',
--   2021,
--   'Black',
--   'XYZ-789',
--   16500.00,
--   4200,
--   NULL
-- );

