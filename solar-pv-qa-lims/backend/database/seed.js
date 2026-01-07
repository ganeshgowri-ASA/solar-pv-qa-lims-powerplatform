const { pool, query } = require('./pool');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, department)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['admin@solarpvqa.com', hashedPassword, 'System', 'Administrator', 'admin', 'Administration']);

    const adminId = adminResult.rows[0].id;
    console.log('✅ Admin user created');

    // Create additional users
    const techPassword = await bcrypt.hash('tech123', 10);
    const techResult = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, department)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['technician@solarpvqa.com', techPassword, 'John', 'Smith', 'technician', 'Testing Lab']);

    const techId = techResult.rows[0].id;

    const managerPassword = await bcrypt.hash('manager123', 10);
    await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, department)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['manager@solarpvqa.com', managerPassword, 'Sarah', 'Johnson', 'lab_manager', 'Quality Assurance']);

    console.log('✅ Test users created');

    // Create lab facilities
    const internalLabResult = await query(`
      INSERT INTO lab_facilities (name, code, facility_type, address, city, country, contact_email, accreditation_number, accreditation_body, capabilities)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      'Solar PV QA Main Lab',
      'LAB-MAIN-001',
      'internal',
      '123 Solar Drive',
      'San Jose',
      'USA',
      'mainlab@solarpvqa.com',
      'NVLAP-200458-0',
      'NVLAP',
      ['IEC 61215', 'IEC 61730', 'IEC 61701', 'UL 1703']
    ]);

    const mainLabId = internalLabResult.rows[0].id;

    await query(`
      INSERT INTO lab_facilities (name, code, facility_type, address, city, country, contact_email, accreditation_number, accreditation_body, capabilities)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (code) DO NOTHING
    `, [
      'TÜV Rheinland Partner Lab',
      'LAB-TUV-001',
      'external',
      '456 Testing Avenue',
      'Cologne',
      'Germany',
      'partner@tuv.com',
      'DAkkS D-PL-12345-01-00',
      'DAkkS',
      ['IEC 61215', 'IEC 61730', 'IEC 62716', 'IEC 62804']
    ]);

    console.log('✅ Lab facilities created');

    // Create sample customer
    const customerResult = await query(`
      INSERT INTO customers (company_name, contact_name, email, phone, address, city, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      'SunPower Modules Inc.',
      'Mike Williams',
      'mike@sunpowermodules.com',
      '+1-555-0123',
      '789 Module Street',
      'Phoenix',
      'USA'
    ]);

    let customerId;
    if (customerResult.rows.length > 0) {
      customerId = customerResult.rows[0].id;
    } else {
      const existingCustomer = await query(`SELECT id FROM customers WHERE email = $1`, ['mike@sunpowermodules.com']);
      customerId = existingCustomer.rows[0].id;
    }

    await query(`
      INSERT INTO customers (company_name, contact_name, email, phone, address, city, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING
    `, [
      'GreenTech Solar',
      'Lisa Chen',
      'lisa@greentechsolar.com',
      '+1-555-0456',
      '321 Renewable Way',
      'Austin',
      'USA'
    ]);

    console.log('✅ Customers created');

    // Get test standard IDs
    const standardsResult = await query(`SELECT id, standard_code FROM test_standards`);
    const standards = {};
    standardsResult.rows.forEach(row => {
      standards[row.standard_code] = row.id;
    });

    // Create sample service request
    const srResult = await query(`
      INSERT INTO service_requests (
        customer_id, request_type, status, priority, title, description,
        manufacturer, model_number, module_type, rated_power_w,
        requested_standards, assigned_lab_id, assigned_to, created_by,
        requested_date, estimated_completion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, request_number
    `, [
      customerId,
      'external',
      'in_progress',
      'high',
      'IEC 61215 & IEC 61730 Certification - SP450M Series',
      'Full certification testing for new 450W monocrystalline module series',
      'SunPower Modules Inc.',
      'SP450M-72',
      'mono-Si',
      450.00,
      [standards['IEC 61215'], standards['IEC 61730']],
      mainLabId,
      techId,
      adminId,
      new Date(),
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    ]);

    const srId = srResult.rows[0].id;
    const srNumber = srResult.rows[0].request_number;
    console.log(`✅ Service request created: ${srNumber}`);

    // Create samples
    const sampleResult = await query(`
      INSERT INTO samples (
        service_request_id, description, sample_type, quantity,
        serial_number, batch_number, status, storage_location,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, sample_id
    `, [
      srId,
      'SP450M-72 Monocrystalline Module - Main Test Sample',
      'module',
      1,
      'SP450M-2024-001',
      'BATCH-2024-Q1-001',
      'in_testing',
      'Main Lab - Rack A1',
      adminId
    ]);

    const sampleId = sampleResult.rows[0].id;
    const sampleNumber = sampleResult.rows[0].sample_id;
    console.log(`✅ Sample created: ${sampleNumber}`);

    // Add chain of custody entry
    await query(`
      INSERT INTO sample_chain_of_custody (sample_id, action, to_location, performed_by, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [sampleId, 'received', 'Main Lab - Receiving', adminId, 'Sample received in good condition']);

    await query(`
      INSERT INTO sample_chain_of_custody (sample_id, action, from_location, to_location, performed_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [sampleId, 'transferred', 'Main Lab - Receiving', 'Main Lab - Rack A1', techId, 'Transferred to storage rack']);

    // Create test plan
    const testPlanResult = await query(`
      INSERT INTO test_plans (
        service_request_id, sample_id, test_standard_id,
        name, description, status,
        scheduled_start, scheduled_end,
        assigned_lab_id, lead_technician, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, plan_number
    `, [
      srId,
      sampleId,
      standards['IEC 61215'],
      'IEC 61215 Performance Testing',
      'Complete performance qualification testing per IEC 61215:2021',
      'in_progress',
      new Date(),
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      mainLabId,
      techId,
      adminId
    ]);

    const testPlanId = testPlanResult.rows[0].id;
    const testPlanNumber = testPlanResult.rows[0].plan_number;
    console.log(`✅ Test plan created: ${testPlanNumber}`);

    // Create test results
    const testResults = [
      { name: 'Visual Inspection', code: 'MQT 01', status: 'pass', sequence: 1 },
      { name: 'Maximum Power Determination', code: 'MQT 02', status: 'pass', sequence: 2 },
      { name: 'Insulation Test', code: 'MQT 03', status: 'pass', sequence: 3 },
      { name: 'Temperature Coefficients', code: 'MQT 04', status: 'pass', sequence: 4 },
      { name: 'Nominal Operating Cell Temperature', code: 'MQT 05', status: 'pending', sequence: 5 },
      { name: 'Performance at STC and NOCT', code: 'MQT 06', status: 'pending', sequence: 6 },
      { name: 'Performance at Low Irradiance', code: 'MQT 07', status: 'pending', sequence: 7 },
      { name: 'Outdoor Exposure Test', code: 'MQT 08', status: 'pending', sequence: 8 },
      { name: 'Hot Spot Endurance Test', code: 'MQT 09', status: 'pending', sequence: 9 },
      { name: 'UV Preconditioning', code: 'MQT 10', status: 'pending', sequence: 10 }
    ];

    for (const test of testResults) {
      await query(`
        INSERT INTO test_results (
          test_plan_id, sample_id, test_name, test_code, test_sequence,
          status, performed_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [testPlanId, sampleId, test.name, test.code, test.sequence, test.status, test.status === 'pass' ? techId : null]);
    }

    console.log('✅ Test results created');

    // Create equipment
    await query(`
      INSERT INTO equipment (equipment_id, name, manufacturer, model, serial_number, lab_facility_id, status, calibration_date, calibration_due)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (equipment_id) DO NOTHING
    `, [
      'EQ-SIM-001',
      'Class AAA Solar Simulator',
      'Spire Corporation',
      'SPI-SUN 5600SLP',
      'SN-2023-5600-001',
      mainLabId,
      'active',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
    ]);

    await query(`
      INSERT INTO equipment (equipment_id, name, manufacturer, model, serial_number, lab_facility_id, status, calibration_date, calibration_due)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (equipment_id) DO NOTHING
    `, [
      'EQ-TC-001',
      'Thermal Cycling Chamber',
      'Weiss Technik',
      'WK3-180/70',
      'SN-2022-WK3-042',
      mainLabId,
      'active',
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      new Date(Date.now() + 305 * 24 * 60 * 60 * 1000)
    ]);

    await query(`
      INSERT INTO equipment (equipment_id, name, manufacturer, model, serial_number, lab_facility_id, status, calibration_date, calibration_due)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (equipment_id) DO NOTHING
    `, [
      'EQ-DH-001',
      'Damp Heat Chamber',
      'ESPEC',
      'PL-4KPH',
      'SN-2023-PL4-015',
      mainLabId,
      'active',
      new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      new Date(Date.now() + 320 * 24 * 60 * 60 * 1000)
    ]);

    console.log('✅ Equipment created');

    // Create notifications
    await query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
    `, [adminId, 'New Service Request', `New service request ${srNumber} has been submitted`, 'info', `/service-requests/${srId}`]);

    await query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
    `, [techId, 'Test Plan Assigned', `You have been assigned as lead technician for ${testPlanNumber}`, 'info', `/test-plans/${testPlanId}`]);

    console.log('✅ Notifications created');

    console.log('');
    console.log('🎉 Database seeding complete!');
    console.log('');
    console.log('📋 Test Accounts:');
    console.log('   Admin: admin@solarpvqa.com / admin123');
    console.log('   Technician: technician@solarpvqa.com / tech123');
    console.log('   Manager: manager@solarpvqa.com / manager123');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase };
