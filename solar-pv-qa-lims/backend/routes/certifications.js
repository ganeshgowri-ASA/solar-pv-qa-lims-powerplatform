const express = require('express');
const { body, param } = require('express-validator');
const { query } = require('../database/pool');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const crypto = require('crypto');

const router = express.Router();

// Get all certifications with filtering and pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      status,
      certificate_type,
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
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (certificate_type) {
      conditions.push(`c.certificate_type = $${paramIndex}`);
      params.push(certificate_type);
      paramIndex++;
    }

    if (service_request_id) {
      conditions.push(`c.service_request_id = $${paramIndex}`);
      params.push(service_request_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(c.certificate_number ILIKE $${paramIndex} OR c.manufacturer ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSortColumns = ['created_at', 'certificate_number', 'issue_date', 'expiry_date', 'status'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM certifications c ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get certifications
    params.push(limit, offset);
    const result = await query(
      `SELECT
        c.*,
        sr.request_number, sr.title AS request_title,
        issuer.first_name || ' ' || issuer.last_name AS issued_by_name,
        approver.first_name || ' ' || approver.last_name AS approved_by_name
      FROM certifications c
      LEFT JOIN service_requests sr ON c.service_request_id = sr.id
      LEFT JOIN users issuer ON c.issued_by = issuer.id
      LEFT JOIN users approver ON c.approved_by = approver.id
      ${whereClause}
      ORDER BY c.${sortColumn} ${sortDirection}
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

// Get single certification by ID
router.get('/:id', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          c.*,
          sr.request_number, sr.title AS request_title, sr.model_number AS sr_model,
          issuer.first_name || ' ' || issuer.last_name AS issued_by_name,
          approver.first_name || ' ' || approver.last_name AS approved_by_name
        FROM certifications c
        LEFT JOIN service_requests sr ON c.service_request_id = sr.id
        LEFT JOIN users issuer ON c.issued_by = issuer.id
        LEFT JOIN users approver ON c.approved_by = approver.id
        WHERE c.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// Verify certification by certificate number
router.get('/verify/:certificateNumber', async (req, res, next) => {
  try {
    const { certificateNumber } = req.params;

    const result = await query(
      `SELECT
        c.certificate_number, c.certificate_type, c.status,
        c.manufacturer, c.model_numbers, c.rated_power_range,
        c.issue_date, c.expiry_date, c.standard_codes,
        c.scope_description, c.conditions, c.limitations
      FROM certifications c
      WHERE c.certificate_number = $1`,
      [certificateNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        error: 'Certificate not found'
      });
    }

    const cert = result.rows[0];
    const isValid = cert.status === 'issued' &&
                    (!cert.expiry_date || new Date(cert.expiry_date) > new Date());

    res.json({
      valid: isValid,
      certificate: {
        ...cert,
        is_expired: cert.expiry_date && new Date(cert.expiry_date) < new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new certification
router.post('/', authenticate, authorize('admin', 'lab_manager', 'quality_engineer'),
  [
    body('certificate_type').notEmpty().withMessage('Certificate type is required'),
    body('manufacturer').notEmpty().withMessage('Manufacturer is required'),
    body('standard_codes').isArray().withMessage('Standard codes are required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        service_request_id, certificate_type, standard_codes,
        manufacturer, model_numbers, rated_power_range,
        issue_date, expiry_date,
        scope_description, conditions, limitations
      } = req.body;

      const result = await query(
        `INSERT INTO certifications (
          service_request_id, certificate_type, standard_codes,
          manufacturer, model_numbers, rated_power_range,
          issue_date, expiry_date,
          scope_description, conditions, limitations,
          status, issued_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          service_request_id || null, certificate_type, standard_codes,
          manufacturer, model_numbers || null, rated_power_range || null,
          issue_date || null, expiry_date || null,
          scope_description || null, conditions || null, limitations || null,
          'draft', req.user.id
        ]
      );

      res.status(201).json({
        message: 'Certification created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update certification
router.put('/:id', authenticate, authorize('admin', 'lab_manager', 'quality_engineer'),
  [
    param('id').isUUID(),
    body('status').optional().isIn(['draft', 'issued', 'expired', 'revoked'])
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM certifications WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }

      const {
        certificate_type, standard_codes, manufacturer,
        model_numbers, rated_power_range,
        issue_date, expiry_date,
        scope_description, conditions, limitations, status
      } = req.body;

      const result = await query(
        `UPDATE certifications SET
          certificate_type = COALESCE($1, certificate_type),
          standard_codes = COALESCE($2, standard_codes),
          manufacturer = COALESCE($3, manufacturer),
          model_numbers = COALESCE($4, model_numbers),
          rated_power_range = COALESCE($5, rated_power_range),
          issue_date = COALESCE($6, issue_date),
          expiry_date = COALESCE($7, expiry_date),
          scope_description = COALESCE($8, scope_description),
          conditions = COALESCE($9, conditions),
          limitations = COALESCE($10, limitations),
          status = COALESCE($11, status)
        WHERE id = $12
        RETURNING *`,
        [
          certificate_type, standard_codes, manufacturer,
          model_numbers, rated_power_range,
          issue_date, expiry_date,
          scope_description, conditions, limitations, status, id
        ]
      );

      res.json({
        message: 'Certification updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Issue certification
router.post('/:id/issue', authenticate, authorize('admin', 'lab_manager'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM certifications WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }

      if (checkResult.rows[0].status !== 'draft') {
        return res.status(400).json({ error: 'Only draft certifications can be issued' });
      }

      // Generate document hash for verification
      const certData = JSON.stringify(checkResult.rows[0]);
      const documentHash = crypto.createHash('sha256').update(certData).digest('hex');

      const result = await query(
        `UPDATE certifications SET
          status = 'issued',
          issue_date = COALESCE(issue_date, CURRENT_DATE),
          approved_by = $1,
          document_hash = $2
        WHERE id = $3
        RETURNING *`,
        [req.user.id, documentHash, id]
      );

      res.json({
        message: 'Certification issued successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Revoke certification
router.post('/:id/revoke', authenticate, authorize('admin'),
  [
    param('id').isUUID(),
    body('reason').notEmpty().withMessage('Revocation reason is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const checkResult = await query('SELECT * FROM certifications WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }

      if (checkResult.rows[0].status !== 'issued') {
        return res.status(400).json({ error: 'Only issued certifications can be revoked' });
      }

      const result = await query(
        `UPDATE certifications SET
          status = 'revoked',
          limitations = COALESCE(limitations, '') || E'\n\nREVOKED: ' || $1
        WHERE id = $2
        RETURNING *`,
        [reason, id]
      );

      // Log audit
      await query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'REVOKE', 'certification', id, JSON.stringify({ reason })]
      );

      res.json({
        message: 'Certification revoked',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Download certificate
router.get('/:id/download', optionalAuth,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          c.*,
          sr.request_number, sr.title AS request_title,
          issuer.first_name || ' ' || issuer.last_name AS issued_by_name,
          approver.first_name || ' ' || approver.last_name AS approved_by_name
        FROM certifications c
        LEFT JOIN service_requests sr ON c.service_request_id = sr.id
        LEFT JOIN users issuer ON c.issued_by = issuer.id
        LEFT JOIN users approver ON c.approved_by = approver.id
        WHERE c.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }

      const cert = result.rows[0];

      // Generate certificate content (in production, this would generate a PDF)
      const certificateContent = {
        header: {
          certificate_number: cert.certificate_number,
          certificate_type: cert.certificate_type,
          status: cert.status
        },
        product: {
          manufacturer: cert.manufacturer,
          model_numbers: cert.model_numbers,
          rated_power_range: cert.rated_power_range
        },
        certification: {
          standards: cert.standard_codes,
          scope: cert.scope_description,
          conditions: cert.conditions,
          limitations: cert.limitations
        },
        validity: {
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          is_valid: cert.status === 'issued' && (!cert.expiry_date || new Date(cert.expiry_date) > new Date())
        },
        authorization: {
          issued_by: cert.issued_by_name,
          approved_by: cert.approved_by_name
        },
        verification: {
          document_hash: cert.document_hash,
          verification_url: `/api/certifications/verify/${cert.certificate_number}`
        }
      };

      res.json(certificateContent);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
