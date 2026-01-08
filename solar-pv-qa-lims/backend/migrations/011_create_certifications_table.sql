-- Migration: 011_create_certifications_table
-- Description: Create certifications table for certificate management

CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    service_request_id UUID REFERENCES service_requests(id),

    -- Certificate Information
    certificate_type VARCHAR(100), -- 'IEC', 'UL', 'MCS', 'TUV', etc.
    standard_codes TEXT[], -- Array of standards certified
    status certification_status DEFAULT 'draft',

    -- Product Information
    manufacturer VARCHAR(255),
    model_numbers TEXT[], -- Array of model numbers covered
    rated_power_range VARCHAR(100), -- e.g., "400W - 450W"

    -- Validity
    issue_date DATE,
    expiry_date DATE,

    -- Scope
    scope_description TEXT,
    conditions TEXT,
    limitations TEXT,

    -- Signatures
    issued_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),

    -- Document
    document_url VARCHAR(500),
    document_hash VARCHAR(64), -- SHA-256 hash for verification

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certifications_number ON certifications(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certifications_service_request ON certifications(service_request_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
