const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const dbPool = require('../config/db');
const { initWebSocket, updatePumpTracking } = require('./wsService');
require('dotenv').config();

const lastSavedTimestamp = new Map();

function startMqttWorker() {
    const wsPort = process.env.WS_PORT || 8080;
    initWebSocket(wsPort);

    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    // Lắng nghe topic mới của bro
    const topic = process.env.MQTT_TOPIC || 'bq/data/plc/history';

    const client = mqtt.connect(brokerUrl, {
        clientId: `XJ_MQTT_Worker_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        reconnectPeriod: 2000
    });

    client.on('connect', () => {
        console.log(`[MQTT Worker] Đã kết nối thành công tới broker: ${brokerUrl}`);
        client.subscribe(topic, (err) => {
            if (!err) console.log(`[MQTT Worker] Đang lắng nghe topic: ${topic}`);
        });
    });

    client.on('message', async (receivedTopic, messageBuffer) => {
        try {
            const rawJson = JSON.parse(messageBuffer.toString());
            const cleanData = normalizePlcPayload(rawJson);

            if (!cleanData.tank_code) return;

            // 1. Cập nhật trạng thái real-time qua WebSocket
            updatePumpTracking(cleanData);

            // 2. Lọc nhịp ghi DB chính xác 1 giây/lần theo từng bồn
            const now = Date.now();
            const lastSaved = lastSavedTimestamp.get(cleanData.tank_code) || 0;

            if (now - lastSaved >= 950) {
                lastSavedTimestamp.set(cleanData.tank_code, now);
                await saveToDatabase(cleanData);
            }
        } catch (error) {
            console.error('[MQTT Worker] Lỗi xử lý gói tin:', error.message);
        }
    });

    client.on('error', (err) => console.error('[MQTT Worker] Lỗi kết nối:', err.message));
}

// Hàm chuẩn hóa payload mới chính xác với định dạng PLC trả về
function normalizePlcPayload(raw) {
    return {
        id: uuidv4(),
        tank_code: String(raw.SoThung || '').trim(), // SoThung chính là Mã bồn (Drum ID)
        cold_hot: Boolean(raw.Cold_Hot),
        pump_mode: raw.Manual_Auto === true ? 'AUTO' : 'MANUAL', // true: Auto, false: Manual
        temperature: parseInt(raw.NhietDo || 0, 10),
        flow_rate: parseInt(raw.LuuLuong || 0, 10),
        
        // 5 thùng hóa chất (xử lý cả trường hợp key có dấu : hoặc không)
        chem_1: String(raw["THUNG1:"] || raw["THUNG1"] || ''),
        chem_2: String(raw["THUNG2:"] || raw["THUNG2"] || ''),
        chem_3: String(raw["THUNG3:"] || raw["THUNG3"] || ''),
        chem_4: String(raw["THUNG4:"] || raw["THUNG4"] || ''),
        chem_5: String(raw["THUNG5:"] || raw["THUNG5"] || ''),
        
        // Lượng nước cấp cho 5 thùng
        water_vol_1: parseInt(raw["LN_THUNG1:"] || raw["LN_THUNG1"] || 0, 10),
        water_vol_2: parseInt(raw["LN_THUNG2:"] || raw["LN_THUNG2"] || 0, 10),
        water_vol_3: parseInt(raw["LN_THUNG3:"] || raw["LN_THUNG3"] || 0, 10),
        water_vol_4: parseInt(raw["LN_THUNG4:"] || raw["LN_THUNG4"] || 0, 10),
        water_vol_5: parseInt(raw["LN_THUNG5:"] || raw["LN_THUNG5"] || 0, 10),
        
        plc_time: raw.time || null
    };
}

async function saveToDatabase(data) {
    const sql = `
        INSERT INTO XJPumpWater 
        (id, tank_code, cold_hot, pump_mode, temperature, flow_rate, 
         chem_tank_1, chem_tank_2, chem_tank_3, chem_tank_4, chem_tank_5, 
         water_vol_1, water_vol_2, water_vol_3, water_vol_4, water_vol_5, plc_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        data.id, data.tank_code, data.cold_hot, data.pump_mode, data.temperature, data.flow_rate,
        data.chem_1, data.chem_2, data.chem_3, data.chem_4, data.chem_5,
        data.water_vol_1, data.water_vol_2, data.water_vol_3, data.water_vol_4, data.water_vol_5,
        data.plc_time
    ];

    try {
        await dbPool.execute(sql, values);
    } catch (err) {
        console.error('[DB Error] Lỗi ghi dữ liệu từng giây:', err.message);
    }
}

startMqttWorker();