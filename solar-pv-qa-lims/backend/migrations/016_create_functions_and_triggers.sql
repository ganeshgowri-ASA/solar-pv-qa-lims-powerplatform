-- Migration: 016_create_functions_and_triggers
-- Description: Create helper functions and triggers for automatic updates

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

-- Apply updated_at trigger to all tables (using DROP IF EXISTS to avoid errors)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_facilities_updated_at ON lab_facilities;
CREATE TRIGGER update_lab_facilities_updated_at BEFORE UPDATE ON lab_facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_standards_updated_at ON test_standards;
CREATE TRIGGER update_test_standards_updated_at BEFORE UPDATE ON test_standards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON service_requests;
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_samples_updated_at ON samples;
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON samples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_plans_updated_at ON test_plans;
CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_certifications_updated_at ON certifications;
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEQUENCES AND AUTO-GENERATION FUNCTIONS
-- =====================================================

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS service_request_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sample_seq START 1;
CREATE SEQUENCE IF NOT EXISTS test_plan_seq START 1;
CREATE SEQUENCE IF NOT EXISTS test_result_seq START 1;
CREATE SEQUENCE IF NOT EXISTS certificate_seq START 1;
CREATE SEQUENCE IF NOT EXISTS report_seq START 1;

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

DROP TRIGGER IF EXISTS generate_service_request_number ON service_requests;
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

DROP TRIGGER IF EXISTS generate_sample_id ON samples;
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

DROP TRIGGER IF EXISTS generate_test_plan_number ON test_plans;
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

DROP TRIGGER IF EXISTS generate_test_result_number ON test_results;
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

DROP TRIGGER IF EXISTS generate_certificate_number ON certifications;
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

DROP TRIGGER IF EXISTS generate_report_number ON reports;
CREATE TRIGGER generate_report_number BEFORE INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION generate_report_number();
