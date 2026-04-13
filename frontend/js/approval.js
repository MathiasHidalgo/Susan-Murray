const API = 'https://susan-murray-production.up.railway.app/api/inventory';
let currentTab = "pending";

document.addEventListener("DOMContentLoaded", () => {
  loadLists("pending");
});

function switchTab(status, btn) {
  currentTab = status;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  loadLists(status);
}

async function loadLists(status) {
  const container = document.getElementById("listContainer");
  container.innerHTML = '<div class="empty-state">Loading...</div>';

  const url = status
    ? `${API}/packing-lists?status=${status}`
    : `${API}/packing-lists`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.length === 0) {
    container.innerHTML = `<div class="empty-state">No ${status || ""} packing lists found.</div>`;
    return;
  }

  container.innerHTML = data
    .map((pl) => {
      const statusBadge = {
        pending: '<span class="badge badge-washing">Pending</span>',
        approved: '<span class="badge badge-ready">Approved</span>',
        rejected: '<span class="badge badge-damaged">Rejected</span>',
      }[pl.status];

      const shipDate = pl.ship_date ? formatDate(pl.ship_date) : "—";
      const eventDate = pl.event_date ? formatDate(pl.event_date) : "—";
      const returnDate = pl.return_date ? formatDate(pl.return_date) : "—";

      return `
      <div class="list-card">
        <div class="list-card-info">
          <h3>${pl.reference_number} ${statusBadge}</h3>
          <p>💳 <strong>Bill To:</strong> ${pl.bill_to_name || "—"}</p>
          <p>📦 <strong>Ship To:</strong> ${pl.ship_to_name || "—"} ${pl.ship_to_event ? `— ${pl.ship_to_event}` : ""}</p>
          <p>📅 <strong>Event:</strong> ${eventDate} &nbsp;|&nbsp; 
             🚚 <strong>Ship:</strong> ${shipDate} &nbsp;|&nbsp; 
             🔄 <strong>Return:</strong> ${returnDate}</p>
          <p>👤 Created by: ${pl.created_by_name} &nbsp;|&nbsp; 🕐 ${formatDateTime(pl.created_at)}</p>
        </div>
        <div class="list-card-actions">
            <button class="btn-view" onclick="viewList(${pl.id})">View</button>
            <button class="btn-warning" style="width:100%" onclick="openEditModal(${pl.id})">Edit</button>
            <button class="btn-primary" style="width:100%" onclick="openPrintModal(${pl.id})">Print</button>
            ${ pl.status === "pending" ? `
            <button class="btn-approve" onclick="updateStatus(${pl.id}, 'approved')">Approve</button>
            <button class="btn-reject"  onclick="updateStatus(${pl.id}, 'rejected')">Reject</button>
            `: ""}
        </div>
      </div>
    `;
    })
    .join("");
}

async function viewList(id) {
  const res = await fetch(`${API}/packing-lists/${id}`);
  const pl = await res.json();

  const itemRows = pl.items
    .map(
      (item) => `
    <tr>
      <td>${item.item || "—"}</td>
      <td>${item.description || "—"}</td>
      <td>${item.quantity}</td>
    </tr>
  `,
    )
    .join("");

  document.getElementById("slipContent").innerHTML = `
    <div class="slip-header">
      <div class="company">
        <strong>SUSAN MURRAY INTERNATIONAL</strong><br/>
        Division of Virgo Designs Group Inc<br/>
        3182 Orlando Drive - Unit #10<br/>
        Mississauga ON  L4V1R5<br/>
        +14162439284<br/>
        accounting@susanmurray.com
      </div>
      <div class="slip-ref">
        <strong>${pl.reference_number}</strong>
        DATE: ${formatDate(pl.created_at)}
      </div>
    </div>

    <div class="slip-title">Packing Slip</div>

    <div class="slip-parties">
      <div>
        <h4>Bill To</h4>
        <p>
          ${pl.bill_to_name || "—"}<br/>
          ${pl.bill_to_phone || ""}
        </p>
      </div>
      <div>
        <h4>Ship To</h4>
        <p>
          ${pl.ship_to_name || "—"}<br/>
          ${pl.ship_to_event ? `RE: ${pl.ship_to_event}<br/>` : ""}
          ${pl.ship_to_address || ""}
        </p>
      </div>
    </div>

    <div class="slip-logistics">
      <div><span>Ship Date</span>${formatDate(pl.ship_date) || "—"}</div>
      <div><span>Ship Via</span>${pl.ship_via || "—"}</div>
      <div><span>Tracking No.</span>${pl.tracking_number || "—"}</div>
      <div><span>Delivery Time</span>${pl.delivery_time || "—"}</div>
      <div><span>Return Date</span>${formatDate(pl.return_date) || "—"}</div>
      <div><span>Event Date</span>${formatDate(pl.event_date) || "—"}</div>
    </div>

    <table class="slip-items">
      <thead>
        <tr>
          <th>Item</th>
          <th>Description</th>
          <th style="text-align:right">QTY</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${pl.note ? `<p style="font-size:13px;color:#666">📝 Note: ${pl.note}</p>` : ""}
    <p style="font-size:12px;color:#aaa;margin-top:12px">
      Created by ${pl.created_by_name} &nbsp;|&nbsp; Status: 
      <strong>${pl.status.toUpperCase()}</strong>
    </p>
  `;

  // Action buttons inside modal
  document.getElementById("slipActions").innerHTML = `
  <button class="btn-view" onclick="closeModal()">Close</button>
  <button class="btn-warning" style="width:100%" onclick="closeModal(); openEditModal(${pl.id})">Edit</button>
  <button class="btn-primary" style="width:100%" onclick="openPrintModal(${pl.id})">Print</button>
  ${
    pl.status === "pending"
      ? `
    <button class="btn-approve" onclick="updateStatus(${pl.id}, 'approved')">Approve</button>
    <button class="btn-reject"  onclick="updateStatus(${pl.id}, 'rejected')">Reject</button>
  `
      : ""
  }
`;

  document.getElementById("modalOverlay").classList.add("active");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
}

// Close modal when clicking outside
document.getElementById("modalOverlay").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

async function updateStatus(id, status) {
  const label = status === "approved" ? "approve" : "reject";
  if (!confirm(`Are you sure you want to ${label} this packing list?`)) return;

  const res = await fetch(`${API}/packing-lists/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (res.ok) {
    closeModal();
    loadLists(currentTab);
  } else {
    alert("Something went wrong.");
  }
}

// Helpers
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Open edit modal and populate fields
async function openEditModal(id) {
  const res = await fetch(`${API}/packing-lists/${id}`);
  const pl = await res.json();

  document.getElementById("editModalTitle").textContent =
    `Edit — ${pl.reference_number}`;
  document.getElementById("editId").value = pl.id;

  // Bill To
  document.getElementById("eBillToName").value = pl.bill_to_name || "";
  document.getElementById("eBillToPhone").value = pl.bill_to_phone || "";

  // Ship To
  document.getElementById("eShipToName").value = pl.ship_to_name || "";
  document.getElementById("eShipToEvent").value = pl.ship_to_event || "";
  document.getElementById("eShipToAddress").value = pl.ship_to_address || "";

  // Logistics — dates need YYYY-MM-DD format for date inputs
  document.getElementById("eShipDate").value = toInputDate(pl.ship_date);
  document.getElementById("eShipVia").value = pl.ship_via || "";
  document.getElementById("eTrackingNumber").value = pl.tracking_number || "";
  document.getElementById("eDeliveryTime").value = pl.delivery_time || "";
  document.getElementById("eReturnDate").value = toInputDate(pl.return_date);
  document.getElementById("eEventDate").value = toInputDate(pl.event_date);

  // Note
  document.getElementById("eNote").value = pl.note || "";

  // Items
  const tbody = document.getElementById("editItemsBody");
  tbody.innerHTML = "";
  pl.items.forEach((item) => addEditItemRow(item));

  document.getElementById("editModalOverlay").classList.add("active");
}

function closeEditModal() {
  document.getElementById("editModalOverlay").classList.remove("active");
}

// Add a row to the edit items table
function addEditItemRow(item = {}) {
  const tbody = document.getElementById("editItemsBody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td style="padding:6px 4px">
      <input type="text" value="${item.item || ""}" placeholder="e.g. Rustic Glam"
        style="width:100%;padding:7px 9px;border:1px solid #ddd;border-radius:5px;font-size:13px"/>
    </td>
    <td style="padding:6px 4px">
      <input type="text" value="${item.description || ""}" placeholder="e.g. Leaf Green - 132&quot; RD"
        style="width:100%;padding:7px 9px;border:1px solid #ddd;border-radius:5px;font-size:13px"/>
    </td>
    <td style="padding:6px 4px">
      <input type="number" value="${item.quantity || 1}" min="1"
        style="width:100%;padding:7px 9px;border:1px solid #ddd;border-radius:5px;font-size:13px"/>
    </td>
    <td style="padding:6px 4px">
      <button onclick="this.closest('tr').remove()"
        style="background:#fee2e2;color:#dc2626;border:none;border-radius:5px;
               padding:6px 10px;cursor:pointer;font-weight:bold">✕</button>
    </td>
  `;
  tbody.appendChild(row);
}

// Save edits
async function saveEdit() {
  const id = document.getElementById("editId").value;

  // Collect items
  const rows = document.querySelectorAll("#editItemsBody tr");
  const items = [];
  for (const row of rows) {
    const inputs = row.querySelectorAll("input");
    const item = inputs[0].value.trim();
    const description = inputs[1].value.trim();
    const quantity = parseInt(inputs[2].value) || 1;
    if (item) items.push({ item, description, quantity });
  }

  if (items.length === 0) return alert("Add at least one item.");

  const body = {
    bill_to_name: document.getElementById("eBillToName").value.trim(),
    bill_to_phone: document.getElementById("eBillToPhone").value.trim(),
    ship_to_name: document.getElementById("eShipToName").value.trim(),
    ship_to_event: document.getElementById("eShipToEvent").value.trim(),
    ship_to_address: document.getElementById("eShipToAddress").value.trim(),
    ship_date: document.getElementById("eShipDate").value,
    ship_via: document.getElementById("eShipVia").value.trim(),
    tracking_number: document.getElementById("eTrackingNumber").value.trim(),
    delivery_time: document.getElementById("eDeliveryTime").value.trim(),
    return_date: document.getElementById("eReturnDate").value,
    event_date: document.getElementById("eEventDate").value,
    note: document.getElementById("eNote").value.trim(),
    items,
  };

  const res = await fetch(`${API}/packing-lists/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    closeEditModal();
    loadLists(currentTab);
    alert("✅ Packing list updated!");
  } else {
    const err = await res.json();
    alert(`❌ Error: ${err.error}`);
  }
}

// Helper: convert date to YYYY-MM-DD for date inputs
function toInputDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}


// Open print preview modal
async function openPrintModal(id) {
  const res = await fetch(`${API}/packing-lists/${id}`);
  const pl  = await res.json();

  const itemRows = pl.items.map(item => `
    <tr>
      <td><strong>${item.item || '—'}</strong></td>
      <td>${item.description || '—'}</td>
      <td>${item.quantity}</td>
    </tr>
  `).join('');

  const createdDate = new Date(pl.created_at).toLocaleDateString('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  document.getElementById('printArea').innerHTML = `
    <div class="print-header">
      <div class="print-company">
        <strong>SUSAN MURRAY INTERNATIONAL</strong>
        <span>Division of Virgo Designs Group Inc</span>
        <span>3182 Orlando Drive - Unit #10</span>
        <span>Mississauga ON  L4V1R5</span>
        <span>+14162439284</span>
        <span>accounting@susanmurray.com</span>
      </div>
      <div class="print-logo">
        ∿∿∿
        <small>Susan Murray</small>
      </div>
    </div>

    <div class="print-title">Packing Slip</div>

    <div class="print-ref-row">
      <div>
        <span>INVOICE #</span>
        <strong>${pl.reference_number}</strong>
      </div>
      <div>
        <span>DATE</span>
        <strong>${createdDate}</strong>
      </div>
    </div>

    <div class="print-parties">
      <div>
        <h4>Bill To</h4>
        <p>
          ${pl.bill_to_name || '—'}<br/>
          ${pl.bill_to_phone || ''}
        </p>
      </div>
      <div>
        <h4>Ship To</h4>
        <p>
          ${pl.ship_to_name || '—'}<br/>
          ${pl.ship_to_event ? `RE: ${pl.ship_to_event}<br/>` : ''}
          ${pl.ship_to_address || ''}
        </p>
      </div>
    </div>

    <div class="print-logistics">
      <div>
        <span>Ship Date</span>
        ${formatDate(pl.ship_date)}
      </div>
      <div>
        <span>Ship Via</span>
        ${pl.ship_via || '—'}
      </div>
      <div>
        <span>Tracking No.</span>
        ${pl.tracking_number || '—'}
      </div>
      <div>
        <span>Delivery Time</span>
        ${pl.delivery_time || '—'}
      </div>
      <div>
        <span>Return Date</span>
        ${formatDate(pl.return_date)}
      </div>
      <div>
        <span>Event Date</span>
        ${formatDate(pl.event_date)}
      </div>
    </div>

    <table class="print-items">
      <thead>
        <tr>
          <th style="width:25%">Item</th>
          <th>Description</th>
          <th style="width:60px;text-align:right">QTY</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${pl.note ? `<div class="print-note">📝 Note: ${pl.note}</div>` : ''}

    <div class="print-footer">
      <span>Created by ${pl.created_by_name}</span>
      <span>${pl.reference_number} — Susan Murray International</span>
    </div>
  `;

  document.getElementById('printModalOverlay').classList.add('active');
}

function closePrintModal() {
  document.getElementById('printModalOverlay').classList.remove('active');
}

// Close print modal when clicking outside
document.getElementById('printModalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closePrintModal();
});