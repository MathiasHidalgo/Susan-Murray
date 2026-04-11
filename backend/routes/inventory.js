const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all inventory (with optional search)
router.get('/', async (req, res) => {
  try {
    const { search, color, status } = req.query;

    let query = 'SELECT * FROM inventory WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR size LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (color) {
      query += ' AND color = ?';
      params.push(color);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY name, color, size';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single item
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new item
router.post('/', async (req, res) => {
  try {
    const { name, color, size, stock, status, note } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const [result] = await db.query(
      'INSERT INTO inventory (name, color, size, stock, status, note) VALUES (?, ?, ?, ?, ?, ?)',
      [name, color, size, stock || 0, status || 'ready', note || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Item added ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update item
router.put('/:id', async (req, res) => {
  try {
    const { name, color, size, stock, status, note } = req.body;

    await db.query(
      'UPDATE inventory SET name=?, color=?, size=?, stock=?, status=?, note=? WHERE id=?',
      [name, color, size, stock, status, note, req.params.id]
    );

    res.json({ message: 'Item updated ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item deleted ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;