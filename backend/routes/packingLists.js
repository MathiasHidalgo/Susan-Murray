const express = require('express');
const router = express.Router();
const db = require('../db');

// Auto-generate reference number PL-YYYY-0001
async function generateRefNumber() {
  const year = new Date().getFullYear();
  const prefix = `PL-${year}-`;

  const [rows] = await db.query(
    'SELECT reference_number FROM packing_lists WHERE reference_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  if (rows.length === 0) return `${prefix}0001`;

  const last = rows[0].reference_number;
  const lastNum = parseInt(last.split('-')[2]);
  const nextNum = String(lastNum + 1).padStart(4, '0');
  return `${prefix}${nextNum}`;
}

// GET all packing lists
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        pl.id,
        pl.reference_number,
        pl.status,
        pl.bill_to_name,
        pl.bill_to_phone,
        pl.ship_to_name,
        pl.ship_to_event,
        pl.ship_to_address,
        pl.ship_date,
        pl.ship_via,
        pl.tracking_number,
        pl.delivery_time,
        pl.return_date,
        pl.event_date,
        pl.note,
        pl.created_at,
        u.name AS created_by_name
      FROM packing_lists pl
      JOIN users u ON pl.created_by = u.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE pl.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pl.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single packing list with items
router.get('/:id', async (req, res) => {
  try {
    const [lists] = await db.query(`
      SELECT 
        pl.*,
        u.name AS created_by_name
      FROM packing_lists pl
      JOIN users u ON pl.created_by = u.id
      WHERE pl.id = ?
    `, [req.params.id]);

    if (lists.length === 0) return res.status(404).json({ error: 'Not found' });

    const [items] = await db.query(
      'SELECT * FROM packing_list_items WHERE packing_list_id = ?',
      [req.params.id]
    );

    res.json({ ...lists[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create packing list
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      created_by,
      bill_to_name, bill_to_phone,
      ship_to_name, ship_to_event, ship_to_address,
      ship_date, ship_via, tracking_number,
      delivery_time, return_date, event_date,
      note, items
    } = req.body;

    if (!created_by) return res.status(400).json({ error: 'Employee is required' });
    if (!bill_to_name) return res.status(400).json({ error: 'Bill To name is required' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

    const reference_number = await generateRefNumber();

    const [result] = await conn.query(
      `INSERT INTO packing_lists 
        (reference_number, created_by,
         bill_to_name, bill_to_phone,
         ship_to_name, ship_to_event, ship_to_address,
         ship_date, ship_via, tracking_number,
         delivery_time, return_date, event_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference_number, created_by,
        bill_to_name, bill_to_phone || null,
        ship_to_name || null, ship_to_event || null, ship_to_address || null,
        ship_date || null, ship_via || null, tracking_number || null,
        delivery_time || null, return_date || null, event_date || null,
        note || null
      ]
    );

    const listId = result.insertId;

    for (const item of items) {
      await conn.query(
        'INSERT INTO packing_list_items (packing_list_id, item, description, quantity) VALUES (?, ?, ?, ?)',
        [listId, item.item, item.description || null, item.quantity || 1]
      );
    }

    await conn.commit();
    res.status(201).json({ id: listId, reference_number, message: 'Packing list created ✅' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PATCH approve or reject
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.query(
      'UPDATE packing_lists SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    res.json({ message: `List ${status} ✅` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT full update of packing list + items
router.put('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      bill_to_name, bill_to_phone,
      ship_to_name, ship_to_event, ship_to_address,
      ship_date, ship_via, tracking_number,
      delivery_time, return_date, event_date,
      note, items
    } = req.body;

    // Update main packing list fields
    await conn.query(
      `UPDATE packing_lists SET
        bill_to_name = ?, bill_to_phone = ?,
        ship_to_name = ?, ship_to_event = ?, ship_to_address = ?,
        ship_date = ?, ship_via = ?, tracking_number = ?,
        delivery_time = ?, return_date = ?, event_date = ?,
        note = ?
       WHERE id = ?`,
      [
        bill_to_name, bill_to_phone || null,
        ship_to_name || null, ship_to_event || null, ship_to_address || null,
        ship_date || null, ship_via || null, tracking_number || null,
        delivery_time || null, return_date || null, event_date || null,
        note || null,
        req.params.id
      ]
    );

    // Delete all existing items and re-insert
    // This is the simplest and cleanest approach
    await conn.query(
      'DELETE FROM packing_list_items WHERE packing_list_id = ?',
      [req.params.id]
    );

    for (const item of items) {
      await conn.query(
        'INSERT INTO packing_list_items (packing_list_id, item, description, quantity) VALUES (?, ?, ?, ?)',
        [req.params.id, item.item, item.description || null, item.quantity || 1]
      );
    }

    await conn.commit();
    res.json({ message: 'Packing list updated ✅' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;