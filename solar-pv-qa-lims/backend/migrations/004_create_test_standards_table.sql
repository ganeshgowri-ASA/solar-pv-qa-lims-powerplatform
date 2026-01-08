-- Migration: 004_create_test_standards_table
-- Description: Create test standards table for IEC/UL standards

CREATE TABLE IF NOT EXISTS test_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    description TEXT,
    category VARCHAR(100), -- 'performance', 'safety', 'durability', 'environmental'
    test_sequences JSONB, -- JSON array of test sequences
    duration_days INTEGER, -- Typical test duration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_standards_code ON test_standards(standard_code);
