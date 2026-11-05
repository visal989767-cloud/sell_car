// frontend/js/dashboard.js – fetch and render dashboard data

function pct(part, total) {
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return Math.round((Number(part) || 0) * 100 / t);
}

function totalPct(stats) {
    return pct(stats?.in_stock ?? 0, stats?.total_cars ?? 0);
}

function renderGauge(pctValue) {
    const svg = document.getElementById('gaugeSvg');
    if (!svg) return;
    const cx = 90, cy = 95, r = 75;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (pctValue / 100) * circumference;

    // Color based on %: green (>60%), yellow (30-60%), red (<30%)
    let arcColor = '#3ddc97';
    if (pctValue < 30) arcColor = '#ff4d5e';
    else if (pctValue < 60) arcColor = '#ffc94d';

    svg.innerHTML = `
        <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${arcColor}" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="${arcColor}" stop-opacity="0.8"/>
            </linearGradient>
        </defs>
        <!-- Background arc -->
        <path d="M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy}"
              fill="none" stroke="var(--surface-2, #232933)" stroke-width="14" stroke-linecap="round"/>
        <!-- Value arc -->
        <path d="M ${cx - r},${cy} A ${r},${r} 0 ${pctValue > 50 ? 1 : 0},1 ${cx + r},${cy}"
              fill="none" stroke="${arcColor}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              style="transition: stroke-dashoffset 1.2s ease;"/>
        <!-- Center percentage text -->
        <text x="${cx}" y="${cy - 4}" text-anchor="middle"
              fill="var(--text, #eef1f5)" font-family="var(--font-display, 'Oswald')"
              font-size="28" font-weight="700">${pctValue}%</text>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle"
              fill="var(--text-dim, #8b93a1)" font-family="var(--font-mono, 'JetBrains Mono')"
              font-size="11">ON LOT</text>
    `;
}

async function loadDashboard() {

    try {
        // Fetch stats from backend
        const res = await api.get('dashboard.php');
        if (!res.success) {
            throw new Error(res.message || 'Failed to load dashboard');
        }
        const stats = res.data || {};
        console.log('Dashboard stats payload:', stats);

        const grid = document.getElementById('statGrid');
        grid.innerHTML = `
            <div class="stat-card good">
                <div class="label">In Stock</div>
                <div class="value">${Number(stats.in_stock ?? 0).toLocaleString()}</div>
                <div class="bar"><span style="width:${totalPct(stats)}%"></span></div>
            </div>
            <div class="stat-card warn">
                <div class="label">Reserved</div>
                <div class="value">${Number(stats.reserved ?? 0).toLocaleString()}</div>
                <div class="bar"><span style="width:${pct(stats.reserved ?? 0, stats.total_cars ?? 0)}%"></span></div>
            </div>
            <div class="stat-card bad">
                <div class="label">Sold</div>
                <div class="value">${Number(stats.sold ?? 0).toLocaleString()}</div>
                <div class="bar"><span style="width:${pct(stats.sold ?? 0, stats.total_cars ?? 0)}%"></span></div>
            </div>
            <div class="stat-card warn">
                <div class="label">Active Check-outs</div>
                <div class="value">${Number(stats.active_checkouts ?? 0).toLocaleString()}</div>
                <div class="bar"><span style="width:${pct(stats.checked_out ?? 0, stats.total_cars ?? 0)}%"></span></div>
            </div>
            <div class="stat-card good">
                <div class="label">Total Bookings</div>
                <div class="value">${Number(stats.total_bookings ?? 0).toLocaleString()}</div>
                <div class="bar"><span style="width:${pct(stats.confirmed_bookings ?? 0, stats.total_bookings ?? 1)}%"></span></div>
            </div>
            <div class="stat-card good">
                <div class="label">Revenue (Paid)</div>
                <div class="value">$${Number(stats.total_revenue ?? 0).toLocaleString('en-US', {minimumFractionDigits:0})}</div>
                <div class="bar"><span style="width:${pct(stats.confirmed_bookings ?? 0, stats.total_bookings ?? 1)}%"></span></div>
            </div>
        `;

        // Gauge: availability on lot (in_stock)
        const inStock = Number(stats.in_stock ?? 0);
        const total = Number(stats.total_cars ?? 0);
        const availPct = pct(inStock, total);
        document.getElementById('gaugeHeadline').textContent = `${availPct}% on lot`;
        renderGauge(availPct);

        // Recent activity – load last 5 items from checkinout
        try {
            const logRes = await api.get('checkinout.php');
            if (logRes.success && Array.isArray(logRes.data)) {
                const recent = logRes.data.slice(0, 5);
                const activity = document.getElementById('recentActivity');
                if (recent.length === 0) {
                    activity.innerHTML = `<div class="empty-state"><div class="big">No activity yet</div>Check out a vehicle to see activity here.</div>`;
                } else {
                    activity.innerHTML = `
                        <table>
                            <thead>
                                <tr><th>Vehicle</th><th>Customer</th><th>Status</th><th>When</th></tr>
                            </thead>
                            <tbody>
                                ${recent.map(r => `
                                    <tr>
                                        <td><strong>${r.make} ${r.model}</strong></td>
                                        <td>${r.customer_name}</td>
                                        <td><span class="badge ${r.current_state}">${r.current_state === 'out' ? 'Out' : 'Returned'}</span></td>
                                        <td class="mono">${new Date(r.check_out_at).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
            }
        } catch (logErr) {
            console.warn('Could not load recent activity:', logErr);
        }

    } catch (e) {
        console.error('Dashboard load error:', e);
    }
}

// Load user and dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const user = await loadCurrentUser();
    if (user) {
        await loadDashboard();
    }
});
