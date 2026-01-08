-- Migration: 009_create_test_plans_table
-- Description: Create test plans table for test scheduling and tracking

CREATE TABLE IF NOT EXISTS test_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number VARCHAR(50) UNIQUE NOT NULL,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES samples(id),
    test_standard_id UUID REFERENCES test_standards(id),

    -- Plan Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status test_status DEFAULT 'pending',

    -- Test Configuration
    test_sequences JSONB, -- Specific test sequences for this plan
    test_parameters JSONB, -- Test parameters and conditions

    -- Schedule
    scheduled_start DATE,
    scheduled_end DATE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,

    -- Assignment
    assigned_lab_id UUID REFERENCES lab_facilities(id),
    lead_technician UUID REFERENCES users(id),

    -- Review
    reviewed_by UUID REFERENCES users(id),
    review_date TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_plans_number ON test_plans(plan_number);
CREATE INDEX IF NOT EXISTS idx_test_plans_service_request ON test_plans(service_request_id);
CREATE INDEX IF NOT EXISTS idx_test_plans_status ON test_plans(status);
CREATE INDEX IF NOT EXISTS idx_test_plans_standard ON test_plans(test_standard_id);
