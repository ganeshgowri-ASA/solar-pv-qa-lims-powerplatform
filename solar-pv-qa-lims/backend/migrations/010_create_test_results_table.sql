-- Migration: 010_create_test_results_table
-- Description: Create test results table for storing test execution results

CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_number VARCHAR(50) UNIQUE NOT NULL,
    test_plan_id UUID REFERENCES test_plans(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES samples(id),

    -- Test Information
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(100),
    test_sequence INTEGER,

    -- Execution
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES users(id),
    equipment_used JSONB, -- Array of equipment IDs/names used

    -- Conditions
    test_conditions JSONB, -- {temperature, humidity, irradiance, etc.}

    -- Results
    status result_status DEFAULT 'pending',
    measured_values JSONB, -- All measured values
    pass_criteria JSONB, -- Pass/fail criteria
    deviations TEXT, -- Any deviations from procedure

    -- Observations
    observations TEXT,
    photos JSONB, -- Array of photo URLs
    attachments JSONB, -- Data files, graphs, etc.

    -- Verification
    verified_by UUID REFERENCES users(id),
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_results_number ON test_results(result_number);
CREATE INDEX IF NOT EXISTS idx_test_results_test_plan ON test_results(test_plan_id);
CREATE INDEX IF NOT EXISTS idx_test_results_sample ON test_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
