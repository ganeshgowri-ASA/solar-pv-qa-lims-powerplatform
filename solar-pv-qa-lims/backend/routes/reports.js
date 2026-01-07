const express = require('express');
const { body, param } = require('express-validator');
const { query, getClient } = require('../database/pool');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Get all reports with filtering and pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      status,
      report_type,
      service_request_id,
      search,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [];

    if (status) {
      conditions.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (report_type) {
      conditions.push(`r.report_type = $${paramIndex}`);
      params.push(report_type);
      paramIndex++;
    }

    if (service_request_id) {
      conditions.push(`r.service_request_id = $${paramIndex}`);
      params.push(service_request_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(r.report_number ILIKE $${paramIndex} OR r.title ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSortColumns = ['created_at', 'report_number', 'title', 'status'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM reports r ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get reports
    params.push(limit, offset);
    const result = await query(
      `SELECT
        r.*,
        sr.request_number, sr.title AS request_title,
        tp.plan_number,
        preparer.first_name || ' ' || preparer.last_name AS prepared_by_name,
        reviewer.first_name || ' ' || reviewer.last_name AS reviewed_by_name,
        approver.first_name || ' ' || approver.last_name AS approved_by_name
      FROM reports r
      LEFT JOIN service_requests sr ON r.service_request_id = sr.id
      LEFT JOIN test_plans tp ON r.test_plan_id = tp.id
      LEFT JOIN users preparer ON r.prepared_by = preparer.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      LEFT JOIN users approver ON r.approved_by = approver.id
      ${whereClause}
      ORDER BY r.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single report by ID
router.get('/:id', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          r.*,
          sr.request_number, sr.title AS request_title, sr.manufacturer, sr.model_number,
          tp.plan_number, tp.name AS test_plan_name,
          ts.standard_code, ts.name AS standard_name,
          preparer.first_name || ' ' || preparer.last_name AS prepared_by_name,
          reviewer.first_name || ' ' || reviewer.last_name AS reviewed_by_name,
          approver.first_name || ' ' || approver.last_name AS approved_by_name
        FROM reports r
        LEFT JOIN service_requests sr ON r.service_request_id = sr.id
        LEFT JOIN test_plans tp ON r.test_plan_id = tp.id
        LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
        LEFT JOIN users preparer ON r.prepared_by = preparer.id
        LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
        LEFT JOIN users approver ON r.approved_by = approver.id
        WHERE r.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Get associated test results if test_plan_id exists
      let testResults = [];
      if (result.rows[0].test_plan_id) {
        const trResult = await query(
          `SELECT tr.*, u.first_name || ' ' || u.last_name AS performed_by_name
           FROM test_results tr
           LEFT JOIN users u ON tr.performed_by = u.id
           WHERE tr.test_plan_id = $1
           ORDER BY tr.test_sequence`,
          [result.rows[0].test_plan_id]
        );
        testResults = trResult.rows;
      }

      res.json({
        ...result.rows[0],
        test_results: testResults
      });
    } catch (error) {
      next(error);
    }
  }
);

// Generate new report
router.post('/', authenticate,
  [
    body('title').trim().notEmpty().withMessage('Report title is required'),
    body('report_type').isIn(['test_report', 'summary', 'calibration', 'audit', 'other']).withMessage('Valid report type is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        service_request_id, test_plan_id, title, report_type,
        executive_summary, conclusions, recommendations
      } = req.body;

      // Get test results summary if test_plan_id provided
      let overall_result = null;
      let test_results_summary = null;

      if (test_plan_id) {
        const statsResult = await query(
          `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed,
            COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed,
            COUNT(CASE WHEN status = 'conditional' THEN 1 END) as conditional
          FROM test_results WHERE test_plan_id = $1`,
          [test_plan_id]
        );

        const stats = statsResult.rows[0];
        test_results_summary = stats;

        if (parseInt(stats.failed) > 0) {
          overall_result = 'fail';
        } else if (parseInt(stats.conditional) > 0) {
          overall_result = 'conditional';
        } else if (parseInt(stats.passed) > 0) {
          overall_result = 'pass';
        } else {
          overall_result = 'pending';
        }
      }

      const result = await query(
        `INSERT INTO reports (
          service_request_id, test_plan_id, title, report_type,
          executive_summary, conclusions, recommendations,
          overall_result, test_results_summary,
          status, prepared_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          service_request_id || null, test_plan_id || null,
          title, report_type,
          executive_summary || null, conclusions || null, recommendations || null,
          overall_result, test_results_summary ? JSON.stringify(test_results_summary) : null,
          'draft', req.user.id
        ]
      );

      res.status(201).json({
        message: 'Report generated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update report
router.put('/:id', authenticate,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['draft', 'review', 'approved', 'issued'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM reports WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const {
        title, executive_summary, conclusions, recommendations,
        overall_result, status
      } = req.body;

      // Handle version increment on content changes
      let newVersion = checkResult.rows[0].version;
      if (executive_summary || conclusions || recommendations) {
        newVersion = checkResult.rows[0].version + 1;
      }

      const result = await query(
        `UPDATE reports SET
          title = COALESCE($1, title),
          executive_summary = COALESCE($2, executive_summary),
          conclusions = COALESCE($3, conclusions),
          recommendations = COALESCE($4, recommendations),
          overall_result = COALESCE($5, overall_result),
          status = COALESCE($6, status),
          version = $7
        WHERE id = $8
        RETURNING *`,
        [
          title, executive_summary, conclusions, recommendations,
          overall_result, status, newVersion, id
        ]
      );

      res.json({
        message: 'Report updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit report for review
router.post('/:id/submit', authenticate,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT status FROM reports WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (checkResult.rows[0].status !== 'draft') {
        return res.status(400).json({ error: 'Only draft reports can be submitted for review' });
      }

      const result = await query(
        `UPDATE reports SET status = 'review' WHERE id = $1 RETURNING *`,
        [id]
      );

      res.json({
        message: 'Report submitted for review',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Review report
router.post('/:id/review', authenticate, authorize('admin', 'lab_manager', 'quality_engineer'),
  [
    param('id').isUUID(),
    body('approved').isBoolean().withMessage('Approval decision is required'),
    body('notes').optional().trim()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { approved, notes } = req.body;

      const checkResult = await query('SELECT status FROM reports WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (checkResult.rows[0].status !== 'review') {
        return res.status(400).json({ error: 'Only reports in review can be reviewed' });
      }

      const newStatus = approved ? 'approved' : 'draft';

      const result = await query(
        `UPDATE reports SET
          status = $1,
          reviewed_by = $2,
          review_date = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *`,
        [newStatus, req.user.id, id]
      );

      res.json({
        message: approved ? 'Report approved' : 'Report returned for revision',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve and issue report
router.post('/:id/issue', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT status FROM reports WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (checkResult.rows[0].status !== 'approved') {
        return res.status(400).json({ error: 'Only approved reports can be issued' });
      }

      const result = await query(
        `UPDATE reports SET
          status = 'issued',
          approved_by = $1,
          approval_date = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *`,
        [req.user.id, id]
      );

      res.json({
        message: 'Report issued successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Download report (generates report content)
router.get('/:id/download', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Get full report data
      const result = await query(
        `SELECT
          r.*,
          sr.request_number, sr.title AS request_title, sr.manufacturer, sr.model_number,
          sr.module_type, sr.rated_power_w,
          tp.plan_number, tp.name AS test_plan_name,
          ts.standard_code, ts.name AS standard_name,
          c.company_name AS customer_name,
          preparer.first_name || ' ' || preparer.last_name AS prepared_by_name,
          reviewer.first_name || ' ' || reviewer.last_name AS reviewed_by_name,
          approver.first_name || ' ' || approver.last_name AS approved_by_name
        FROM reports r
        LEFT JOIN service_requests sr ON r.service_request_id = sr.id
        LEFT JOIN customers c ON sr.customer_id = c.id
        LEFT JOIN test_plans tp ON r.test_plan_id = tp.id
        LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
        LEFT JOIN users preparer ON r.prepared_by = preparer.id
        LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
        LEFT JOIN users approver ON r.approved_by = approver.id
        WHERE r.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = result.rows[0];

      // Get test results
      let testResults = [];
      if (report.test_plan_id) {
        const trResult = await query(
          `SELECT tr.*, u.first_name || ' ' || u.last_name AS performed_by_name
           FROM test_results tr
           LEFT JOIN users u ON tr.performed_by = u.id
           WHERE tr.test_plan_id = $1
           ORDER BY tr.test_sequence`,
          [report.test_plan_id]
        );
        testResults = trResult.rows;
      }

      // Generate report content (in production, this would generate a PDF)
      const reportContent = {
        header: {
          report_number: report.report_number,
          title: report.title,
          report_type: report.report_type,
          version: report.version,
          status: report.status,
          generated_at: new Date().toISOString()
        },
        product_info: {
          manufacturer: report.manufacturer,
          model_number: report.model_number,
          module_type: report.module_type,
          rated_power: report.rated_power_w ? `${report.rated_power_w}W` : null,
          customer: report.customer_name
        },
        test_info: {
          service_request: report.request_number,
          test_plan: report.plan_number,
          standard: `${report.standard_code} - ${report.standard_name}`
        },
        summary: {
          executive_summary: report.executive_summary,
          overall_result: report.overall_result,
          conclusions: report.conclusions,
          recommendations: report.recommendations
        },
        test_results: testResults.map(tr => ({
          test_name: tr.test_name,
          test_code: tr.test_code,
          status: tr.status,
          performed_by: tr.performed_by_name,
          measured_values: tr.measured_values,
          observations: tr.observations
        })),
        approval: {
          prepared_by: report.prepared_by_name,
          reviewed_by: report.reviewed_by_name,
          review_date: report.review_date,
          approved_by: report.approved_by_name,
          approval_date: report.approval_date
        }
      };

      res.json(reportContent);
    } catch (error) {
      next(error);
    }
  }
);

// Delete report
router.delete('/:id', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM reports WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (checkResult.rows[0].status === 'issued') {
        return res.status(400).json({ error: 'Cannot delete issued reports' });
      }

      await query('DELETE FROM reports WHERE id = $1', [id]);

      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
