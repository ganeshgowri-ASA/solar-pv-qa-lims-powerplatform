/**
 * Database Migration Runner
 * Executes all SQL migration files in order
 *
 * Usage: node migrations/run.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const executedSet = new Set(executedMigrations.map(m => m.filename));

    // Get all migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('📭 No migration files found.');
      return;
    }

    console.log(`📁 Found ${files.length} migration files\n`);

    let executedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`⏭️  Skipping (already executed): ${file}`);
        skippedCount++;
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`▶️  Executing: ${file}`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Completed: ${file}\n`);
        executedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed: ${file}`);
        console.error(`   Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Executed: ${executedCount}`);
    console.log(`   ⏭️  Skipped:  ${skippedCount}`);
    console.log(`   📁 Total:    ${files.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } finally {
    client.release();
    await pool.end();
  }
}

async function resetMigrations() {
  console.log('🔄 Resetting migration history...\n');

  const client = await pool.connect();

  try {
    await client.query('DROP TABLE IF EXISTS schema_migrations');
    console.log('✅ Migration history cleared.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--reset')) {
  resetMigrations()
    .then(() => {
      console.log('🎉 Migration reset complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to reset migrations:', error);
      process.exit(1);
    });
} else {
  runMigrations()
    .then(() => {
      console.log('🎉 All migrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
