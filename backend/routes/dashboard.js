const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  try {
    // Total inventory items
    const [[{ totalItems }]] = await db.query(
      'SELECT COUNT(*) AS totalItems FROM inventory'
    );

    // Low stock items (under 10)
    const [[{ lowStock }]] = await db.query(
      'SELECT COUNT(*) AS lowStock FROM inventory WHERE stock < 10'
    );

    // Total stock units
    const [[{ totalStock }]] = await db.query(
      'SELECT SUM(stock) AS totalStock FROM inventory'
    );

    // Packing lists by status
    const [[{ pending }]] = await db.query(
      'SELECT COUNT(*) AS pending FROM packing_lists WHERE status = "pending"'
    );

    const [[{ approved }]] = await db.query(
      'SELECT COUNT(*) AS approved FROM packing_lists WHERE status = "approved"'
    );

    const [[{ rejected }]] = await db.query(
      'SELECT COUNT(*) AS rejected FROM packing_lists WHERE status = "rejected"'
    );

    // 5 most recent packing lists
    const [recent] = await db.query(`
      SELECT 
        pl.id,
        pl.reference_number,
        pl.status,
        pl.bill_to_name,
        pl.ship_to_name,
        pl.ship_to_event,
        pl.event_date,
        pl.created_at,
        u.name AS created_by_name
      FROM packing_lists pl
      JOIN users u ON pl.created_by = u.id
      ORDER BY pl.created_at DESC
      LIMIT 5
    `);

    // Low stock items list
    const [lowStockItems] = await db.query(
      'SELECT id, name, color, size, stock FROM inventory WHERE stock < 10 ORDER BY stock ASC'
    );

    res.json({
      totalItems,
      lowStock,
      totalStock: totalStock || 0,
      pending,
      approved,
      rejected,
      recent,
      lowStockItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;