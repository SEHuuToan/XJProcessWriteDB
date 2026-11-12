const express = require('express');
require('dotenv').config();

const dbPool = require('./config/db');
const { initMqtt } = require('./services/mqttService');
const { initWebSocket } = require('./services/wsService');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// API Healthcheck để kiểm tra service có đang sống không
app.get('/api/health', async (req, res) => {
    try {
        await dbPool.query('SELECT 1');
        res.json({ status: 'OK', service: 'XJProcessWriteDB', database: 'Connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
});
//alo
// API lấy lịch sử bơm nước theo mã bồn (Lấy 100 dòng gần nhất)
app.get('/api/pump-history/:tankCode', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT * FROM XJPumpWater WHERE tank_code = ? ORDER BY created_at DESC LIMIT 100',
            [req.params.tankCode]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Khởi động toàn bộ hệ thống
app.listen(PORT, () => {
    console.log(`[HTTP] Express Server đang chạy tại http://localhost:${PORT}`);
    initWebSocket(WS_PORT);
    initMqtt();
});