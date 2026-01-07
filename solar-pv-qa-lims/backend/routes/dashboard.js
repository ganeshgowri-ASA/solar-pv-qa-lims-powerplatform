const express = require('express');
const { query } = require('../database/pool');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', optionalAuth, async (req, res, next) => {
  try {
    // Service request stats
    const srStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'in_review' THEN 1 END) as in_review,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM service_requests
    `);

    // Sample stats
    const sampleStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
        COUNT(CASE WHEN status = 'in_testing' THEN 1 END) as in_testing,
        COUNT(CASE WHEN status = 'tested' THEN 1 END) as tested
      FROM samples
    `);

    // Test plan stats
    const testStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM test_plans
    `);

    // Test results stats
    const resultStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed,
        COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'conditional' THEN 1 END) as conditional,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM test_results
    `);

    // Certification stats
    const certStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) THEN 1 END) as expired
      FROM certifications
    `);

    // Lab stats
    const labStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN facility_type = 'internal' THEN 1 END) as internal,
        COUNT(CASE WHEN facility_type = 'external' THEN 1 END) as external,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active
      FROM lab_facilities
    `);

    res.json({
      service_requests: srStats.rows[0],
      samples: sampleStats.rows[0],
      test_plans: testStats.rows[0],
      test_results: resultStats.rows[0],
      certifications: certStats.rows[0],
      labs: labStats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get KPIs
router.get('/kpis', optionalAuth, async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days
    const periodDays = parseInt(period);

    // Requests completed in period
    const completedRequests = await query(`
      SELECT COUNT(*) as count
      FROM service_requests
      WHERE status = 'completed'
        AND actual_completion >= CURRENT_DATE - INTERVAL '${periodDays} days'
    `);

    // Average turnaround time (days)
    const avgTurnaround = await query(`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (actual_completion - created_at)) / 86400)::numeric, 1) as avg_days
      FROM service_requests
      WHERE status = 'completed'
        AND actual_completion IS NOT NULL
        AND actual_completion >= CURRENT_DATE - INTERVAL '${periodDays} days'
    `);

    // Test pass rate
    const passRate = await query(`
      SELECT
        ROUND(
          COUNT(CASE WHEN status = 'pass' THEN 1 END)::numeric * 100 /
          NULLIF(COUNT(CASE WHEN status IN ('pass', 'fail') THEN 1 END), 0),
          1
        ) as rate
      FROM test_results
      WHERE created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
    `);

    // Samples processed
    const samplesProcessed = await query(`
      SELECT COUNT(*) as count
      FROM samples
      WHERE status IN ('tested', 'disposed')
        AND updated_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
    `);

    // Certificates issued
    const certsIssued = await query(`
      SELECT COUNT(*) as count
      FROM certifications
      WHERE status = 'issued'
        AND issue_date >= CURRENT_DATE - INTERVAL '${periodDays} days'
    `);

    // On-time completion rate
    const onTimeRate = await query(`
      SELECT
        ROUND(
          COUNT(CASE WHEN actual_completion <= estimated_completion THEN 1 END)::numeric * 100 /
          NULLIF(COUNT(*), 0),
          1
        ) as rate
      FROM service_requests
      WHERE status = 'completed'
        AND actual_completion IS NOT NULL
        AND estimated_completion IS NOT NULL
        AND actual_completion >= CURRENT_DATE - INTERVAL '${periodDays} days'
    `);

    // Active workload
    const activeWorkload = await query(`
      SELECT
        (SELECT COUNT(*) FROM service_requests WHERE status IN ('approved', 'in_progress')) as active_requests,
        (SELECT COUNT(*) FROM test_plans WHERE status = 'in_progress') as active_tests,
        (SELECT COUNT(*) FROM samples WHERE status = 'in_testing') as samples_in_testing
    `);

    res.json({
      period_days: periodDays,
      kpis: {
        completed_requests: parseInt(completedRequests.rows[0].count),
        avg_turnaround_days: parseFloat(avgTurnaround.rows[0].avg_days) || 0,
        test_pass_rate: parseFloat(passRate.rows[0].rate) || 0,
        samples_processed: parseInt(samplesProcessed.rows[0].count),
        certificates_issued: parseInt(certsIssued.rows[0].count),
        on_time_completion_rate: parseFloat(onTimeRate.rows[0].rate) || 0
      },
      current_workload: activeWorkload.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get recent activity
router.get('/recent-activity', optionalAuth, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    // Recent service requests
    const recentRequests = await query(`
      SELECT
        sr.id, sr.request_number, sr.title, sr.status, sr.priority, sr.created_at,
        c.company_name as customer_name,
        'service_request' as type
      FROM service_requests sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      ORDER BY sr.created_at DESC
      LIMIT $1
    `, [Math.ceil(limit / 4)]);

    // Recent samples
    const recentSamples = await query(`
      SELECT
        s.id, s.sample_id, s.description, s.status, s.created_at,
        sr.request_number,
        'sample' as type
      FROM samples s
      LEFT JOIN service_requests sr ON s.service_request_id = sr.id
      ORDER BY s.created_at DESC
      LIMIT $1
    `, [Math.ceil(limit / 4)]);

    // Recent test results
    const recentResults = await query(`
      SELECT
        tr.id, tr.result_number, tr.test_name, tr.status, tr.created_at,
        tp.plan_number,
        'test_result' as type
      FROM test_results tr
      LEFT JOIN test_plans tp ON tr.test_plan_id = tp.id
      ORDER BY tr.created_at DESC
      LIMIT $1
    `, [Math.ceil(limit / 4)]);

    // Recent certifications
    const recentCerts = await query(`
      SELECT
        c.id, c.certificate_number, c.manufacturer, c.status, c.created_at,
        'certification' as type
      FROM certifications c
      ORDER BY c.created_at DESC
      LIMIT $1
    `, [Math.ceil(limit / 4)]);

    // Combine and sort by date
    const allActivity = [
      ...recentRequests.rows.map(r => ({
        ...r,
        title: r.title || r.request_number,
        subtitle: r.customer_name
      })),
      ...recentSamples.rows.map(s => ({
        ...s,
        title: s.sample_id,
        subtitle: s.request_number
      })),
      ...recentResults.rows.map(r => ({
        ...r,
        title: r.test_name,
        subtitle: r.plan_number
      })),
      ...recentCerts.rows.map(c => ({
        ...c,
        title: c.certificate_number,
        subtitle: c.manufacturer
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
     .slice(0, limit);

    res.json({ activity: allActivity });
  } catch (error) {
    next(error);
  }
});

// Get test standards summary
router.get('/standards-summary', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        ts.id, ts.standard_code, ts.name, ts.category,
        COUNT(DISTINCT tp.id) as total_test_plans,
        COUNT(DISTINCT CASE WHEN tp.status = 'in_progress' THEN tp.id END) as active_tests,
        COUNT(DISTINCT CASE WHEN tp.status = 'completed' THEN tp.id END) as completed_tests
      FROM test_standards ts
      LEFT JOIN test_plans tp ON ts.id = tp.test_standard_id
      WHERE ts.is_active = true
      GROUP BY ts.id
      ORDER BY ts.standard_code
    `);

    res.json({ standards: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get lab utilization
router.get('/lab-utilization', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        lf.id, lf.name, lf.code, lf.facility_type,
        COUNT(DISTINCT sr.id) as active_requests,
        COUNT(DISTINCT tp.id) as active_test_plans,
        COUNT(DISTINCT s.id) as samples_in_lab,
        COALESCE(
          ROUND(
            COUNT(DISTINCT tp.id)::numeric * 100 / NULLIF(
              (SELECT COUNT(*) FROM test_plans WHERE assigned_lab_id = lf.id), 0
            ), 1
          ), 0
        ) as utilization_percent
      FROM lab_facilities lf
      LEFT JOIN service_requests sr ON lf.id = sr.assigned_lab_id AND sr.status IN ('approved', 'in_progress')
      LEFT JOIN test_plans tp ON lf.id = tp.assigned_lab_id AND tp.status = 'in_progress'
      LEFT JOIN samples s ON sr.id = s.service_request_id AND s.status = 'in_testing'
      WHERE lf.is_active = true
      GROUP BY lf.id
      ORDER BY lf.name
    `);

    res.json({ labs: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get upcoming deadlines
router.get('/upcoming-deadlines', optionalAuth, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    // Service request deadlines
    const requestDeadlines = await query(`
      SELECT
        sr.id, sr.request_number, sr.title, sr.estimated_completion as deadline,
        sr.priority, 'service_request' as type,
        c.company_name as context
      FROM service_requests sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      WHERE sr.status IN ('approved', 'in_progress')
        AND sr.estimated_completion IS NOT NULL
        AND sr.estimated_completion <= CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY sr.estimated_completion
    `);

    // Test plan deadlines
    const testDeadlines = await query(`
      SELECT
        tp.id, tp.plan_number as reference, tp.name as title, tp.scheduled_end as deadline,
        'test_plan' as type,
        ts.standard_code as context
      FROM test_plans tp
      LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
      WHERE tp.status IN ('pending', 'scheduled', 'in_progress')
        AND tp.scheduled_end IS NOT NULL
        AND tp.scheduled_end <= CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY tp.scheduled_end
    `);

    // Expiring certifications
    const expiringCerts = await query(`
      SELECT
        c.id, c.certificate_number as reference, c.manufacturer as title, c.expiry_date as deadline,
        'certification' as type,
        array_to_string(c.standard_codes, ', ') as context
      FROM certifications c
      WHERE c.status = 'issued'
        AND c.expiry_date IS NOT NULL
        AND c.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY c.expiry_date
    `);

    // Equipment calibration due
    const calibrationDue = await query(`
      SELECT
        e.id, e.equipment_id as reference, e.name as title, e.calibration_due as deadline,
        'equipment' as type,
        lf.name as context
      FROM equipment e
      LEFT JOIN lab_facilities lf ON e.lab_facility_id = lf.id
      WHERE e.status = 'active'
        AND e.calibration_due IS NOT NULL
        AND e.calibration_due <= CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY e.calibration_due
    `);

    // Combine and sort
    const allDeadlines = [
      ...requestDeadlines.rows,
      ...testDeadlines.rows,
      ...expiringCerts.rows,
      ...calibrationDue.rows
    ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    res.json({ deadlines: allDeadlines });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
