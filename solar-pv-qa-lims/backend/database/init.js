const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  console.log('🗄️  Initializing database...');

  const client = await pool.connect();

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await client.query(schema);

    console.log('✅ Database schema created successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - lab_facilities');
    console.log('   - test_standards');
    console.log('   - customers');
    console.log('   - service_requests');
    console.log('   - samples');
    console.log('   - sample_chain_of_custody');
    console.log('   - test_plans');
    console.log('   - test_results');
    console.log('   - certifications');
    console.log('   - reports');
    console.log('   - audit_log');
    console.log('   - notifications');
    console.log('   - equipment');
    console.log('');
    console.log('📋 Views created:');
    console.log('   - v_active_service_requests');
    console.log('   - v_test_progress');
    console.log('   - v_lab_workload');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('');
      console.log('🎉 Database initialization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
