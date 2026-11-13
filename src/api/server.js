const express = require('express');
require('dotenv').config();

const dbPool = require('../config/db');
const pumpRoutes = require('./routes/pumpRoutes');

const app = express();
app.use(express.json());

// Gắn route API
app.use('/api/pumps', pumpRoutes);

// API Healthcheck
app.get('/api/health', async (req, res) => {
    try {
        await dbPool.query('SELECT 1');
        res.json({ status: 'OK', service: 'XJProcess API Server', database: 'Connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[API Server] Đang chạy tại http://localhost:${PORT}`);
});