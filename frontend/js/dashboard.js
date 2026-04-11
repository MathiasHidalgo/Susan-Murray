const API = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

async function loadDashboard() {
  const res  = await fetch(`${API}/dashboard`);
  const data = await res.json();

  renderStats(data);
  renderRecentLists(data.recent);
  renderLowStock(data.lowStockItems);
}

function renderStats(data) {
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card info">
      <div class="stat-label">Inventory Items</div>
      <div class="stat-value">${data.totalItems}</div>
      <div class="stat-sub">${data.totalStock} total units in stock</div>
    </div>
    <div class="stat-card ${data.lowStock > 0 ? 'danger' : 'success'}">
      <div class="stat-label">Low Stock</div>
      <div class="stat-value">${data.lowStock}</div>
      <div class="stat-sub">items below 10 units</div>
    </div>
    <div class="stat-card warning">
      <div class="stat-label">Pending Approval</div>
      <div class="stat-value">${data.pending}</div>
      <div class="stat-sub">packing lists waiting</div>
    </div>
    <div class="stat-card success">
      <div class="stat-label">Approved</div>
      <div class="stat-value">${data.approved}</div>
      <div class="stat-sub">packing lists approved</div>
    </div>
    <div class="stat-card danger">
      <div class="stat-label">Rejected</div>
      <div class="stat-value">${data.rejected}</div>
      <div class="stat-sub">packing lists rejected</div>
    </div>
  `;
}

function renderRecentLists(lists) {
  const container = document.getElementById('recentLists');

  if (!lists || lists.length === 0) {
    container.innerHTML = '<div class="empty-panel">No packing lists yet.</div>';
    return;
  }

  container.innerHTML = lists.map(pl => {
    const statusBadge = {
      pending:  '<span class="badge badge-washing">Pending</span>',
      approved: '<span class="badge badge-ready">Approved</span>',
      rejected: '<span class="badge badge-damaged">Rejected</span>',
    }[pl.status];

    const eventDate = pl.event_date
      ? new Date(pl.event_date).toLocaleDateString('en-CA', {
          month: 'short', day: 'numeric', year: 'numeric'
        })
      : '—';

    return `
      <div class="recent-row">
        <div class="recent-row-info">
          <h4>${pl.reference_number} ${statusBadge}</h4>
          <p>
            💳 ${pl.bill_to_name || '—'} &nbsp;|&nbsp;
            📦 ${pl.ship_to_name || '—'}
            ${pl.ship_to_event ? `— ${pl.ship_to_event}` : ''}
          </p>
          <p>📅 Event: ${eventDate} &nbsp;|&nbsp; 👤 ${pl.created_by_name}</p>
        </div>
        <a href="approval.html" style="font-size:12px;color:#4f46e5;font-weight:600;
           text-decoration:none;white-space:nowrap">View →</a>
      </div>
    `;
  }).join('');
}

function renderLowStock(items) {
  const container = document.getElementById('lowStockList');

  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-panel">✅ All items well stocked.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="low-stock-row">
      <div>
        <div class="item-name">${item.name}</div>
        <div class="item-detail">${item.color || ''} ${item.size || ''}</div>
      </div>
      <div class="stock-count">${item.stock} left</div>
    </div>
  `).join('');
}