CREATE DATABASE IF NOT EXISTS XJProcessDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE XJProcessDB;

CREATE TABLE IF NOT EXISTS XJPumpWater (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UID từ PLC hoặc Backend sinh ra',
    tank_code VARCHAR(50) NOT NULL COMMENT 'Mã số bồn (VD: DRUM-01)',
    pump_mode VARCHAR(20) NOT NULL COMMENT 'Chế độ bơm: MANUAL (Thủ công) / AUTO (Tự động)',
    water_type VARCHAR(20) NOT NULL COMMENT 'Loại nước: HOT (Nóng) / COLD (Lạnh)',
    temperature INT DEFAULT 0 COMMENT 'Nhiệt độ nước (°C)',
    target_volume INT DEFAULT 0 COMMENT 'Lượng nước cần bơm (Lít)',
    actual_volume INT DEFAULT 0 COMMENT 'Lượng nước thực tế đã bơm (Lít)',
    pumped_seconds INT DEFAULT 0 COMMENT 'Thời gian đã bơm (giây)',
    pumped_duration_text VARCHAR(20) COMMENT 'Thời gian quy đổi (HH:mm:ss)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm ghi nhận xuống DB',
    
    -- Đánh Index để tối ưu tốc độ truy vấn lịch sử theo bồn và thời gian
    INDEX idx_tank_time (tank_code, created_at)
) ENGINE=InnoDB;