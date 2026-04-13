const express = require('express');
const router  = require('express').Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  try {
    const [totalItemsResult] = await db.query(
      'SELECT COUNT(*) AS totalItems FROM inventory'
    );

    const [lowStockResult] = await db.query(
      'SELECT COUNT(*) AS lowStock FROM inventory WHERE stock < 10'
    );

    const [totalStockResult] = await db.query(
      'SELECT SUM(stock) AS totalStock FROM inventory'
    );

    const [pendingResult] = await db.query(
      'SELECT COUNT(*) AS pending FROM packing_lists WHERE status = "pending"'
    );

    const [approvedResult] = await db.query(
      'SELECT COUNT(*) AS approved FROM packing_lists WHERE status = "approved"'
    );

    const [rejectedResult] = await db.query(
      'SELECT COUNT(*) AS rejected FROM packing_lists WHERE status = "rejected"'
    );

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

    const [lowStockItems] = await db.query(
      'SELECT id, name, color, size, stock FROM inventory WHERE stock < 10 ORDER BY stock ASC'
    );

    res.json({
      totalItems:   totalItemsResult[0].totalItems,
      lowStock:     lowStockResult[0].lowStock,
      totalStock:   totalStockResult[0].totalStock || 0,
      pending:      pendingResult[0].pending,
      approved:     approvedResult[0].approved,
      rejected:     rejectedResult[0].rejected,
      recent,
      lowStockItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;