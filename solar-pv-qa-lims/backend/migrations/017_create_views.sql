-- Migration: 017_create_views
-- Description: Create database views for reporting and analytics

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
