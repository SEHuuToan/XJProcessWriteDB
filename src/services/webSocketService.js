const WebSocket = require('ws');

let wss = null;
// Lưu trữ trạng thái theo từng mã bồn: { "DRUM-01": { lastUpdate: timestamp, isRunning: true, data: {...} } }
const pumpStates = new Map();

function initWebSocket(port) {
    wss = new WebSocket.Server({ port });

    wss.on('connection', (ws) => {
        console.log('[WS] Client đã kết nối');
        // Gửi ngay trạng thái hiện tại của tất cả các bồn khi client vừa mở trang
        const currentAllStates = Array.from(pumpStates.values());
        ws.send(JSON.stringify({ type: 'INIT_STATES', payload: currentAllStates }));

        ws.on('close', () => console.log('[WS] Client đã ngắt kết nối'));
    });

    // Vòng lặp kiểm tra mỗi 1 giây xem bồn nào bị ngưng gửi tín hiệu (Timeout > 3s)
    setInterval(() => {
        const now = Date.now();
        pumpStates.forEach((state, tankCode) => {
            if (state.isRunning && (now - state.lastUpdate > 3000)) {
                state.isRunning = false;
                state.statusText = 'STOPPED';
                broadcast({
                    type: 'PUMP_STATUS_CHANGE',
                    payload: state
                });
            }
        });
    }, 1000);

    console.log(`[WS] WebSocket Server đang chạy tại port ${port}`);
}

function updatePumpTracking(pumpData) {
    const prevState = pumpStates.get(pumpData.tank_code);
    
    // Xác định máy bơm đang chạy nếu có tín hiệu gửi về và chưa đạt mức nước mục tiêu
    // (Hoặc dựa vào biến động thời gian bơm tăng lên so với giây trước đó)
    const isSecondsIncreasing = prevState ? (pumpData.pumped_seconds > prevState.data.pumped_seconds) : true;
    const isRunning = isSecondsIncreasing && (pumpData.actual_volume < pumpData.target_volume || pumpData.target_volume === 0);

    const currentState = {
        tank_code: pumpData.tank_code,
        isRunning: isRunning,
        statusText: isRunning ? 'RUNNING' : 'STOPPED',
        lastUpdate: Date.now(),
        data: pumpData
    };

    pumpStates.set(pumpData.tank_code, currentState);

    // Đẩy dữ liệu real-time xuống toàn bộ client đang kết nối
    broadcast({
        type: 'PUMP_LIVE_DATA',
        payload: currentState
    });
}

function broadcast(messageObj) {
    if (!wss) return;
    const dataStr = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(dataStr);
        }
    });
}

module.exports = { initWebSocket, updatePumpTracking };