-- Solar PV QA LIMS Database Schema
-- PostgreSQL Database Schema for Laboratory Information Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'lab_manager', 'technician', 'quality_engineer', 'viewer');
CREATE TYPE request_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE request_type AS ENUM ('internal', 'external');
CREATE TYPE sample_status AS ENUM ('registered', 'received', 'in_testing', 'tested', 'on_hold', 'disposed');
CREATE TYPE test_status AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE result_status AS ENUM ('pass', 'fail', 'conditional', 'pending');
CREATE TYPE certification_status AS ENUM ('draft', 'issued', 'expired', 'revoked');
CREATE TYPE facility_type AS ENUM ('internal', 'external', 'partner');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'viewer',
    department VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- LAB FACILITIES TABLE
-- =====================================================

CREATE TABLE lab_facilities (
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

CREATE INDEX idx_lab_facilities_code ON lab_facilities(code);
CREATE INDEX idx_lab_facilities_type ON lab_facilities(facility_type);

-- =====================================================
-- TEST STANDARDS TABLE
-- =====================================================

CREATE TABLE test_standards (
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

CREATE INDEX idx_test_standards_code ON test_standards(standard_code);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    tax_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company ON customers(company_name);

-- =====================================================
-- SERVICE REQUESTS TABLE
-- =====================================================

CREATE TABLE service_requests (
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

CREATE INDEX idx_service_requests_number ON service_requests(request_number);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_customer ON service_requests(customer_id);
CREATE INDEX idx_service_requests_lab ON service_requests(assigned_lab_id);
CREATE INDEX idx_service_requests_created ON service_requests(created_at);

-- =====================================================
-- SAMPLES TABLE
-- =====================================================

CREATE TABLE samples (
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

CREATE INDEX idx_samples_sample_id ON samples(sample_id);
CREATE INDEX idx_samples_service_request ON samples(service_request_id);
CREATE INDEX idx_samples_status ON samples(status);

-- =====================================================
-- SAMPLE CHAIN OF CUSTODY TABLE
-- =====================================================

CREATE TABLE sample_chain_of_custody (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'received', 'transferred', 'tested', 'stored', 'disposed'
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    performed_by UUID REFERENCES users(id),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chain_of_custody_sample ON sample_chain_of_custody(sample_id);
CREATE INDEX idx_chain_of_custody_timestamp ON sample_chain_of_custody(timestamp);

-- =====================================================
-- TEST PLANS TABLE
-- =====================================================

CREATE TABLE test_plans (
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

CREATE INDEX idx_test_plans_number ON test_plans(plan_number);
CREATE INDEX idx_test_plans_service_request ON test_plans(service_request_id);
CREATE INDEX idx_test_plans_status ON test_plans(status);
CREATE INDEX idx_test_plans_standard ON test_plans(test_standard_id);

-- =====================================================
-- TEST RESULTS TABLE
-- =====================================================

CREATE TABLE test_results (
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

CREATE INDEX idx_test_results_number ON test_results(result_number);
CREATE INDEX idx_test_results_test_plan ON test_results(test_plan_id);
CREATE INDEX idx_test_results_sample ON test_results(sample_id);
CREATE INDEX idx_test_results_status ON test_results(status);

-- =====================================================
-- CERTIFICATIONS TABLE
-- =====================================================

CREATE TABLE certifications (
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

CREATE INDEX idx_certifications_number ON certifications(certificate_number);
CREATE INDEX idx_certifications_service_request ON certifications(service_request_id);
CREATE INDEX idx_certifications_status ON certifications(status);

-- =====================================================
-- REPORTS TABLE
-- =====================================================

CREATE TABLE reports (
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

CREATE INDEX idx_reports_number ON reports(report_number);
CREATE INDEX idx_reports_service_request ON reports(service_request_id);
CREATE INDEX idx_reports_status ON reports(status);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), -- 'info', 'warning', 'success', 'error'
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- =====================================================
-- EQUIPMENT TABLE
-- =====================================================

CREATE TABLE equipment (
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

CREATE INDEX idx_equipment_lab ON equipment(lab_facility_id);
CREATE INDEX idx_equipment_status ON equipment(status);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_facilities_updated_at BEFORE UPDATE ON lab_facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_standards_updated_at BEFORE UPDATE ON test_standards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON samples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := 'SR-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' ||
                             LPAD(NEXTVAL('service_request_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for request numbers
CREATE SEQUENCE IF NOT EXISTS service_request_seq START 1;
CREATE TRIGGER generate_service_request_number BEFORE INSERT ON service_requests
FOR EACH ROW EXECUTE FUNCTION generate_request_number();

-- Function to generate sample ID
CREATE OR REPLACE FUNCTION generate_sample_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sample_id IS NULL THEN
        NEW.sample_id := 'SAM-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' ||
                        LPAD(NEXTVAL('sample_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS sample_seq START 1;
CREATE TRIGGER generate_sample_id BEFORE INSERT ON samples
FOR EACH ROW EXECUTE FUNCTION generate_sample_id();

-- Function to generate test plan number
CREATE OR REPLACE FUNCTION generate_plan_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.plan_number IS NULL THEN
        NEW.plan_number := 'TP-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' ||
                          LPAD(NEXTVAL('test_plan_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS test_plan_seq START 1;
CREATE TRIGGER generate_test_plan_number BEFORE INSERT ON test_plans
FOR EACH ROW EXECUTE FUNCTION generate_plan_number();

-- Function to generate result number
CREATE OR REPLACE FUNCTION generate_result_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.result_number IS NULL THEN
        NEW.result_number := 'TR-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' ||
                            LPAD(NEXTVAL('test_result_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS test_result_seq START 1;
CREATE TRIGGER generate_test_result_number BEFORE INSERT ON test_results
FOR EACH ROW EXECUTE FUNCTION generate_result_number();

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.certificate_number IS NULL THEN
        NEW.certificate_number := 'CERT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY') || '-' ||
                                  LPAD(NEXTVAL('certificate_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS certificate_seq START 1;
CREATE TRIGGER generate_certificate_number BEFORE INSERT ON certifications
FOR EACH ROW EXECUTE FUNCTION generate_certificate_number();

-- Function to generate report number
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_number IS NULL THEN
        NEW.report_number := 'RPT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' ||
                            LPAD(NEXTVAL('report_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS report_seq START 1;
CREATE TRIGGER generate_report_number BEFORE INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION generate_report_number();

-- =====================================================
-- VIEWS
-- =====================================================

-- Active service requests summary view
CREATE OR REPLACE VIEW v_active_service_requests AS
SELECT
    sr.id,
    sr.request_number,
    sr.title,
    sr.status,
    sr.priority,
    sr.request_type,
    c.company_name AS customer_name,
    lf.name AS lab_name,
    u.first_name || ' ' || u.last_name AS assigned_to_name,
    sr.requested_date,
    sr.estimated_completion,
    COUNT(DISTINCT s.id) AS sample_count,
    COUNT(DISTINCT tp.id) AS test_plan_count
FROM service_requests sr
LEFT JOIN customers c ON sr.customer_id = c.id
LEFT JOIN lab_facilities lf ON sr.assigned_lab_id = lf.id
LEFT JOIN users u ON sr.assigned_to = u.id
LEFT JOIN samples s ON sr.id = s.service_request_id
LEFT JOIN test_plans tp ON sr.id = tp.service_request_id
WHERE sr.status NOT IN ('completed', 'cancelled')
GROUP BY sr.id, c.company_name, lf.name, u.first_name, u.last_name;

-- Test progress view
CREATE OR REPLACE VIEW v_test_progress AS
SELECT
    tp.id AS test_plan_id,
    tp.plan_number,
    tp.name AS test_plan_name,
    tp.status AS plan_status,
    sr.request_number,
    ts.standard_code,
    COUNT(tr.id) AS total_tests,
    COUNT(CASE WHEN tr.status = 'pass' THEN 1 END) AS passed_tests,
    COUNT(CASE WHEN tr.status = 'fail' THEN 1 END) AS failed_tests,
    COUNT(CASE WHEN tr.status = 'pending' THEN 1 END) AS pending_tests,
    ROUND(
        COUNT(CASE WHEN tr.status IN ('pass', 'fail') THEN 1 END)::DECIMAL /
        NULLIF(COUNT(tr.id), 0) * 100, 2
    ) AS completion_percentage
FROM test_plans tp
LEFT JOIN service_requests sr ON tp.service_request_id = sr.id
LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
LEFT JOIN test_results tr ON tp.id = tr.test_plan_id
GROUP BY tp.id, sr.request_number, ts.standard_code;

-- Lab workload view
CREATE OR REPLACE VIEW v_lab_workload AS
SELECT
    lf.id AS lab_id,
    lf.name AS lab_name,
    lf.facility_type,
    COUNT(DISTINCT sr.id) AS active_requests,
    COUNT(DISTINCT s.id) AS samples_in_lab,
    COUNT(DISTINCT tp.id) AS active_test_plans,
    COUNT(DISTINCT CASE WHEN tp.status = 'in_progress' THEN tp.id END) AS tests_in_progress
FROM lab_facilities lf
LEFT JOIN service_requests sr ON lf.id = sr.assigned_lab_id AND sr.status IN ('approved', 'in_progress')
LEFT JOIN samples s ON sr.id = s.service_request_id AND s.status IN ('received', 'in_testing')
LEFT JOIN test_plans tp ON sr.id = tp.service_request_id AND tp.status NOT IN ('completed', 'cancelled')
WHERE lf.is_active = true
GROUP BY lf.id;

-- =====================================================
-- SEED DATA - TEST STANDARDS
-- =====================================================

INSERT INTO test_standards (standard_code, name, version, description, category, duration_days) VALUES
('IEC 61215', 'Crystalline Silicon Terrestrial Photovoltaic (PV) Modules - Design Qualification and Type Approval', '2021', 'Performance and reliability testing for crystalline silicon PV modules', 'performance', 90),
('IEC 61730', 'Photovoltaic (PV) Module Safety Qualification', '2016', 'Safety requirements for PV modules', 'safety', 60),
('IEC 62716', 'Photovoltaic (PV) Modules - Ammonia Corrosion Testing', '2013', 'Testing for ammonia resistance in agricultural environments', 'environmental', 30),
('IEC 61701', 'Salt Mist Corrosion Testing of Photovoltaic (PV) Modules', '2020', 'Testing for salt mist resistance in coastal environments', 'environmental', 21),
('IEC 62804', 'Photovoltaic (PV) Modules - Test Methods for the Detection of Potential-Induced Degradation', '2015', 'PID testing for system voltage stress', 'durability', 14),
('UL 1703', 'Flat-Plate Photovoltaic Modules and Panels', '2020', 'US safety standard for PV modules', 'safety', 45),
('IEC 61853', 'Photovoltaic (PV) Module Performance Testing and Energy Rating', '2018', 'Performance characterization under various conditions', 'performance', 30),
('IEC 62892', 'Extended Thermal Cycling of Crystalline Silicon PV Modules', '2019', 'Extended thermal cycling for enhanced reliability', 'durability', 60);
