const API = 'https://susan-murray-production.up.railway.app/api/inventory';

// Load inventory on page load
document.addEventListener('DOMContentLoaded', () => {
  loadInventory();

  // Live search
  document.getElementById('search').addEventListener('input', loadInventory);
  document.getElementById('filterColor').addEventListener('change', loadInventory);
  document.getElementById('filterStatus').addEventListener('change', loadInventory);
});

async function loadInventory() {
  const search = document.getElementById('search').value;
  const color  = document.getElementById('filterColor').value;
  const status = document.getElementById('filterStatus').value;

  let url = `${API}?search=${search}&color=${color}&status=${status}`;

  const res  = await fetch(url);
  const data = await res.json();

  renderTable(data);
  populateColorFilter(data);
}

function renderTable(items) {
  const tbody = document.getElementById('inventoryTable');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No items found.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const lowStock = item.stock < 10;
    const statusBadge = {
      'ready':   'badge-ready',
      'in use':  'badge-inuse',
      'damaged': 'badge-damaged',
      'washing': 'badge-washing',
    }[item.status] || 'badge-ready';

    return `
      <tr class="${lowStock ? 'low-stock' : ''}">
        <td>${item.name}</td>
        <td>${item.color || '—'}</td>
        <td>${item.size || '—'}</td>
        <td>
          ${item.stock}
          ${lowStock ? '<span class="badge badge-low">Low</span>' : ''}
        </td>
        <td><span class="badge ${statusBadge}">${item.status}</span></td>
        <td>${item.note || '—'}</td>
        <td>
          <button class="btn-warning" onclick="editItem(${item.id})">Edit</button>
          <button class="btn-danger"  onclick="deleteItem(${item.id})">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function populateColorFilter(items) {
  const select = document.getElementById('filterColor');
  const current = select.value;
  const colors = [...new Set(items.map(i => i.color).filter(Boolean))];

  select.innerHTML = '<option value="">All Colors</option>' +
    colors.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
}

// Modal
function openModal() {
  document.getElementById('modalTitle').textContent = 'Add Item';
  document.getElementById('editId').value = '';
  document.getElementById('fieldName').value = '';
  document.getElementById('fieldColor').value = '';
  document.getElementById('fieldSize').value = '';
  document.getElementById('fieldStock').value = '';
  document.getElementById('fieldStatus').value = 'ready';
  document.getElementById('fieldNote').value = '';
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

async function editItem(id) {
  const res  = await fetch(`${API}/${id}`);
  const item = await res.json();

  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('editId').value   = item.id;
  document.getElementById('fieldName').value   = item.name;
  document.getElementById('fieldColor').value  = item.color || '';
  document.getElementById('fieldSize').value   = item.size || '';
  document.getElementById('fieldStock').value  = item.stock;
  document.getElementById('fieldStatus').value = item.status;
  document.getElementById('fieldNote').value   = item.note || '';
  document.getElementById('modalOverlay').classList.add('active');
}

async function saveItem() {
  const id = document.getElementById('editId').value;

  const body = {
    name:   document.getElementById('fieldName').value.trim(),
    color:  document.getElementById('fieldColor').value.trim(),
    size:   document.getElementById('fieldSize').value.trim(),
    stock:  parseInt(document.getElementById('fieldStock').value) || 0,
    status: document.getElementById('fieldStatus').value,
    note:   document.getElementById('fieldNote').value.trim(),
  };

  if (!body.name) return alert('Name is required.');

  const method = id ? 'PUT' : 'POST';
  const url    = id ? `${API}/${id}` : API;

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  closeModal();
  loadInventory();
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  await fetch(`${API}/${id}`, { method: 'DELETE' });
  loadInventory();
}