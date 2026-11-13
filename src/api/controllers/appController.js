const dbPool = require('../../config/db');

// 1. API: Lấy tổng lượng nước đã sử dụng của một bồn cụ thể
async function getTotalWaterByTank(req, res) {
    try {
        const { tankCode } = req.params;

        const query = `
            SELECT 
                ?,
                COALESCE(SUM(total_session_water), 0) AS total_water_used,
                COUNT(session_id) AS total_pump_sessions
            FROM (
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS session_id,
                    -- Lấy max tổng lượng nước 5 thùng trong mẻ
                    MAX(water_vol_1 + water_vol_2 + water_vol_3 + water_vol_4 + water_vol_5) AS total_session_water
                FROM XJPumpWater
                WHERE tank_code = ?
                GROUP BY session_id
            ) AS pump_sessions;
        `;

        const [rows] = await dbPool.execute(query, [tankCode, tankCode]);

        res.json({
            success: true,
            tank_code: tankCode,
            total_water_used: rows[0].total_water_used,
            total_pump_sessions: rows[0].total_pump_sessions
        });
    } catch (err) {
        console.error('[API Error] getTotalWaterByTank:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
}

// 2. API: Lấy danh sách tóm tắt tất cả các bồn
async function getPumpsSummary(req, res) {
    try {
        const [rows] = await dbPool.execute(`
            SELECT 
                tank_code,
                MAX(water_vol_1 + water_vol_2 + water_vol_3 + water_vol_4 + water_vol_5) AS current_total_water,
                MAX(temperature) AS latest_temperature,
                MAX(flow_rate) AS latest_flow_rate,
                MAX(created_at) AS last_active_time
            FROM XJPumpWater
            GROUP BY tank_code
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[API Error] getPumpsSummary:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
}

// 3. API: Lấy lịch sử bơm chi tiết của bồn
async function getPumpHistory(req, res) {
    try {
        const { tankCode } = req.params;
        const [rows] = await dbPool.execute(
            'SELECT * FROM XJPumpWater WHERE tank_code = ? ORDER BY created_at DESC LIMIT 100',
            [tankCode]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[API Error] getPumpHistory:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getTotalWaterByTank,
    getPumpsSummary,
    getPumpHistory
};