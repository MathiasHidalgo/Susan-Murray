const API = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  generateRefPreview();
  addItemRow(); // start with one empty row
});

// Load employees into dropdown
async function loadUsers() {
  const res  = await fetch(`${API}/users`);
  const data = await res.json();
  const sel  = document.getElementById('createdBy');
  sel.innerHTML = '<option value="">-- Select Employee --</option>' +
    data.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
}

// Preview the next ref number
async function generateRefPreview() {
  const year = new Date().getFullYear();
  const res  = await fetch(`${API}/packing-lists`);
  const data = await res.json();
  const thisYear = data.filter(pl => pl.reference_number.startsWith(`PL-${year}`));
  const next = thisYear.length + 1;
  const ref  = `PL-${year}-${String(next).padStart(4, '0')}`;
  document.getElementById('refDisplay').textContent = ref;
}

// Add a row to the items table
function addItemRow() {
  const tbody = document.getElementById('itemsBody');
  const row   = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" placeholder="e.g. Rustic Glam" /></td>
    <td><input type="text" placeholder="e.g. Leaf Green - 132&quot; RD" /></td>
    <td><input type="number" value="1" min="1" /></td>
    <td><button class="btn-danger" onclick="this.closest('tr').remove()">✕</button></td>
  `;
  tbody.appendChild(row);
}

// Collect and submit the form
async function submitList() {
  const created_by      = document.getElementById('createdBy').value;
  const bill_to_name    = document.getElementById('billToName').value.trim();
  const bill_to_phone   = document.getElementById('billToPhone').value.trim();
  const ship_to_name    = document.getElementById('shipToName').value.trim();
  const ship_to_event   = document.getElementById('shipToEvent').value.trim();
  const ship_to_address = document.getElementById('shipToAddress').value.trim();
  const ship_date       = document.getElementById('shipDate').value;
  const ship_via        = document.getElementById('shipVia').value.trim();
  const tracking_number = document.getElementById('trackingNumber').value.trim();
  const delivery_time   = document.getElementById('deliveryTime').value.trim();
  const return_date     = document.getElementById('returnDate').value;
  const event_date      = document.getElementById('eventDate').value;
  const note            = document.getElementById('note').value.trim();

  // Validation
  if (!created_by)   return alert('Please select an employee.');
  if (!bill_to_name) return alert('Bill To name is required.');

  // Collect items
  const rows  = document.querySelectorAll('#itemsBody tr');
  const items = [];

  for (const row of rows) {
    const inputs      = row.querySelectorAll('input');
    const item        = inputs[0].value.trim();
    const description = inputs[1].value.trim();
    const quantity    = parseInt(inputs[2].value) || 1;
    if (item) items.push({ item, description, quantity });
  }

  if (items.length === 0) return alert('Add at least one item.');

  const body = {
    created_by,
    bill_to_name, bill_to_phone,
    ship_to_name, ship_to_event, ship_to_address,
    ship_date, ship_via, tracking_number,
    delivery_time, return_date, event_date,
    note, items
  };

  const res  = await fetch(`${API}/packing-lists`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok) {
    alert(`✅ Packing list created!\nReference: ${data.reference_number}`);
    window.location.href = 'approval.html';
  } else {
    alert(`❌ Error: ${data.error}`);
  }
}