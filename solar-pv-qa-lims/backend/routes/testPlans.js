const express = require('express');
const { body, param } = require('express-validator');
const { query, getClient } = require('../database/pool');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Get all test plans with filtering and pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      status,
      service_request_id,
      sample_id,
      test_standard_id,
      assigned_lab_id,
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
      conditions.push(`tp.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (service_request_id) {
      conditions.push(`tp.service_request_id = $${paramIndex}`);
      params.push(service_request_id);
      paramIndex++;
    }

    if (sample_id) {
      conditions.push(`tp.sample_id = $${paramIndex}`);
      params.push(sample_id);
      paramIndex++;
    }

    if (test_standard_id) {
      conditions.push(`tp.test_standard_id = $${paramIndex}`);
      params.push(test_standard_id);
      paramIndex++;
    }

    if (assigned_lab_id) {
      conditions.push(`tp.assigned_lab_id = $${paramIndex}`);
      params.push(assigned_lab_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(tp.plan_number ILIKE $${paramIndex} OR tp.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSortColumns = ['created_at', 'plan_number', 'name', 'status', 'scheduled_start'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM test_plans tp ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get test plans
    params.push(limit, offset);
    const result = await query(
      `SELECT
        tp.*,
        sr.request_number,
        s.sample_id AS sample_number,
        ts.standard_code, ts.name AS standard_name,
        lf.name AS lab_name,
        u.first_name || ' ' || u.last_name AS lead_technician_name,
        (SELECT COUNT(*) FROM test_results tr WHERE tr.test_plan_id = tp.id) AS total_tests,
        (SELECT COUNT(*) FROM test_results tr WHERE tr.test_plan_id = tp.id AND tr.status = 'pass') AS passed_tests,
        (SELECT COUNT(*) FROM test_results tr WHERE tr.test_plan_id = tp.id AND tr.status = 'fail') AS failed_tests
      FROM test_plans tp
      LEFT JOIN service_requests sr ON tp.service_request_id = sr.id
      LEFT JOIN samples s ON tp.sample_id = s.id
      LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
      LEFT JOIN lab_facilities lf ON tp.assigned_lab_id = lf.id
      LEFT JOIN users u ON tp.lead_technician = u.id
      ${whereClause}
      ORDER BY tp.${sortColumn} ${sortDirection}
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

// Get single test plan by ID
router.get('/:id', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          tp.*,
          sr.request_number, sr.title AS request_title,
          s.sample_id AS sample_number, s.description AS sample_description,
          ts.standard_code, ts.name AS standard_name, ts.description AS standard_description,
          lf.name AS lab_name, lf.code AS lab_code,
          u.first_name || ' ' || u.last_name AS lead_technician_name,
          creator.first_name || ' ' || creator.last_name AS created_by_name,
          reviewer.first_name || ' ' || reviewer.last_name AS reviewed_by_name
        FROM test_plans tp
        LEFT JOIN service_requests sr ON tp.service_request_id = sr.id
        LEFT JOIN samples s ON tp.sample_id = s.id
        LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
        LEFT JOIN lab_facilities lf ON tp.assigned_lab_id = lf.id
        LEFT JOIN users u ON tp.lead_technician = u.id
        LEFT JOIN users creator ON tp.created_by = creator.id
        LEFT JOIN users reviewer ON tp.reviewed_by = reviewer.id
        WHERE tp.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Test plan not found' });
      }

      // Get test results for this plan
      const testResultsResult = await query(
        `SELECT
          tr.*,
          u.first_name || ' ' || u.last_name AS performed_by_name,
          verifier.first_name || ' ' || verifier.last_name AS verified_by_name
        FROM test_results tr
        LEFT JOIN users u ON tr.performed_by = u.id
        LEFT JOIN users verifier ON tr.verified_by = verifier.id
        WHERE tr.test_plan_id = $1
        ORDER BY tr.test_sequence, tr.created_at`,
        [id]
      );

      res.json({
        ...result.rows[0],
        test_results: testResultsResult.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get available test standards
router.get('/standards/list', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, standard_code, name, version, description, category, duration_days
       FROM test_standards WHERE is_active = true ORDER BY standard_code`
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create new test plan
router.post('/', authenticate,
  [
    body('service_request_id').isUUID().withMessage('Valid service request ID is required'),
    body('name').trim().notEmpty().withMessage('Test plan name is required'),
    body('test_standard_id').optional().isUUID(),
    body('sample_id').optional().isUUID()
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        service_request_id, sample_id, test_standard_id,
        name, description, test_sequences, test_parameters,
        scheduled_start, scheduled_end, assigned_lab_id, lead_technician
      } = req.body;

      // Verify service request exists
      const srResult = await query('SELECT id FROM service_requests WHERE id = $1', [service_request_id]);
      if (srResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      const result = await query(
        `INSERT INTO test_plans (
          service_request_id, sample_id, test_standard_id,
          name, description, test_sequences, test_parameters,
          scheduled_start, scheduled_end, assigned_lab_id, lead_technician,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          service_request_id, sample_id || null, test_standard_id || null,
          name, description || null, test_sequences || null, test_parameters || null,
          scheduled_start || null, scheduled_end || null, assigned_lab_id || null,
          lead_technician || null, 'pending', req.user.id
        ]
      );

      res.status(201).json({
        message: 'Test plan created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update test plan
router.put('/:id', authenticate,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM test_plans WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test plan not found' });
      }

      const {
        sample_id, test_standard_id, name, description,
        test_sequences, test_parameters, status,
        scheduled_start, scheduled_end, assigned_lab_id, lead_technician
      } = req.body;

      // Handle status transitions
      let actual_start = checkResult.rows[0].actual_start;
      let actual_end = checkResult.rows[0].actual_end;

      if (status === 'in_progress' && !actual_start) {
        actual_start = new Date();
      }
      if (status === 'completed' && !actual_end) {
        actual_end = new Date();
      }

      const result = await query(
        `UPDATE test_plans SET
          sample_id = COALESCE($1, sample_id),
          test_standard_id = COALESCE($2, test_standard_id),
          name = COALESCE($3, name),
          description = COALESCE($4, description),
          test_sequences = COALESCE($5, test_sequences),
          test_parameters = COALESCE($6, test_parameters),
          status = COALESCE($7, status),
          scheduled_start = COALESCE($8, scheduled_start),
          scheduled_end = COALESCE($9, scheduled_end),
          assigned_lab_id = COALESCE($10, assigned_lab_id),
          lead_technician = COALESCE($11, lead_technician),
          actual_start = $12,
          actual_end = $13
        WHERE id = $14
        RETURNING *`,
        [
          sample_id, test_standard_id, name, description,
          test_sequences, test_parameters, status,
          scheduled_start, scheduled_end, assigned_lab_id, lead_technician,
          actual_start, actual_end, id
        ]
      );

      res.json({
        message: 'Test plan updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add test result to test plan
router.post('/:id/results', authenticate,
  [
    param('id').isUUID(),
    body('test_name').trim().notEmpty().withMessage('Test name is required'),
    body('status').isIn(['pass', 'fail', 'conditional', 'pending']).withMessage('Valid status is required')
  ],
  validate,
  async (req, res, next) => {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { id } = req.params;

      // Verify test plan exists
      const tpResult = await client.query('SELECT * FROM test_plans WHERE id = $1', [id]);
      if (tpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Test plan not found' });
      }

      const {
        test_name, test_code, test_sequence, sample_id,
        status, measured_values, pass_criteria, test_conditions,
        observations, deviations, equipment_used
      } = req.body;

      // Use test plan's sample if not specified
      const sampleId = sample_id || tpResult.rows[0].sample_id;

      const result = await client.query(
        `INSERT INTO test_results (
          test_plan_id, sample_id, test_name, test_code, test_sequence,
          status, measured_values, pass_criteria, test_conditions,
          observations, deviations, equipment_used, performed_by,
          start_time, end_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          id, sampleId, test_name, test_code || null, test_sequence || null,
          status, measured_values || null, pass_criteria || null, test_conditions || null,
          observations || null, deviations || null, equipment_used || null, req.user.id,
          new Date(), status !== 'pending' ? new Date() : null
        ]
      );

      // Update sample status if needed
      if (sampleId) {
        await client.query(
          `UPDATE samples SET status = 'in_testing' WHERE id = $1 AND status = 'received'`,
          [sampleId]
        );
      }

      // Update test plan status if needed
      if (tpResult.rows[0].status === 'pending' || tpResult.rows[0].status === 'scheduled') {
        await client.query(
          `UPDATE test_plans SET status = 'in_progress', actual_start = COALESCE(actual_start, CURRENT_TIMESTAMP) WHERE id = $1`,
          [id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Test result added successfully',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

// Update test result
router.put('/:id/results/:resultId', authenticate,
  [
    param('id').isUUID(),
    param('resultId').isUUID(),
    body('status').optional().isIn(['pass', 'fail', 'conditional', 'pending'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id, resultId } = req.params;

      const checkResult = await query(
        'SELECT * FROM test_results WHERE id = $1 AND test_plan_id = $2',
        [resultId, id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test result not found' });
      }

      const {
        status, measured_values, pass_criteria, test_conditions,
        observations, deviations, equipment_used
      } = req.body;

      const result = await query(
        `UPDATE test_results SET
          status = COALESCE($1, status),
          measured_values = COALESCE($2, measured_values),
          pass_criteria = COALESCE($3, pass_criteria),
          test_conditions = COALESCE($4, test_conditions),
          observations = COALESCE($5, observations),
          deviations = COALESCE($6, deviations),
          equipment_used = COALESCE($7, equipment_used),
          end_time = CASE WHEN $1 IS NOT NULL AND $1 != 'pending' THEN CURRENT_TIMESTAMP ELSE end_time END
        WHERE id = $8
        RETURNING *`,
        [
          status, measured_values, pass_criteria, test_conditions,
          observations, deviations, equipment_used, resultId
        ]
      );

      res.json({
        message: 'Test result updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify test result
router.post('/:id/results/:resultId/verify', authenticate, authorize('admin', 'lab_manager', 'quality_engineer'),
  [
    param('id').isUUID(),
    param('resultId').isUUID(),
    body('verification_notes').optional().trim()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id, resultId } = req.params;
      const { verification_notes } = req.body;

      const checkResult = await query(
        'SELECT * FROM test_results WHERE id = $1 AND test_plan_id = $2',
        [resultId, id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test result not found' });
      }

      const result = await query(
        `UPDATE test_results SET
          verified_by = $1,
          verification_date = CURRENT_TIMESTAMP,
          verification_notes = $2
        WHERE id = $3
        RETURNING *`,
        [req.user.id, verification_notes || null, resultId]
      );

      res.json({
        message: 'Test result verified successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Complete test plan
router.post('/:id/complete', authenticate, authorize('admin', 'lab_manager', 'quality_engineer'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { id } = req.params;

      const tpResult = await client.query('SELECT * FROM test_plans WHERE id = $1', [id]);
      if (tpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Test plan not found' });
      }

      // Check if all test results are completed
      const pendingResults = await client.query(
        `SELECT COUNT(*) FROM test_results WHERE test_plan_id = $1 AND status = 'pending'`,
        [id]
      );

      if (parseInt(pendingResults.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Cannot complete test plan with pending test results',
          pending_count: parseInt(pendingResults.rows[0].count)
        });
      }

      // Determine overall status based on test results
      const failedResults = await client.query(
        `SELECT COUNT(*) FROM test_results WHERE test_plan_id = $1 AND status = 'fail'`,
        [id]
      );

      const overallStatus = parseInt(failedResults.rows[0].count) > 0 ? 'failed' : 'completed';

      const result = await client.query(
        `UPDATE test_plans SET
          status = $1,
          actual_end = CURRENT_TIMESTAMP,
          reviewed_by = $2,
          review_date = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *`,
        [overallStatus, req.user.id, id]
      );

      // Update sample status
      if (tpResult.rows[0].sample_id) {
        await client.query(
          `UPDATE samples SET status = 'tested' WHERE id = $1`,
          [tpResult.rows[0].sample_id]
        );
      }

      await client.query('COMMIT');

      res.json({
        message: 'Test plan completed successfully',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

// Delete test plan
router.delete('/:id', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM test_plans WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test plan not found' });
      }

      if (checkResult.rows[0].status === 'completed') {
        return res.status(400).json({ error: 'Cannot delete completed test plans' });
      }

      await query('DELETE FROM test_plans WHERE id = $1', [id]);

      res.json({ message: 'Test plan deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
