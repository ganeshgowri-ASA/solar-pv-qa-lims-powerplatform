-- Migration: 015_create_equipment_table
-- Description: Create equipment table for lab equipment management

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    lab_facility_id UUID REFERENCES lab_facilities(id),

    -- Calibration
    calibration_date DATE,
    calibration_due DATE,
    calibration_certificate VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'maintenance', 'retired'
    location VARCHAR(255),

    -- Specifications
    specifications JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equipment_lab ON equipment(lab_facility_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
