const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');
const { query, getClient } = require('../database/pool');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Get all service requests with filtering and pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      status,
      request_type,
      priority,
      customer_id,
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
    let whereClause = '';
    const conditions = [];

    if (status) {
      conditions.push(`sr.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (request_type) {
      conditions.push(`sr.request_type = $${paramIndex}`);
      params.push(request_type);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`sr.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (customer_id) {
      conditions.push(`sr.customer_id = $${paramIndex}`);
      params.push(customer_id);
      paramIndex++;
    }

    if (assigned_lab_id) {
      conditions.push(`sr.assigned_lab_id = $${paramIndex}`);
      params.push(assigned_lab_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(sr.request_number ILIKE $${paramIndex} OR sr.title ILIKE $${paramIndex} OR sr.manufacturer ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['created_at', 'request_number', 'title', 'status', 'priority', 'requested_date'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM service_requests sr ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get service requests with related data
    params.push(limit, offset);
    const result = await query(
      `SELECT
        sr.id, sr.request_number, sr.title, sr.description, sr.status, sr.priority,
        sr.request_type, sr.manufacturer, sr.model_number, sr.module_type,
        sr.rated_power_w, sr.requested_date, sr.estimated_completion, sr.actual_completion,
        sr.quoted_price, sr.currency, sr.po_number, sr.created_at, sr.updated_at,
        c.company_name AS customer_name, c.id AS customer_id,
        lf.name AS lab_name, lf.id AS lab_id,
        u.first_name || ' ' || u.last_name AS assigned_to_name,
        (SELECT COUNT(*) FROM samples s WHERE s.service_request_id = sr.id) AS sample_count,
        (SELECT COUNT(*) FROM test_plans tp WHERE tp.service_request_id = sr.id) AS test_plan_count
      FROM service_requests sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN lab_facilities lf ON sr.assigned_lab_id = lf.id
      LEFT JOIN users u ON sr.assigned_to = u.id
      ${whereClause}
      ORDER BY sr.${sortColumn} ${sortDirection}
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

// Get single service request by ID
router.get('/:id', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          sr.*,
          c.company_name, c.contact_name, c.email AS customer_email, c.phone AS customer_phone,
          lf.name AS lab_name, lf.code AS lab_code,
          u.first_name || ' ' || u.last_name AS assigned_to_name,
          creator.first_name || ' ' || creator.last_name AS created_by_name
        FROM service_requests sr
        LEFT JOIN customers c ON sr.customer_id = c.id
        LEFT JOIN lab_facilities lf ON sr.assigned_lab_id = lf.id
        LEFT JOIN users u ON sr.assigned_to = u.id
        LEFT JOIN users creator ON sr.created_by = creator.id
        WHERE sr.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Get samples for this request
      const samplesResult = await query(
        `SELECT id, sample_id, description, sample_type, quantity, status, serial_number, batch_number
         FROM samples WHERE service_request_id = $1 ORDER BY created_at`,
        [id]
      );

      // Get test plans for this request
      const testPlansResult = await query(
        `SELECT tp.id, tp.plan_number, tp.name, tp.status, tp.scheduled_start, tp.scheduled_end,
                ts.standard_code, ts.name AS standard_name
         FROM test_plans tp
         LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
         WHERE tp.service_request_id = $1 ORDER BY tp.created_at`,
        [id]
      );

      // Get test standards info
      const standardsResult = await query(
        `SELECT id, standard_code, name, description
         FROM test_standards
         WHERE id = ANY($1)`,
        [result.rows[0].requested_standards || []]
      );

      res.json({
        ...result.rows[0],
        samples: samplesResult.rows,
        test_plans: testPlansResult.rows,
        requested_standards_info: standardsResult.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new service request
router.post('/', authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('request_type').isIn(['internal', 'external']).withMessage('Invalid request type'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('customer_id').optional().isUUID(),
    body('manufacturer').optional().trim(),
    body('model_number').optional().trim(),
    body('module_type').optional().trim(),
    body('rated_power_w').optional().isFloat({ min: 0 }),
    body('requested_standards').optional().isArray(),
    body('special_requirements').optional().trim(),
    body('target_markets').optional().isArray()
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        title, description, request_type, priority,
        customer_id, manufacturer, model_number, module_type,
        rated_power_w, dimensions_mm, requested_standards,
        special_requirements, target_markets, assigned_lab_id,
        requested_date, estimated_completion, quoted_price, po_number
      } = req.body;

      const result = await query(
        `INSERT INTO service_requests (
          title, description, request_type, status, priority,
          customer_id, manufacturer, model_number, module_type,
          rated_power_w, dimensions_mm, requested_standards,
          special_requirements, target_markets, assigned_lab_id,
          requested_date, estimated_completion, quoted_price, po_number,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          title, description || null, request_type, 'draft', priority || 'normal',
          customer_id || null, manufacturer || null, model_number || null, module_type || null,
          rated_power_w || null, dimensions_mm || null, requested_standards || null,
          special_requirements || null, target_markets || null, assigned_lab_id || null,
          requested_date || null, estimated_completion || null, quoted_price || null, po_number || null,
          req.user.id
        ]
      );

      // Log audit
      await query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'CREATE', 'service_request', result.rows[0].id, JSON.stringify(result.rows[0])]
      );

      res.status(201).json({
        message: 'Service request created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update service request
router.put('/:id', authenticate,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['draft', 'submitted', 'in_review', 'approved', 'in_progress', 'completed', 'cancelled'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Get current state for audit
      const currentResult = await query('SELECT * FROM service_requests WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      const {
        title, description, status, priority,
        customer_id, manufacturer, model_number, module_type,
        rated_power_w, dimensions_mm, requested_standards,
        special_requirements, target_markets, assigned_lab_id,
        assigned_to, requested_date, estimated_completion,
        actual_completion, quoted_price, currency, po_number
      } = req.body;

      const result = await query(
        `UPDATE service_requests SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          customer_id = COALESCE($5, customer_id),
          manufacturer = COALESCE($6, manufacturer),
          model_number = COALESCE($7, model_number),
          module_type = COALESCE($8, module_type),
          rated_power_w = COALESCE($9, rated_power_w),
          dimensions_mm = COALESCE($10, dimensions_mm),
          requested_standards = COALESCE($11, requested_standards),
          special_requirements = COALESCE($12, special_requirements),
          target_markets = COALESCE($13, target_markets),
          assigned_lab_id = COALESCE($14, assigned_lab_id),
          assigned_to = COALESCE($15, assigned_to),
          requested_date = COALESCE($16, requested_date),
          estimated_completion = COALESCE($17, estimated_completion),
          actual_completion = COALESCE($18, actual_completion),
          quoted_price = COALESCE($19, quoted_price),
          currency = COALESCE($20, currency),
          po_number = COALESCE($21, po_number)
        WHERE id = $22
        RETURNING *`,
        [
          title, description, status, priority,
          customer_id, manufacturer, model_number, module_type,
          rated_power_w, dimensions_mm, requested_standards,
          special_requirements, target_markets, assigned_lab_id,
          assigned_to, requested_date, estimated_completion,
          actual_completion, quoted_price, currency, po_number,
          id
        ]
      );

      // Log audit
      await query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, 'UPDATE', 'service_request', id, JSON.stringify(currentResult.rows[0]), JSON.stringify(result.rows[0])]
      );

      res.json({
        message: 'Service request updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete service request
router.delete('/:id', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if exists
      const checkResult = await query('SELECT * FROM service_requests WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Don't allow deletion of completed requests
      if (checkResult.rows[0].status === 'completed') {
        return res.status(400).json({ error: 'Cannot delete completed service requests' });
      }

      await query('DELETE FROM service_requests WHERE id = $1', [id]);

      // Log audit
      await query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'DELETE', 'service_request', id, JSON.stringify(checkResult.rows[0])]
      );

      res.json({ message: 'Service request deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Submit service request for review
router.post('/:id/submit', authenticate,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT status FROM service_requests WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      if (checkResult.rows[0].status !== 'draft') {
        return res.status(400).json({ error: 'Only draft requests can be submitted' });
      }

      const result = await query(
        `UPDATE service_requests SET status = 'submitted' WHERE id = $1 RETURNING *`,
        [id]
      );

      res.json({
        message: 'Service request submitted successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve service request
router.post('/:id/approve', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT status FROM service_requests WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      if (!['submitted', 'in_review'].includes(checkResult.rows[0].status)) {
        return res.status(400).json({ error: 'Only submitted or in-review requests can be approved' });
      }

      const result = await query(
        `UPDATE service_requests SET status = 'approved' WHERE id = $1 RETURNING *`,
        [id]
      );

      res.json({
        message: 'Service request approved successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
