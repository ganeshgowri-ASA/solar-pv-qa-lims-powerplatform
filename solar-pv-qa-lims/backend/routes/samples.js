const express = require('express');
const { body, param } = require('express-validator');
const { query, getClient } = require('../database/pool');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Get all samples with filtering and pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      status,
      sample_type,
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
      conditions.push(`s.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (sample_type) {
      conditions.push(`s.sample_type = $${paramIndex}`);
      params.push(sample_type);
      paramIndex++;
    }

    if (service_request_id) {
      conditions.push(`s.service_request_id = $${paramIndex}`);
      params.push(service_request_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(s.sample_id ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex} OR s.serial_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSortColumns = ['created_at', 'sample_id', 'status', 'received_date'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM samples s ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get samples
    params.push(limit, offset);
    const result = await query(
      `SELECT
        s.*,
        sr.request_number, sr.title AS request_title,
        u.first_name || ' ' || u.last_name AS received_by_name
      FROM samples s
      LEFT JOIN service_requests sr ON s.service_request_id = sr.id
      LEFT JOIN users u ON s.received_by = u.id
      ${whereClause}
      ORDER BY s.${sortColumn} ${sortDirection}
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

// Get single sample by ID
router.get('/:id', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          s.*,
          sr.request_number, sr.title AS request_title, sr.manufacturer, sr.model_number,
          u.first_name || ' ' || u.last_name AS received_by_name,
          creator.first_name || ' ' || creator.last_name AS created_by_name
        FROM samples s
        LEFT JOIN service_requests sr ON s.service_request_id = sr.id
        LEFT JOIN users u ON s.received_by = u.id
        LEFT JOIN users creator ON s.created_by = creator.id
        WHERE s.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sample not found' });
      }

      // Get test results for this sample
      const testResultsResult = await query(
        `SELECT tr.id, tr.result_number, tr.test_name, tr.test_code, tr.status,
                tr.start_time, tr.end_time, tp.plan_number
         FROM test_results tr
         LEFT JOIN test_plans tp ON tr.test_plan_id = tp.id
         WHERE tr.sample_id = $1
         ORDER BY tr.test_sequence`,
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

// Get sample chain of custody
router.get('/:id/chain-of-custody', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verify sample exists
      const sampleResult = await query('SELECT sample_id FROM samples WHERE id = $1', [id]);
      if (sampleResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sample not found' });
      }

      const result = await query(
        `SELECT
          coc.*,
          u.first_name || ' ' || u.last_name AS performed_by_name
        FROM sample_chain_of_custody coc
        LEFT JOIN users u ON coc.performed_by = u.id
        WHERE coc.sample_id = $1
        ORDER BY coc.timestamp DESC`,
        [id]
      );

      res.json({
        sample_id: sampleResult.rows[0].sample_id,
        chain_of_custody: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new sample
router.post('/', authenticate,
  [
    body('service_request_id').isUUID().withMessage('Valid service request ID is required'),
    body('description').optional().trim(),
    body('sample_type').optional().isIn(['module', 'cell', 'component', 'material']),
    body('quantity').optional().isInt({ min: 1 }),
    body('serial_number').optional().trim(),
    body('batch_number').optional().trim()
  ],
  validate,
  async (req, res, next) => {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const {
        service_request_id, description, sample_type, quantity,
        serial_number, batch_number, manufacturing_date, storage_location
      } = req.body;

      // Verify service request exists
      const srResult = await client.query(
        'SELECT id, request_number FROM service_requests WHERE id = $1',
        [service_request_id]
      );

      if (srResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Create sample
      const result = await client.query(
        `INSERT INTO samples (
          service_request_id, description, sample_type, quantity,
          serial_number, batch_number, manufacturing_date, storage_location,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          service_request_id, description || null, sample_type || 'module',
          quantity || 1, serial_number || null, batch_number || null,
          manufacturing_date || null, storage_location || null,
          'registered', req.user.id
        ]
      );

      // Create initial chain of custody entry
      await client.query(
        `INSERT INTO sample_chain_of_custody (sample_id, action, to_location, performed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [result.rows[0].id, 'registered', 'System', req.user.id, 'Sample registered in system']
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Sample created successfully',
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

// Update sample
router.put('/:id', authenticate,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['registered', 'received', 'in_testing', 'tested', 'on_hold', 'disposed'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM samples WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sample not found' });
      }

      const {
        description, sample_type, quantity, serial_number,
        batch_number, manufacturing_date, status, storage_location,
        storage_conditions, receiving_condition, condition_notes
      } = req.body;

      const result = await query(
        `UPDATE samples SET
          description = COALESCE($1, description),
          sample_type = COALESCE($2, sample_type),
          quantity = COALESCE($3, quantity),
          serial_number = COALESCE($4, serial_number),
          batch_number = COALESCE($5, batch_number),
          manufacturing_date = COALESCE($6, manufacturing_date),
          status = COALESCE($7, status),
          storage_location = COALESCE($8, storage_location),
          storage_conditions = COALESCE($9, storage_conditions),
          receiving_condition = COALESCE($10, receiving_condition),
          condition_notes = COALESCE($11, condition_notes)
        WHERE id = $12
        RETURNING *`,
        [
          description, sample_type, quantity, serial_number,
          batch_number, manufacturing_date, status, storage_location,
          storage_conditions, receiving_condition, condition_notes,
          id
        ]
      );

      res.json({
        message: 'Sample updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Receive sample
router.post('/:id/receive', authenticate,
  [
    param('id').isUUID(),
    body('receiving_condition').isIn(['good', 'damaged', 'partial']).withMessage('Valid receiving condition is required'),
    body('storage_location').notEmpty().withMessage('Storage location is required')
  ],
  validate,
  async (req, res, next) => {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { receiving_condition, storage_location, condition_notes } = req.body;

      const checkResult = await client.query('SELECT * FROM samples WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Sample not found' });
      }

      if (checkResult.rows[0].status !== 'registered') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Sample has already been received' });
      }

      // Update sample
      const result = await client.query(
        `UPDATE samples SET
          status = 'received',
          received_date = CURRENT_TIMESTAMP,
          received_by = $1,
          receiving_condition = $2,
          storage_location = $3,
          condition_notes = $4
        WHERE id = $5
        RETURNING *`,
        [req.user.id, receiving_condition, storage_location, condition_notes || null, id]
      );

      // Add chain of custody entry
      await client.query(
        `INSERT INTO sample_chain_of_custody (sample_id, action, to_location, performed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, 'received', storage_location, req.user.id, `Received in ${receiving_condition} condition. ${condition_notes || ''}`]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Sample received successfully',
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

// Transfer sample
router.post('/:id/transfer', authenticate,
  [
    param('id').isUUID(),
    body('to_location').notEmpty().withMessage('Destination location is required')
  ],
  validate,
  async (req, res, next) => {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { to_location, notes } = req.body;

      const checkResult = await client.query('SELECT * FROM samples WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Sample not found' });
      }

      const from_location = checkResult.rows[0].storage_location;

      // Update sample location
      const result = await client.query(
        `UPDATE samples SET storage_location = $1 WHERE id = $2 RETURNING *`,
        [to_location, id]
      );

      // Add chain of custody entry
      await client.query(
        `INSERT INTO sample_chain_of_custody (sample_id, action, from_location, to_location, performed_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, 'transferred', from_location, to_location, req.user.id, notes || null]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Sample transferred successfully',
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

// Delete sample
router.delete('/:id', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM samples WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sample not found' });
      }

      // Don't allow deletion of samples that are in testing
      if (checkResult.rows[0].status === 'in_testing') {
        return res.status(400).json({ error: 'Cannot delete samples that are currently in testing' });
      }

      await query('DELETE FROM samples WHERE id = $1', [id]);

      res.json({ message: 'Sample deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
