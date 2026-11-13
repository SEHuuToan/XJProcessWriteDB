CREATE DATABASE IF NOT EXISTS XJProcessDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE XJProcessDB;

DROP TABLE IF EXISTS XJPumpWater;

CREATE TABLE XJPumpWater (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID sinh ra cho mỗi bản ghi',
    tank_code VARCHAR(50) NOT NULL COMMENT 'Mã số bồn (Ứng với SoThung)',
    cold_hot BOOLEAN DEFAULT 0 COMMENT 'Nước nóng (true) hay lạnh (false)',
    pump_mode VARCHAR(20) NOT NULL COMMENT 'Chế độ: AUTO (true) hoặc MANUAL (false)',
    temperature INT DEFAULT 0 COMMENT 'Nhiệt độ (NhietDo)',
    flow_rate INT DEFAULT 0 COMMENT 'Lưu lượng (LuuLuong)',
    
    -- 5 thùng hóa chất
    chem_tank_1 VARCHAR(50) COMMENT 'THUNG1',
    chem_tank_2 VARCHAR(50) COMMENT 'THUNG2',
    chem_tank_3 VARCHAR(50) COMMENT 'THUNG3',
    chem_tank_4 VARCHAR(50) COMMENT 'THUNG4',
    chem_tank_5 VARCHAR(50) COMMENT 'THUNG5',
    
    -- Lượng nước bơm vào từng thùng tương ứng
    water_vol_1 INT DEFAULT 0 COMMENT 'LN_THUNG1',
    water_vol_2 INT DEFAULT 0 COMMENT 'LN_THUNG2',
    water_vol_3 INT DEFAULT 0 COMMENT 'LN_THUNG3',
    water_vol_4 INT DEFAULT 0 COMMENT 'LN_THUNG4',
    water_vol_5 INT DEFAULT 0 COMMENT 'LN_THUNG5',
    
    plc_time TIMESTAMP NULL COMMENT 'Thời gian gốc do PLC gửi lên',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm ghi nhận thực tế xuống DB',
    
    INDEX idx_tank_time (tank_code, created_at)
) ENGINE=InnoDB;