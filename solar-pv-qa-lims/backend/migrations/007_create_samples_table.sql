-- Migration: 007_create_samples_table
-- Description: Create samples table for sample tracking

CREATE TABLE IF NOT EXISTS samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id VARCHAR(50) UNIQUE NOT NULL,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,

    -- Sample Information
    description TEXT,
    sample_type VARCHAR(100), -- 'module', 'cell', 'component', 'material'
    quantity INTEGER DEFAULT 1,

    -- Physical Details
    serial_number VARCHAR(255),
    batch_number VARCHAR(255),
    manufacturing_date DATE,

    -- Receiving Information
    status sample_status DEFAULT 'registered',
    received_date TIMESTAMP WITH TIME ZONE,
    received_by UUID REFERENCES users(id),
    receiving_condition VARCHAR(100), -- 'good', 'damaged', 'partial'
    condition_notes TEXT,

    -- Storage Information
    storage_location VARCHAR(255),
    storage_conditions JSONB, -- {temperature, humidity, etc.}

    -- Photos/Documentation
    photos JSONB, -- Array of photo URLs

    -- Disposal
    disposal_date TIMESTAMP WITH TIME ZONE,
    disposal_method VARCHAR(100),
    disposal_notes TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_samples_service_request ON samples(service_request_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
