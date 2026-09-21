-- 上海如静知华信息科技有限公司 https://www.zhuatech.cn/
-- 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
CREATE DATABASE IF NOT EXISTS zhuatech_vehicle_terminal DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE zhuatech_vehicle_terminal;
CREATE TABLE fleet_depot(id VARCHAR(32) PRIMARY KEY,code VARCHAR(64) UNIQUE,name VARCHAR(128),address VARCHAR(255),speed_limit_kph INT,status VARCHAR(24),created_at DATETIME(3));
CREATE TABLE fleet_vehicle(id VARCHAR(32) PRIMARY KEY,depot_id VARCHAR(32),plate VARCHAR(32) UNIQUE,vin VARCHAR(64) UNIQUE,vehicle_type VARCHAR(64),energy_type VARCHAR(24),capacity_kg DECIMAL(12,2),status VARCHAR(24),odometer_km DECIMAL(12,2),created_at DATETIME(3));
CREATE TABLE fleet_driver(id VARCHAR(32) PRIMARY KEY,employee_no VARCHAR(64) UNIQUE,name VARCHAR(64),license_type VARCHAR(16),license_expires_at DATE,status VARCHAR(24),created_at DATETIME(3));
CREATE TABLE vehicle_terminal(id VARCHAR(32) PRIMARY KEY,vehicle_id VARCHAR(32) UNIQUE,serial_no VARCHAR(128) UNIQUE,model VARCHAR(64),status VARCHAR(24),app_version VARCHAR(32),token_hash VARCHAR(128),last_heartbeat_at DATETIME(3),created_at DATETIME(3));
CREATE TABLE vehicle_trip(id VARCHAR(32) PRIMARY KEY,trip_no VARCHAR(64) UNIQUE,vehicle_id VARCHAR(32),driver_id VARCHAR(32),stops JSON,status VARCHAR(24),inspection JSON,current_stop_sequence INT,started_at DATETIME(3),completed_at DATETIME(3),created_at DATETIME(3));
CREATE TABLE trip_telemetry(id VARCHAR(32) PRIMARY KEY,trip_id VARCHAR(32),sequence_no BIGINT,latitude DECIMAL(10,7),longitude DECIMAL(10,7),speed_kph DECIMAL(8,2),acceleration_mps2 DECIMAL(8,2),battery_percent DECIMAL(5,2),recorded_at DATETIME(3),UNIQUE KEY uk_trip_seq(trip_id,sequence_no));
CREATE TABLE safety_alert(id VARCHAR(32) PRIMARY KEY,trip_id VARCHAR(32),vehicle_id VARCHAR(32),alert_type VARCHAR(64),message VARCHAR(512),severity VARCHAR(16),status VARCHAR(24),created_at DATETIME(3));
CREATE TABLE trip_incident(id VARCHAR(32) PRIMARY KEY,trip_id VARCHAR(32),incident_type VARCHAR(64),description VARCHAR(512),severity VARCHAR(16),attachments JSON,status VARCHAR(24),created_at DATETIME(3));
CREATE TABLE terminal_command(id VARCHAR(32) PRIMARY KEY,terminal_id VARCHAR(32),command_type VARCHAR(32),payload JSON,status VARCHAR(24),issued_at DATETIME(3),acknowledged_at DATETIME(3));
CREATE TABLE audit_event(id VARCHAR(32) PRIMARY KEY,actor VARCHAR(64),action VARCHAR(64),resource_id VARCHAR(64),detail JSON,occurred_at DATETIME(3));
