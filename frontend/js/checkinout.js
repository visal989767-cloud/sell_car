let logRows = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await loadCurrentUser();
  if (!user) return;

  await loadLog();

  document.getElementById('stateFilter').addEventListener('change', renderLog);
  document.getElementById('checkoutForm').addEventListener('submit', submitCheckout);
});

async function loadLog() {
  const res = await api.get('checkinout.php');
  if (!res.success) {
    document.getElementById('logTableWrap').innerHTML = `<div class="empty-state">Could not load log: ${res.message}</div>`;
    return;
  }
  logRows = Array.isArray(res.data) ? res.data : [];
  renderLog();
}

function statusLabel(value) {
  const map = { test_drive: 'Test Drive', reservation: 'Reservation' };
  return map[value] || value || 'Unknown';
}

function bookingStatusLabel(s) {
  const map = { reserved: 'Reserved', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
  return map[s] || s || 'Unknown';
}

function toast(msg, isError = false) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}

function renderLog() {
  const filter = document.getElementById('stateFilter').value;
  const rows = logRows.filter(r => !filter || r.current_state === filter);
  const wrap = document.getElementById('logTableWrap');

  if (rows.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="big">No records</div>Check out a vehicle to start a log entry.</div>`;
    return;
  }

  // Use self-contained label formatters with typeof guards so rendering can
  // never throw a ReferenceError even if a stale/partial file is loaded.
  const purposeLabel = (value) => {
    if (typeof statusLabel === 'function') return statusLabel(value);
    const map = { test_drive: 'Test Drive', reservation: 'Reservation' };
    return map[value] || value || 'Unknown';
  };
  const bookingLabel = (s) => {
    if (typeof bookingStatusLabel === 'function') return bookingStatusLabel(s);
    const map = { reserved: 'Reserved', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    return map[s] || s || 'Unknown';
  };

  wrap.innerHTML = `
    <table>
      <thead>
        <tr><th>Vehicle</th><th>Customer</th><th>Purpose</th><th>Booking</th><th>Checked Out</th><th>Checked In</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td><strong>${r.make} ${r.model}</strong><div class="mono" style="font-size:12px">${r.vin}</div></td>
            <td>${r.customer_name}${r.customer_phone ? `<div class="text-dim" style="font-size:12px">${r.customer_phone}</div>` : ''}</td>
            <td>${purposeLabel(r.purpose)}</td>
            <td>${r.booking_id
              ? `<span class="purpose-badge" style="color:#4ade80;border-color:rgba(34,197,94,0.25);">Booking #${r.booking_id} · ${bookingLabel(r.booking_status)}</span>`
              : '<span class="text-dim" style="font-size:12px">—</span>'}</td>
            <td class="mono">${new Date(r.check_out_at).toLocaleString()}</td>
            <td class="mono">${r.check_in_at ? new Date(r.check_in_at).toLocaleString() : '<span class="text-dim">—</span>'}</td>
            <td><span class="badge ${r.current_state}">${r.current_state === 'out' ? 'Out' : 'Returned'}</span></td>
            <td>
              ${r.current_state === 'out'
                ? `<button class="btn btn-ghost btn-sm" onclick="checkIn(${r.id})">Check In</button>`
                : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function openCheckoutModal() {
  const select = document.getElementById('carSelect');
  select.innerHTML = '<option>Loading…</option>';
  document.getElementById('checkoutModalBackdrop').classList.add('open');

  const [res, bookingRes] = await Promise.all([
    api.get('cars.php?status=in_stock'),
    api.get('booking.php'),
  ]);

  if (!res.success) {
    select.innerHTML = '<option value="">Could not load vehicles</option>';
    return;
  }

  // Build a map of active bookings → car_id so we can tag those cars.
  const activeBookings = (bookingRes.success && Array.isArray(bookingRes.data))
    ? bookingRes.data.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'reserved')
    : [];

  // Booked cars have status 'reserved', so fetch them separately too so they
  // appear in the dropdown (we can't match them against the in_stock list).
  const bookedCarIds = activeBookings.map(b => Number(b.car_id));
  const allCars = [...res.data];
  if (bookedCarIds.length > 0) {
    const reservedRes = await api.get('cars.php', { status: 'reserved' });
    if (reservedRes.success && Array.isArray(reservedRes.data)) {
      reservedRes.data.forEach(c => {
        if (!allCars.some(x => Number(x.id) === Number(c.id))) allCars.push(c);
      });
    }
  }

  const optionHtml = activeBookings.map(b => {
    const car = allCars.find(c => Number(c.id) === Number(b.car_id));
    if (!car) return '';
    return `<option value="${car.id}" data-booking-id="${b.id}">${car.make} ${car.model} · ${car.vin} — Booking #${b.id} (${b.booking_status === 'confirmed' ? 'Confirmed' : 'Reserved'})</option>`;
  }).join('');

  const stockHtml = allCars
    .filter(c => !bookedCarIds.includes(Number(c.id)))
    .map(c => `<option value="${c.id}" data-booking-id="">${c.make} ${c.model} · ${c.vin}</option>`)
    .join('');

  select.innerHTML = (stockHtml + optionHtml) || '<option value="">No vehicles currently in stock</option>';

  // Store the selected booking id on the select for submitCheckout
  select.dataset.selectedBookingId = '';
  select.addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    this.dataset.selectedBookingId = opt ? (opt.dataset.bookingId || '') : '';
  });
}

function closeCheckoutModal() {
  document.getElementById('checkoutModalBackdrop').classList.remove('open');
  document.getElementById('checkoutForm').reset();
}

async function submitCheckout(e) {
  e.preventDefault();
  const select = document.getElementById('carSelect');
  const payload = {
    car_id: Number(select.value),
    customer_name: document.getElementById('customerName').value.trim(),
    customer_phone: document.getElementById('customerPhone').value.trim(),
    purpose: document.getElementById('purpose').value,
    notes: document.getElementById('notes').value.trim(),
    booking_id: select.dataset.selectedBookingId ? Number(select.dataset.selectedBookingId) : null,
  };

  if (!payload.car_id) {
    toast('Please select a vehicle.', true);
    return;
  }

  const res = await api.post('checkinout.php', payload);
  if (res.success) {
    toast(res.message || 'Vehicle checked out.');
    closeCheckoutModal();
    await loadLog();
  } else {
    toast(res.message || 'Could not check out vehicle.', true);
  }
}

async function checkIn(logId) {
  const res = await api.put('checkinout.php', { id: logId });
  if (res.success) {
    toast(res.message || 'Vehicle checked back in.');
    await loadLog();
  } else {
    toast(res.message || 'Could not check in vehicle.', true);
  }
}
