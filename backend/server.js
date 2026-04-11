const express = require('express');
const cors = require('cors');
require('dotenv').config();



const app = express();

app.use(cors());
app.use(express.json());

// Routes
const inventoryRoutes   = require('./routes/inventory');
const packingListRoutes = require('./routes/packingLists');
const userRoutes        = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/inventory',     inventoryRoutes);
app.use('/api/packing-lists', packingListRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running ✅' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});