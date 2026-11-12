const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const dbPool = require('../config/db');
const { formatSecondsToTime } = require('../utils/timeHelper');
const { updatePumpTracking } = require('./wsService');

// Lưu mốc thời gian ghi DB gần nhất của từng bồn để đảm bảo ghi đúng nhịp 1 giây/lần
const lastSavedTimestamp = new Map();

function initMqtt() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const topic = process.env.MQTT_TOPIC || 'xj/plc/pump/#';

    const client = mqtt.connect(brokerUrl, {
        clientId: `XJProcessWriteDB_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        reconnectPeriod: 2000 // Tự động kết nối lại sau 2s nếu mất mạng
    });

    client.on('connect', () => {
        console.log(`[MQTT] Đã kết nối thành công tới ${brokerUrl}`);
        client.subscribe(topic, (err) => {
            if (!err) console.log(`[MQTT] Đang lắng nghe topic: ${topic}`);
        });
    });

    client.on('message', async (receivedTopic, messageBuffer) => {
        try {
            const rawString = messageBuffer.toString();
            const rawJson = JSON.parse(rawString);

            // 1. Chuẩn hóa & Lọc dữ liệu (Chấp nhận linh hoạt các tên key có thể PLC gửi về)
            const cleanData = normalizePlcPayload(rawJson);

            // Bỏ qua nếu gói tin rác không có mã số bồn
            if (!cleanData.tank_code) return;

            // 2. Cập nhật sang WebSocket ngay lập tức để UI tracking mượt mà
            updatePumpTracking(cleanData);

            // 3. Kiểm tra nhịp 1 giây (1000ms) để ghi xuống MySQL
            const now = Date.now();
            const lastSaved = lastSavedTimestamp.get(cleanData.tank_code) || 0;

            if (now - lastSaved >= 950) { // Lấy ngưỡng 950ms để bù trừ độ trễ mạng
                lastSavedTimestamp.set(cleanData.tank_code, now);
                await saveToDatabase(cleanData);
            }

        } catch (error) {
            console.error('[MQTT] Lỗi xử lý gói tin JSON:', error.message);
        }
    });

    client.on('error', (err) => console.error('[MQTT] Lỗi kết nối:', err.message));
}

// Hàm chuẩn hóa dữ liệu từ PLC (Dễ dàng mở rộng khi PLC thêm trường mới)
function normalizePlcPayload(raw) {
    const pumpedSeconds = parseInt(raw.pumped_seconds ?? raw.ThoiGianDaBom ?? 0, 10);

    return {
        // Nếu PLC chưa gửi UID thì Backend tự sinh UUID v4
        id: raw.id || raw.Id || uuidv4(),
        tank_code: String(raw.tank_code || raw.MaSoBon || '').trim(),
        pump_mode: String(raw.pump_mode || raw.CheDoBom || 'AUTO').toUpperCase(),
        water_type: String(raw.water_type || raw.LoaiNuoc || 'COLD').toUpperCase(),
        temperature: parseInt(raw.temperature ?? raw.NhietDo ?? 0, 10),
        target_volume: parseInt(raw.target_volume ?? raw.LuongNuocCanBom ?? 0, 10),
        actual_volume: parseInt(raw.actual_volume ?? raw.LuongNuocThucTe ?? 0, 10),
        pumped_seconds: pumpedSeconds,
        pumped_duration_text: formatSecondsToTime(pumpedSeconds)
    };
}

async function saveToDatabase(data) {
    const sql = `
        INSERT INTO XJPumpWater 
        (id, tank_code, pump_mode, water_type, temperature, target_volume, actual_volume, pumped_seconds, pumped_duration_text) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        data.id,
        data.tank_code,
        data.pump_mode,
        data.water_type,
        data.temperature,
        data.target_volume,
        data.actual_volume,
        data.pumped_seconds,
        data.pumped_duration_text
    ];

    try {
        await dbPool.execute(sql, values);
        // Bỏ comment dòng dưới nếu muốn debug log mỗi giây
        // console.log(`[DB] Saved ${data.tank_code} | ${data.actual_volume}/${data.target_volume}L | ${data.pumped_duration_text}`);
    } catch (err) {
        console.error('[DB] Lỗi khi INSERT vào XJPumpWater:', err.message);
    }
}

module.exports = { initMqtt };