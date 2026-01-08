-- Migration: 006_create_service_requests_table
-- Description: Create service requests table for testing requests

CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    request_type request_type NOT NULL,
    status request_status DEFAULT 'draft',
    priority priority_level DEFAULT 'normal',
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Module/Product Information
    manufacturer VARCHAR(255),
    model_number VARCHAR(255),
    module_type VARCHAR(100), -- 'mono-Si', 'poly-Si', 'thin-film', 'bifacial', etc.
    rated_power_w DECIMAL(10,2),
    dimensions_mm JSONB, -- {length, width, thickness}

    -- Testing Requirements
    requested_standards UUID[], -- Array of test_standard IDs
    special_requirements TEXT,
    target_markets TEXT[], -- Array of target market countries

    -- Lab Assignment
    assigned_lab_id UUID REFERENCES lab_facilities(id),
    assigned_to UUID REFERENCES users(id),

    -- Dates
    requested_date DATE,
    estimated_completion DATE,
    actual_completion DATE,

    -- Financials
    quoted_price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    po_number VARCHAR(100),

    -- Metadata
    attachments JSONB, -- Array of attachment URLs/references
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_number ON service_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_lab ON service_requests(assigned_lab_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at);
