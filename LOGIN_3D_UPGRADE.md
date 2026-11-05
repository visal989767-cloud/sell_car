# 🏎️ Login Upgrade — Loading Screen + 3D Car Showroom

A professional upgrade to the AutoStock login experience plus 3D showroom flair across the whole app.

---

## What changed

### 1. Professional login with real loading screen ✅
- **`frontend/js/auth.js`**
  - On submit, a **fullscreen car-themed loader** appears instantly (`#loginLoader`).
  - A real animated car drives along a track while a **progress bar fills** through staged status messages:
    1. `Verifying credentials…`
    2. `Connecting to dealer console…`
    3. `Syncing inventory data…`
    4. `Starting your engine…`
  - After a successful API response, the loader plays a personalised welcome
    (`Welcome, {name}! Loading your inventory…`) and **redirects to `cars.html`**.
  - On failure the loader hides and the error is shown on the form.
- **`frontend/index.html`**
  - Added the fullscreen loader markup + CSS (glass card, animated car, progress bar).
  - Added a **password show/hide toggle** (`👁`/`🙈`) next to the password field.

### 2. Professional car-themed login redesign ✅
- **`frontend/index.html`**
  - Dark premium backdrop with **animated glow orbs** and a **blueprint grid** overlay.
  - Fixed **top brand bar** with a live `● Systems operational` pulse pill.
  - Left visual: strong headline, **3D showroom** box, stats row (`12k+ vehicles`, `98%`, `4.9★`).
  - Right: polished **glassmorphism login card** with gold accents, entrance animation and a top light-line.
  - Fully responsive (single column on tablets, mascot hidden on very small phones).

### 3. 3D car mascot ✅
- **`frontend/index.html`** — the showroom box contains a **single `<model-viewer>` scene**:
  - 🏎️ **ToyCar** (Khronos glTF sample) — spinning showroom car.
  - Renders with shadows and soft lighting using the official **Google `<model-viewer>` v3.4** library.

### 4. 3D background car on every app page ✅
Added the auto-rotating **ToyCar** 3D background (bottom-right, subtle, blurred radius glow) to:
- `frontend/dashboard.html`
- `frontend/cars.html`  ← the login redirect destination
- `frontend/checkinout.html`
- `frontend/booking.html`
- `frontend/register.html`

All pages load `<model-viewer>` via `https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js`.

---

## 3D models used
| Element | Model | Source |
|---|---|---|
| Showroom car / background car | `ToyCar.glb` | Khronos glTF Sample Models |

## How to test
1. Open `frontend/index.html` in a browser (or via Laragon: `http://localhost/car-seller-management-system-fixed/frontend/index.html`).
2. Sign in with a valid account — the **car driving loader** appears and then you land on **`cars.html`** (Inventory), which also shows the 3D background car.
3. Wrong password → loader hides and the error shows in the card.

