# TODO: Fix "Network error – could not reach the server."

## Status
✅ Updated `frontend/js/api.js` to use a robust, absolute API base URL resolution (no fragile `../backend/api/` relative paths).

## Next steps
1. Open the app via Laragon HTTP URL (not `file://`).
2. Check browser console for `🔧 API base URL:` and confirm it points to `.../backend/api/`.
3. Open `session.php` in DevTools (Network tab) or trigger login/session load and confirm you get JSON (200/401), not a network error.
4. If HTTP 500 persists, inspect backend `Database connection failed` / SQL / stored procedures errors.

