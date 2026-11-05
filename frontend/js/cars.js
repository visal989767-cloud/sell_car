let allCars = [];

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatStatus(status) {
  const labels = {
    in_stock: 'In Stock',
    reserved: 'Reserved',
    checked_out: 'Checked Out',
    sold: 'Sold'
  };
  return labels[status] || (status || 'Unknown').replace(/_/g, ' ');
}

function getElements() {
  return {
    wrap: document.getElementById('carsTableWrap'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    form: document.getElementById('carForm'),
    modalBackdrop: document.getElementById('carModalBackdrop'),
    modalTitle: document.getElementById('carModalTitle'),
    submitBtn: document.getElementById('carFormSubmit'),
    carId: document.getElementById('carId'),
    vin: document.getElementById('vin'),
    plateNumber: document.getElementById('plateNumber'),
    make: document.getElementById('make'),
    model: document.getElementById('model'),
    year: document.getElementById('year'),
    color: document.getElementById('color'),
    price: document.getElementById('price'),
    mileage: document.getElementById('mileage'),
    status: document.getElementById('status'),
    statusFieldWrap: document.getElementById('statusFieldWrap'),
    imageUrl: document.getElementById('imageUrl')
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await loadCurrentUser();
  if (!user) return;

  bindEvents();
  await loadCars();
});

function bindEvents() {
  const { searchInput, statusFilter, form, modalBackdrop } = getElements();

  searchInput.addEventListener('input', renderCars);
  statusFilter.addEventListener('change', renderCars);
  form.addEventListener('submit', saveCar);

  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
      closeCarModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCarModal();
    }
  });
}

async function loadCars() {
  const { wrap } = getElements();
  const res = await api.get('cars.php');

  if (!res.success) {
    wrap.innerHTML = `<div class="empty-state"><span class="icon">⚠️</span><div>Could not load inventory.</div><div style="margin-top:0.5rem;color:rgba(255,255,255,0.4)">${res.message || 'Unknown error'}</div></div>`;
    return;
  }

  allCars = Array.isArray(res.data) ? res.data : [];
  renderCars();
}

function renderCars() {
  const { wrap, searchInput, statusFilter } = getElements();
  const search = searchInput.value.toLowerCase().trim();
  const status = statusFilter.value;

  const rows = allCars.filter((car) => {
    const haystack = `${car.make || ''} ${car.model || ''} ${car.vin || ''} ${car.plate_number || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = !status || car.status === status;
    return matchesSearch && matchesStatus;
  });

  if (rows.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><span class="icon">🚗</span><div>No vehicles found.</div>${allCars.length === 0 ? '<div style="margin-top:0.5rem;color:rgba(255,255,255,0.4)">Add a vehicle to start syncing inventory with the database.</div>' : '<div style="margin-top:0.5rem;color:rgba(255,255,255,0.4)">Try a different search or filter.</div>'}</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Vehicle</th>
          <th>VIN / Plate</th>
          <th>Price</th>
          <th>Mileage</th>
          <th>Status</th>
          <th style="text-align:right">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((car) => {
          const thumbHtml = car.image_url
            ? `<img src="${car.image_url}" alt="${car.make} ${car.model}" loading="lazy" />`
            : `<span class="no-img">🚗</span>`;

          return `
            <tr>
              <td>
                <div class="cell-vehicle">
                  <div class="thumb">${thumbHtml}</div>
                  <div class="info">
                    <span class="name">${car.make || 'Unknown'} ${car.model || ''}</span>
                    <span class="sub">${car.year || '—'} · ${car.color || '—'}</span>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:rgba(255,255,255,0.45)">${car.vin || '—'}</div>
                <div style="font-size:0.72rem;color:rgba(255,255,255,0.25)">${car.plate_number || '—'}</div>
              </td>
              <td style="font-weight:600;color:#fff">${formatCurrency(car.price)}</td>
              <td style="color:rgba(255,255,255,0.6)">${Number(car.mileage || 0).toLocaleString()} mi</td>
              <td><span class="status-badge ${car.status || 'in_stock'}">${formatStatus(car.status)}</span></td>
              <td style="text-align:right">
                <div class="actions">
                  <button class="buy" onclick="buyCar(${car.id})" title="Buy">🛒</button>
                  <button class="edit" onclick="openCarModal(${car.id})" title="Edit">✎</button>
                  <button class="delete" onclick="deleteCar(${car.id})" title="Delete">✕</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openCarModal(id = null) {
  const elements = getElements();
  const { modalTitle, submitBtn, carId, vin, plateNumber, make, model, year, color, price, mileage, status, statusFieldWrap, imageUrl } = elements;

  elements.form.reset();
  carId.value = '';
  vin.disabled = false;
  statusFieldWrap.style.display = 'none';

  if (id) {
    const car = allCars.find((item) => item.id === Number(id));
    if (!car) {
      toast('Vehicle not found.', true);
      return;
    }

    modalTitle.textContent = 'Edit Vehicle';
    submitBtn.textContent = 'Save Changes';
    carId.value = car.id;
    vin.value = car.vin || '';
    vin.disabled = true;
    plateNumber.value = car.plate_number || '';
    make.value = car.make || '';
    model.value = car.model || '';
    year.value = car.year || '';
    color.value = car.color || '';
    price.value = car.price || '';
    mileage.value = car.mileage || 0;
    status.value = car.status || 'in_stock';
    imageUrl.value = car.image_url || '';
    statusFieldWrap.style.display = 'block';
  } else {
    modalTitle.textContent = 'Add Vehicle';
    submitBtn.textContent = 'Add Vehicle';
    status.value = 'in_stock';
  }

  elements.modalBackdrop.classList.add('open');
}

function closeCarModal() {
  const { modalBackdrop, form, vin } = getElements();
  modalBackdrop.classList.remove('open');
  form.reset();
  vin.disabled = false;
}

async function saveCar(event) {
  event.preventDefault();

  const { carId, vin, plateNumber, make, model, year, color, price, mileage, status, imageUrl } = getElements();
  const payload = {
    vin: vin.value.trim(),
    make: make.value.trim(),
    model: model.value.trim(),
    year: year.value,
    color: color.value.trim(),
    plate_number: plateNumber.value.trim(),
    price: price.value,
    mileage: mileage.value || 0,
    image_url: imageUrl.value.trim()
  };

  if (!payload.vin || !payload.make || !payload.model || !payload.year || payload.price === '') {
    toast('Please fill in the required fields.', true);
    return;
  }

  let res;
  if (carId.value) {
    res = await api.put('cars.php', {
      ...payload,
      id: Number(carId.value),
      status: status.value || 'in_stock'
    });
  } else {
    res = await api.post('cars.php', payload);
  }

  if (res.success) {
    toast(res.message || 'Vehicle saved.', false);
    closeCarModal();
    await loadCars();
  } else {
    toast(res.message || 'Could not save vehicle.', true);
  }
}

async function deleteCar(id) {
  if (!confirm('Remove this vehicle from stock?')) return;

  const res = await api.delete('cars.php', { id });
  if (res.success) {
    toast(res.message || 'Vehicle removed.', false);
    await loadCars();
  } else {
    toast(res.message || 'Could not delete vehicle.', true);
  }
}

// ==================== BUY CAR → BOOKING ====================

let selectedBuyCar = null;

function buyCar(id) {
  const car = allCars.find((item) => item.id === Number(id));
  if (!car) {
    toast('Vehicle not found.', true);
    return;
  }

  // Only allow purchase of cars that are actually available
  if (car.status && car.status !== 'in_stock') {
    toast(`This vehicle is ${formatStatus(car.status)} and cannot be purchased right now.`, true);
    return;
  }

  selectedBuyCar = car;
  const body = document.getElementById('buyModalBody');
  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.35);margin-bottom:4px;">Vehicle</div>
      <div style="font-family:'Oswald',sans-serif;font-size:1.5rem;font-weight:600;color:#fff;">${car.make || 'Unknown'} ${car.model || ''}</div>
      <div style="font-size:0.85rem;color:rgba(255,255,255,0.45);">${car.year || '—'} · ${car.color || '—'} · ${Number(car.mileage || 0).toLocaleString()} mi</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.9rem 1rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
      <span style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.35);">Price</span>
      <span style="font-family:'Oswald',sans-serif;font-size:1.4rem;font-weight:600;color:#facc15;">${formatCurrency(car.price)}</span>
    </div>
  `;

  document.getElementById('buyModalBackdrop').classList.add('open');
}

function closeBuyModal() {
  document.getElementById('buyModalBackdrop').classList.remove('open');
  selectedBuyCar = null;
}

function confirmBuy() {
  if (!selectedBuyCar) {
    closeBuyModal();
    return;
  }

  const carId = selectedBuyCar.id;
  closeBuyModal();
  window.location.href = `booking.html?car=${carId}`;
}

function toast(message, isError = false) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;

  const toastEl = document.createElement('div');
  toastEl.className = `toast ${isError ? 'error' : 'success'}`;
  toastEl.innerHTML = `<span class="toast-icon">${isError ? '❌' : '✅'}</span><span>${message}</span>`;
  wrap.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(20px)';
    toastEl.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toastEl.remove(), 300);
  }, 3000);
}

window.openCarModal = openCarModal;
window.closeCarModal = closeCarModal;
window.deleteCar = deleteCar;
window.buyCar = buyCar;
window.closeBuyModal = closeBuyModal;
window.confirmBuy = confirmBuy;
