# Task: Prevent price changes when buying a car

The price of a car must be locked to the vehicle's listed price (cars.price)
and cannot be changed by the user during the booking/purchase flow.

## Steps

- [x] 1. Make the `#bookAmount` field read-only in `frontend/booking.html`
- [x] 2. Update the amount hint text in `frontend/booking.html`
- [x] 3. Update `frontend/js/booking.js` to always use the selected car's price
- [x] 4. Update `backend/api/booking.php` to ignore client-supplied total_amount and use the database car price
- [x] 5. Verify the fix end-to-end

# Task: Track login / account creation in the database

- [x] 1. Confirm account creations are stored in the `users` table (created_at)
- [x] 2. Create `login_log` table migration (schema + apply script)
- [x] 3. Update `backend/api/login.php` to record every successful login
- [x] 4. Apply migration and verify PHP syntax
- [x] 5. Fix `register.html` – it was saving accounts to localStorage instead of the DB (injected inline script). Replaced with api.js + auth.js so new accounts go to the `users` table via `register.php`.
