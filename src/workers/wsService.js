const WebSocket = require('ws');

let wss = null;
const pumpStates = new Map();

function initWebSocket(port) {
    wss = new WebSocket.Server({ port });

    wss.on('connection', (ws) => {
        console.log('[WS] Client Front-end đã kết nối');
        const currentAllStates = Array.from(pumpStates.values());
        ws.send(JSON.stringify({ type: 'INIT_STATES', payload: currentAllStates }));

        ws.on('close', () => console.log('[WS] Client Front-end đã ngắt kết nối'));
    });

    // Kiểm tra timeout 3 giây để tự động đánh dấu STOPPED nếu máy bơm mất tín hiệu
    setInterval(() => {
        const now = Date.now();
        pumpStates.forEach((state, tankCode) => {
            if (state.isRunning && (now - state.lastUpdate > 3000)) {
                state.isRunning = false;
                state.statusText = 'STOPPED';
                broadcast({ type: 'PUMP_STATUS_CHANGE', payload: state });
            }
        });
    }, 1000);

    console.log(`[WS] WebSocket Worker đang chạy tại port ${port}`);
}

function updatePumpTracking(pumpData) {
    const prevState = pumpStates.get(pumpData.tank_code);
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
    broadcast({ type: 'PUMP_LIVE_DATA', payload: currentState });
}

function broadcast(messageObj) {
    if (!wss) return;
    const dataStr = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(dataStr);
    });
}

module.exports = { initWebSocket, updatePumpTracking };