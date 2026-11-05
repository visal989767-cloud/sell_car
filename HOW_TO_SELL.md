 # How to Sell a Car & See the Money in the Payment Summary

This system distinguishes **Check In / Check Out** (test drives & reservations —
**no money**) from **Bookings & Payments** (actual **sales** — money ✅).

> Those "Honda Accord / visal / Out / Returned" rows you see are **test-drive /
> reservation logs**. They will **never** add money to the Payment Summary.
> A car sale only happens through the **Bookings & Payments** page.

---

## The flow that records a sale

1. Go to **Inventory (Stock)** → find the car you want to sell (it must be **In Stock**).
2. Click the **🛒 Buy** button on that car.
   - You will be taken to **Bookings & Payments** with the car pre-selected.
   - Or, on the **Bookings & Payments** page itself, click **+ New Booking** and
     pick the vehicle from the dropdown.
3. Fill in the customer details (name required; email/phone optional).
4. **Total Amount** auto-fills with the car's price — adjust if needed.
5. Choose a **Payment Method** (QR, Wing Bank, ABA Bank, Credit/Debit Card, Cash,
   Bank Transfer).
6. If you picked a card method, enter any card number (at least 8 digits),
   expiry + CVV — this is a **simulated** payment.
7. Click **Process Payment & Book**.

### What happens on success
- A **booking** is created and marked **paid / confirmed**.
- A payment record is saved to the `payments` ledger.
- The car's status automatically flips to **Sold** (done by the updated
  `sp_payment_process` stored procedure).
- The **Payment Summary** card at the bottom of the page updates instantly:
  - **Total $** = sum of all **paid** bookings.
  - Count line = "X bookings · Y completed · Z pending".
  - Gauge shows the **% paid**.

---

## I already paid for a car but it still shows "reserved" / summary is $0

- Open **Bookings & Payments** → find the booking → click **👁 View Details**.
- If the payment shows **Paid** but the booking is not **Completed**, click
  **Complete Sale** to mark it completed → the car becomes **Sold**.
- The Payment Summary counts **any booking whose payment_status = 'paid'**,
  regardless of whether it is confirmed or completed, so the money should already
  be included there once the booking shows **Paid**.

If the summary still shows $0 even though paid bookings exist, you may be running
a **stale cached `booking.js`**. Do a **hard refresh** (Ctrl+Shift+R) so the
browser reloads `frontend/js/booking.js?v=20260803` — that version always
updates the Payment Summary before the (optional) React widget.

---

## Notes on cancel / delete

- **Cancel Booking** releases the car back to **In Stock** and removes the sale.
- Deleting a car does not delete its booking/payment history (FK keeps them).

