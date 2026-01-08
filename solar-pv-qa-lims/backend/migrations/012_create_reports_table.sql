-- Migration: 012_create_reports_table
-- Description: Create reports table for test reports and documentation

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number VARCHAR(50) UNIQUE NOT NULL,
    service_request_id UUID REFERENCES service_requests(id),
    test_plan_id UUID REFERENCES test_plans(id),

    -- Report Information
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(100), -- 'test_report', 'summary', 'calibration', etc.
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'issued'

    -- Content
    executive_summary TEXT,
    conclusions TEXT,
    recommendations TEXT,

    -- Results Summary
    overall_result result_status,
    test_results_summary JSONB,

    -- Document
    document_url VARCHAR(500),
    version INTEGER DEFAULT 1,

    -- Approval Workflow
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    review_date TIMESTAMP WITH TIME ZONE,
    approval_date TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_number ON reports(report_number);
CREATE INDEX IF NOT EXISTS idx_reports_service_request ON reports(service_request_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
