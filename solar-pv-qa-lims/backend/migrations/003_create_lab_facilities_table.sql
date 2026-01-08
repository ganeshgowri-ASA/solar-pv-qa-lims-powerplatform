-- Migration: 003_create_lab_facilities_table
-- Description: Create lab facilities table for laboratory management

CREATE TABLE IF NOT EXISTS lab_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    facility_type facility_type NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    accreditation_number VARCHAR(100),
    accreditation_body VARCHAR(255),
    accreditation_expiry DATE,
    capabilities TEXT[], -- Array of testing capabilities
    equipment JSONB, -- Equipment details
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lab_facilities_code ON lab_facilities(code);
CREATE INDEX IF NOT EXISTS idx_lab_facilities_type ON lab_facilities(facility_type);
