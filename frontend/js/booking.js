// frontend/js/booking.js – Bookings CRUD + Payment + React Widget

let allBookings = [];

function fmtMoney(v) {
  return '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await loadCurrentUser();
  if (!user) return;

  await loadBookings();

document.getElementById('bookingStatusFilter').addEventListener('change', renderBookings);
  document.getElementById('bookingForm').addEventListener('submit', submitBooking);

  // When the user picks a different vehicle, pre-fill the amount with its price.
  document.getElementById('bookCarSelect').addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    const amountInput = document.getElementById('bookAmount');
    const preview = document.getElementById('bookAmountPreview');
    if (opt && opt.dataset.price) {
      const price = Number(opt.dataset.price) || 0;
      if (amountInput) amountInput.value = price ? price.toFixed(2) : '';
      if (preview) preview.textContent = fmtMoney(price);
    } else {
      if (amountInput) amountInput.value = '';
      if (preview) preview.textContent = '$0.00';
    }
  });

  // Show/hide card fields and payment instructions based on payment method
  document.getElementById('bookPaymentMethod').addEventListener('change', function() {
    const cardFields = document.getElementById('cardPaymentFields');
    const instructionsWrap = document.getElementById('paymentInstructions');
    const instructionsText = document.getElementById('paymentInstructionsText');
    const paymentImageWrap = document.getElementById('paymentImageWrap');
    const showCardFields = this.value === 'credit_card' || this.value === 'debit_card';
    const showInstructions = this.value === 'qr' || this.value === 'wing_bank' || this.value === 'aba_bank';

    cardFields.style.display = showCardFields ? 'block' : 'none';
    instructionsWrap.style.display = showInstructions ? 'block' : 'none';
    paymentImageWrap.style.display = this.value === 'qr' ? 'block' : 'none';

    const paymentInstructions = {
      qr: 'Please scan the QR code in the payment app and confirm the transfer. The booking will be marked pending until payment is verified.',
      wing_bank: 'Please transfer the amount to the Wing Bank account shown on the invoice. The booking will be confirmed after the transfer is verified.',
      aba_bank: 'Please transfer the amount to the ABA Bank account shown on the invoice. The booking will be confirmed after the transfer is verified.',
    };

    instructionsText.textContent = paymentInstructions[this.value] || '';
  });
  // Card number auto-format
  document.getElementById('bookCardNumber').addEventListener('input', function() {
    this.value = this.value.replace(/[^\d\s]/g, '').replace(/(.{4})/g, '$1 ').trim();
  });
  // Expiry auto-format
  document.getElementById('bookCardExpiry').addEventListener('input', function() {
    const v = this.value.replace(/[^\d]/g, '');
    if (v.length >= 2) {
      this.value = v.slice(0,2) + '/' + v.slice(2,4);
    }
  });
  // Update amount preview
  document.getElementById('bookAmount').addEventListener('input', function() {
    const val = parseFloat(this.value) || 0;
    document.getElementById('bookAmountPreview').textContent = '$' + val.toLocaleString('en-US', {minimumFractionDigits: 2});
  });

  // Init React widget
  renderReactWidget();

  // If arriving from cars.html buy flow (booking.html?car=ID), auto-open
  // the New Booking modal with that vehicle pre-selected.
  const params = new URLSearchParams(window.location.search);
  if (params.has('car')) {
    await openBookingModal(Number(params.get('car')));
  }
});

// ==================== LOAD & RENDER ====================

async function loadBookings() {
  const res = await api.get('booking.php');
  if (!res.success) {
    document.getElementById('bookingsTableWrap').innerHTML = `<div class="empty-state">Could not load bookings: ${res.message}</div>`;
    return;
  }
  allBookings = Array.isArray(res.data) ? res.data : [];
  renderBookings();
  renderReactWidget();
}

function renderBookings() {
  const filter = document.getElementById('bookingStatusFilter').value;
  const rows = allBookings.filter(b => !filter || b.booking_status === filter);
  const wrap = document.getElementById('bookingsTableWrap');

  if (rows.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="big">No bookings found</div>Create a new booking to get started.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr><th>Vehicle</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr>
      </thead>
      <tbody>
        ${rows.map(b => `
          <tr>
            <td><strong>${b.make} ${b.model}</strong><div class="mono" style="font-size:12px">${b.vin}</div></td>
            <td>${b.customer_name}${b.customer_email ? `<div class="text-dim" style="font-size:12px">${b.customer_email}</div>` : ''}</td>
            <td style="font-family:var(--font-display);font-size:16px;">$${Number(b.total_amount).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            <td><span class="badge ${b.payment_status}">${paymentLabel(b.payment_status)}</span></td>
            <td><span class="badge ${b.booking_status}">${bookingLabel(b.booking_status)}</span></td>
            <td class="mono">${new Date(b.created_at).toLocaleDateString()}</td>
            <td>
              <div class="row-actions">
                <button class="icon-btn" title="View Details" onclick="viewBooking(${b.id})">👁</button>
                ${b.booking_status !== 'cancelled' && b.booking_status !== 'completed'
                  ? `<button class="icon-btn" title="Cancel Booking" onclick="cancelBooking(${b.id})">✕</button>`
                  : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ==================== MODALS ====================

async function openBookingModal(preselectedCarId = null) {
  const backdrop = document.getElementById('bookingModalBackdrop');
  document.getElementById('bookingForm').reset();
  document.getElementById('bookAmountPreview').textContent = '$0.00';
  document.getElementById('cardPaymentFields').style.display = 'none';
  document.getElementById('paymentInstructions').style.display = 'block';
  document.getElementById('paymentInstructionsText').textContent = 'Please scan the QR code in the payment app and confirm the transfer. The booking will be marked pending until payment is verified.';
  document.getElementById('paymentImageWrap').style.display = 'block';
  document.getElementById('bookSubmitBtn').disabled = false;
  document.getElementById('bookSubmitBtn').textContent = 'Process Payment & Book';

  // Load in-stock cars
  const select = document.getElementById('bookCarSelect');
  select.innerHTML = '<option value="">Loading…</option>';
  backdrop.classList.add('open');

  const res = await api.get('cars.php?status=in_stock');
  if (res.success && Array.isArray(res.data) && res.data.length > 0) {
    select.innerHTML = '<option value="">— Select a vehicle —</option>' +
      res.data.map(c =>
        `<option value="${c.id}" data-price="${c.price}">${c.make} ${c.model} · ${c.vin} — $${Number(c.price).toLocaleString()}</option>`
      ).join('');
  } else {
    select.innerHTML = '<option value="">No in-stock vehicles available</option>';
  }

// If arriving from the buy flow, pre-select the chosen vehicle
  if (preselectedCarId && res.success && Array.isArray(res.data)) {
    const match = res.data.find(c => Number(c.id) === Number(preselectedCarId));
    if (match) {
      select.value = String(match.id);
      // Pre-fill the amount with the selected vehicle's price.
      const amountInput = document.getElementById('bookAmount');
      const preview = document.getElementById('bookAmountPreview');
      if (amountInput) amountInput.value = (Number(match.price) || 0).toFixed(2);
      if (preview) preview.textContent = fmtMoney(match.price);
    } else {
      toast('The selected vehicle is no longer in stock. Please choose another.', true);
    }
  }
}

function closeBookingModal() {
  document.getElementById('bookingModalBackdrop').classList.remove('open');
}

async function submitBooking(e) {
  e.preventDefault();
  const btn = document.getElementById('bookSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Processing…';

const carSelect = document.getElementById('bookCarSelect');
  const selectedOpt = carSelect.options[carSelect.selectedIndex];

  const payload = {
    car_id: Number(carSelect.value),
    customer_name: document.getElementById('bookCustomerName').value.trim(),
    customer_email: document.getElementById('bookCustomerEmail').value.trim(),
    customer_phone: document.getElementById('bookCustomerPhone').value.trim(),
    payment_method: document.getElementById('bookPaymentMethod').value,
    card_number: document.getElementById('bookCardNumber').value.trim(),
    card_expiry: document.getElementById('bookCardExpiry').value.trim(),
    card_cvv: document.getElementById('bookCardCvv').value.trim(),
    notes: document.getElementById('bookNotes').value.trim(),
  };

  if (!payload.car_id) { toast('Please select a vehicle.', true); btn.disabled=false; btn.textContent='Process Payment & Book'; return; }
  if (!payload.customer_name) { toast('Customer name is required.', true); btn.disabled=false; btn.textContent='Process Payment & Book'; return; }

  // The price is locked to the vehicle's listed price (data-price) and cannot be changed.
  const lockedPrice = selectedOpt && selectedOpt.dataset.price ? Number(selectedOpt.dataset.price) : 0;
  if (!lockedPrice || lockedPrice <= 0) { toast('Could not determine the vehicle price.', true); btn.disabled=false; btn.textContent='Process Payment & Book'; return; }
  payload.total_amount = lockedPrice;
  document.getElementById('bookAmount').value = lockedPrice.toFixed(2);
  document.getElementById('bookAmountPreview').textContent = fmtMoney(lockedPrice);

  // Only require card details for card-based payments.
  // Any card is accepted (simulated payment) – just need something filled in.
  if (payload.payment_method === 'credit_card' || payload.payment_method === 'debit_card') {
    if (!payload.card_number || payload.card_number.replace(/\s/g, '').length < 8) {
      toast('Please enter a card number.', true);
      btn.disabled=false; btn.textContent='Process Payment & Book'; return;
    }
    if (!payload.card_expiry) {
      toast('Please enter the card expiry date (MM/YY).', true);
      btn.disabled=false; btn.textContent='Process Payment & Book'; return;
    }
    if (!payload.card_cvv) {
      toast('Please enter the CVV.', true);
      btn.disabled=false; btn.textContent='Process Payment & Book'; return;
    }
  }

  console.log('Submitting booking:', { ...payload, card_number: '••••' + (payload.card_number ? payload.card_number.slice(-4) : '') });

  const res = await api.post('booking.php', payload);
  btn.disabled = false;
  btn.textContent = 'Process Payment & Book';

  if (res.success) {
    toast(`✅ Payment received! Vehicle marked as Sold. Transaction: ${res.data.transaction_id}`);
    closeBookingModal();
    await loadBookings();
    renderReactWidget();
  } else {
    toast('❌ ' + (res.message || 'Booking failed.'), true);
  }
}

// ==================== VIEW / CANCEL ====================

function viewBooking(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;

  const detailBody = document.getElementById('bookingDetailBody');
  detailBody.innerHTML = `
    <div style="margin-bottom:18px;">
      <div class="eyebrow" style="font-family:var(--font-mono);color:var(--accent);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Vehicle</div>
      <h3 style="font-size:24px;">${b.make} ${b.model}</h3>
      <div style="color:var(--text-dim);font-size:13px;">VIN: ${b.vin} · ${b.year} · ${b.plate_number || 'No plate'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div style="background:var(--surface-2);padding:12px;border-radius:var(--radius-sm);">
        <div style="color:var(--text-dim);font-size:11px;text-transform:uppercase;">Customer</div>
        <div style="font-weight:600;">${b.customer_name}</div>
        <div style="font-size:12px;color:var(--text-dim);">${b.customer_email || ''}${b.customer_phone ? ' · ' + b.customer_phone : ''}</div>
      </div>
      <div style="background:var(--surface-2);padding:12px;border-radius:var(--radius-sm);">
        <div style="color:var(--text-dim);font-size:11px;text-transform:uppercase;">Amount</div>
        <div style="font-family:var(--font-display);font-size:22px;color:var(--good);">$${Number(b.total_amount).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
        <div style="font-size:12px;color:var(--text-dim);">via ${b.payment_method.replace('_',' ')}</div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div><span class="badge ${b.payment_status}">${paymentLabel(b.payment_status)}</span> Payment</div>
      <div><span class="badge ${b.booking_status}">${bookingLabel(b.booking_status)}</span> Booking</div>
    </div>
    ${b.notes ? `<div style="font-size:13px;color:var(--text-dim);">Notes: ${b.notes}</div>` : ''}
    <div style="font-size:12px;color:var(--text-faint);margin-top:12px;">Created: ${new Date(b.created_at).toLocaleString()}</div>
  `;

  const foot = document.getElementById('bookingDetailFoot');
  foot.innerHTML = `
    ${b.booking_status !== 'cancelled' && b.booking_status !== 'completed'
      ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">Cancel Booking</button>`
      : ''}
    ${b.booking_status !== 'cancelled' && b.booking_status !== 'completed' && b.payment_status === 'paid'
      ? `<button class="btn btn-primary btn-sm" onclick="completeSale(${b.id})">Complete Sale</button>`
      : ''}
    <button class="btn btn-ghost btn-sm" onclick="closeDetailModal()">Close</button>
  `;

  document.getElementById('bookingDetailModalBackdrop').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('bookingDetailModalBackdrop').classList.remove('open');
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking? The vehicle will be released back to stock.')) return;
  const res = await api.delete('booking.php', { id });
  if (res.success) {
    toast('Booking cancelled. Vehicle released.');
    closeDetailModal();
    await loadBookings();
    renderReactWidget();
  } else {
    toast('Could not cancel booking: ' + (res.message || ''), true);
  }
}

// ==================== REACT WIDGET ====================

function renderReactWidget() {
  const root = document.getElementById('reactWidgetRoot');

  // Calculate summary stats (always – the Payment Summary card depends on this)
  const totalBookings = allBookings.length;
  const confirmed = allBookings.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'completed').length;
  const totalRevenue = allBookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const pendingPayments = allBookings.filter(b => b.payment_status === 'pending').length;

  updatePaymentSummary({ totalBookings, confirmed, totalRevenue, pendingPayments });

  // The React widget is optional – if React isn't loaded, only the summary is updated.
  if (!root || typeof React === 'undefined') return;

  // Render React component directly into root
  const e = React.createElement;
  const widget = e('div', { style: { padding: '8px 0' } },
    e('div', {
      style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }
    },
      e('div', { style: { background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius-sm)' } },
        e('div', { style: { color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Total Bookings'),
        e('div', { style: { fontFamily: 'var(--font-display)', fontSize: '28px', marginTop: '4px' } }, String(totalBookings))
      ),
      e('div', { style: { background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius-sm)' } },
        e('div', { style: { color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Confirmed'),
        e('div', { style: { fontFamily: 'var(--font-display)', fontSize: '28px', marginTop: '4px', color: 'var(--good)' } }, String(confirmed))
      ),
      e('div', { style: { background: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius-sm)' } },
        e('div', { style: { color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' } }, pendingPayments > 0 ? 'Pending Payments' : 'Revenue'),
        e('div', { style: { fontFamily: 'var(--font-display)', fontSize: '28px', marginTop: '4px', color: pendingPayments > 0 ? 'var(--warn)' : 'var(--good)' } },
          pendingPayments > 0 ? String(pendingPayments) : '$' + Number(totalRevenue).toLocaleString('en-US', {minimumFractionDigits:0})
        )
      )
    ),
    e('div', { style: { color: 'var(--text-faint)', fontSize: '12px', fontFamily: 'var(--font-mono)' } },
      `Last updated: ${new Date().toLocaleTimeString()} · ${totalBookings > 0 ? totalBookings + ' booking' + (totalBookings !== 1 ? 's' : '') : 'No bookings yet'}`
    )
  );

  const reactRoot = ReactDOM.createRoot ? ReactDOM.createRoot(root) : null;
  if (reactRoot) {
    reactRoot.render(widget);
  } else {
    // Fallback for React 17
    ReactDOM.render(widget, root);
  }
}

// ==================== PAYMENT SUMMARY ====================

function updatePaymentSummary({ totalBookings = 0, confirmed = 0, totalRevenue = 0, pendingPayments = 0 } = {}) {
  const totalValueEl = document.getElementById('paymentTotalValue');
  const totalAmountEl = document.getElementById('totalAmountDisplay');
  const countEl = document.getElementById('bookingCountDisplay');
  const gaugeEl = document.getElementById('paymentGauge');
  const gaugePercentEl = document.getElementById('gaugePercent');

  const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Total money collected (paid bookings)
  if (totalAmountEl) totalAmountEl.textContent = fmt.format(Math.round(totalRevenue || 0));
  if (countEl) {
    countEl.textContent = `${totalBookings} booking${totalBookings !== 1 ? 's' : ''} · ${confirmed} completed · ${pendingPayments} pending`;
  }

  // Percentage of paid bookings
  const paidCount = allBookings.filter(b => b.payment_status === 'paid').length;
  const paidPct = totalBookings > 0 ? Math.round((paidCount / totalBookings) * 100) : 0;
  if (gaugePercentEl) gaugePercentEl.textContent = paidPct + '%';

  // Gauge ring: conic-gradient fill based on % paid
  if (gaugeEl) {
    const grad = `conic-gradient(#facc15 0% ${paidPct}%, rgba(255,255,255,0.06) ${paidPct}% 100%)`;
    gaugeEl.style.background = grad;
  }

  // The whole value block only shows once there is revenue
  if (totalValueEl) {
    totalValueEl.style.opacity = totalRevenue > 0 ? '1' : '0.55';
  }
}

// ==================== COMPLETE SALE ====================

async function completeSale(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  if (!confirm(`Complete the sale of the ${b.make} ${b.model} to ${b.customer_name}? The vehicle will be marked as Sold.`)) return;

  const res = await api.put('booking.php', { id, booking_status: 'completed' });
  if (res.success) {
    toast('✅ Sale completed! Vehicle marked as Sold.');
    closeDetailModal();
    await loadBookings();
    renderReactWidget();
  } else {
    toast('Could not complete sale: ' + (res.message || ''), true);
  }
}

// ==================== HELPERS ====================

function paymentLabel(s) {
  const map = { pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' };
  return map[s] || s || 'Unknown';
}

function bookingLabel(s) {
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

