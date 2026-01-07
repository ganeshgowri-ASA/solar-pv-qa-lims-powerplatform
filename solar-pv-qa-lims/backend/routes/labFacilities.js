const express = require('express');
const { body, param } = require('express-validator');
const { query } = require('../database/pool');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Get all lab facilities
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { facility_type, is_active, search, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [];

    if (facility_type) {
      conditions.push(`facility_type = $${paramIndex}`);
      params.push(facility_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM lab_facilities ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get facilities
    params.push(limit, offset);
    const result = await query(
      `SELECT
        lf.*,
        (SELECT COUNT(*) FROM service_requests sr WHERE sr.assigned_lab_id = lf.id AND sr.status IN ('approved', 'in_progress')) AS active_requests,
        (SELECT COUNT(*) FROM test_plans tp WHERE tp.assigned_lab_id = lf.id AND tp.status = 'in_progress') AS active_tests
      FROM lab_facilities lf
      ${whereClause}
      ORDER BY lf.name
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

// Get single lab facility by ID
router.get('/:id', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT * FROM lab_facilities WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lab facility not found' });
      }

      // Get equipment in this lab
      const equipmentResult = await query(
        `SELECT id, equipment_id, name, manufacturer, model, status, calibration_due
         FROM equipment WHERE lab_facility_id = $1 ORDER BY name`,
        [id]
      );

      // Get active service requests
      const requestsResult = await query(
        `SELECT id, request_number, title, status, priority
         FROM service_requests
         WHERE assigned_lab_id = $1 AND status IN ('approved', 'in_progress')
         ORDER BY created_at DESC LIMIT 10`,
        [id]
      );

      res.json({
        ...result.rows[0],
        equipment: equipmentResult.rows,
        active_requests: requestsResult.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new lab facility
router.post('/', authenticate, authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Lab name is required'),
    body('code').trim().notEmpty().withMessage('Lab code is required'),
    body('facility_type').isIn(['internal', 'external', 'partner']).withMessage('Valid facility type is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        name, code, facility_type, address, city, state, country, postal_code,
        contact_name, contact_email, contact_phone,
        accreditation_number, accreditation_body, accreditation_expiry,
        capabilities, notes
      } = req.body;

      const result = await query(
        `INSERT INTO lab_facilities (
          name, code, facility_type, address, city, state, country, postal_code,
          contact_name, contact_email, contact_phone,
          accreditation_number, accreditation_body, accreditation_expiry,
          capabilities, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          name, code, facility_type, address || null, city || null, state || null,
          country || null, postal_code || null, contact_name || null,
          contact_email || null, contact_phone || null,
          accreditation_number || null, accreditation_body || null,
          accreditation_expiry || null, capabilities || null, notes || null
        ]
      );

      res.status(201).json({
        message: 'Lab facility created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Lab code already exists' });
      }
      next(error);
    }
  }
);

// Update lab facility
router.put('/:id', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT id FROM lab_facilities WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lab facility not found' });
      }

      const {
        name, code, facility_type, address, city, state, country, postal_code,
        contact_name, contact_email, contact_phone,
        accreditation_number, accreditation_body, accreditation_expiry,
        capabilities, equipment, is_active, notes
      } = req.body;

      const result = await query(
        `UPDATE lab_facilities SET
          name = COALESCE($1, name),
          code = COALESCE($2, code),
          facility_type = COALESCE($3, facility_type),
          address = COALESCE($4, address),
          city = COALESCE($5, city),
          state = COALESCE($6, state),
          country = COALESCE($7, country),
          postal_code = COALESCE($8, postal_code),
          contact_name = COALESCE($9, contact_name),
          contact_email = COALESCE($10, contact_email),
          contact_phone = COALESCE($11, contact_phone),
          accreditation_number = COALESCE($12, accreditation_number),
          accreditation_body = COALESCE($13, accreditation_body),
          accreditation_expiry = COALESCE($14, accreditation_expiry),
          capabilities = COALESCE($15, capabilities),
          equipment = COALESCE($16, equipment),
          is_active = COALESCE($17, is_active),
          notes = COALESCE($18, notes)
        WHERE id = $19
        RETURNING *`,
        [
          name, code, facility_type, address, city, state, country, postal_code,
          contact_name, contact_email, contact_phone,
          accreditation_number, accreditation_body, accreditation_expiry,
          capabilities, equipment, is_active, notes, id
        ]
      );

      res.json({
        message: 'Lab facility updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get lab workload
router.get('/:id/workload', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT * FROM v_lab_workload WHERE lab_id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lab facility not found' });
      }

      // Get upcoming scheduled tests
      const scheduledTests = await query(
        `SELECT tp.id, tp.plan_number, tp.name, tp.scheduled_start, tp.scheduled_end,
                ts.standard_code
         FROM test_plans tp
         LEFT JOIN test_standards ts ON tp.test_standard_id = ts.id
         WHERE tp.assigned_lab_id = $1 AND tp.status IN ('pending', 'scheduled')
         ORDER BY tp.scheduled_start
         LIMIT 10`,
        [id]
      );

      res.json({
        ...result.rows[0],
        scheduled_tests: scheduledTests.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete lab facility
router.delete('/:id', authenticate, authorize('admin'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if lab has active work
      const activeWork = await query(
        `SELECT COUNT(*) FROM service_requests WHERE assigned_lab_id = $1 AND status IN ('approved', 'in_progress')`,
        [id]
      );

      if (parseInt(activeWork.rows[0].count) > 0) {
        return res.status(400).json({ error: 'Cannot delete lab with active service requests' });
      }

      await query('DELETE FROM lab_facilities WHERE id = $1', [id]);

      res.json({ message: 'Lab facility deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
