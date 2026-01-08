-- Migration: 008_create_sample_chain_of_custody_table
-- Description: Create sample chain of custody table for tracking sample movements

CREATE TABLE IF NOT EXISTS sample_chain_of_custody (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'received', 'transferred', 'tested', 'stored', 'disposed'
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    performed_by UUID REFERENCES users(id),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chain_of_custody_sample ON sample_chain_of_custody(sample_id);
CREATE INDEX IF NOT EXISTS idx_chain_of_custody_timestamp ON sample_chain_of_custody(timestamp);
