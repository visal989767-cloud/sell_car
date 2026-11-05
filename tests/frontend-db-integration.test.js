const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const pageChecks = [
  {
    file: 'frontend/booking.html',
    script: './js/booking.js?v=20260802',
  },
  {
    file: 'frontend/checkinout.html',
    script: './js/checkinout.js?v=20260802',
  },
  {
    file: 'frontend/dashboard.html',
    script: './js/dashboard.js?v=20260802',
  },
];

for (const { file, script } of pageChecks) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(html, new RegExp(`<script src="${script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`), `${file} should load the DB-backed script`);
}

const bookingHtml = fs.readFileSync(path.join(root, 'frontend/booking.html'), 'utf8');
assert.match(bookingHtml, /value="qr"/, 'booking.html should offer QR payment');
assert.match(bookingHtml, /value="wing_bank"/, 'booking.html should offer Wing Bank payment');
assert.match(bookingHtml, /value="aba_bank"/, 'booking.html should offer ABA payment');
assert.match(bookingHtml, /qr-payment\.svg/, 'booking.html should include the QR payment image');

const checkinoutJs = fs.readFileSync(path.join(root, 'frontend/js/checkinout.js'), 'utf8');
assert.match(checkinoutJs, /function statusLabel\(/, 'checkinout.js should define statusLabel');
assert.match(checkinoutJs, /function toast\(msg, isError = false\)/, 'checkinout.js should define toast');

console.log('Frontend DB integration checks passed.');
